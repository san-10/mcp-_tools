import { google } from "googleapis";
import { GDriveRenameInput, InternalToolResponse } from "./types.js";

export const schema = {
  name: "gdrive_rename_file",
  description: "Rename one or multiple files/folders in Google Drive. Supports single rename (fileId + newName) or batch rename (renames array with fileId/fileName/folderName + newName). Can rename multiple files at once using the renames array.",
  inputSchema: {
    type: "object",
    properties: {
      fileId: {
        type: "string",
        description: "The ID of a single file or folder to rename (for single file rename)",
      },
      newName: {
        type: "string",
        description: "The new name to assign to the file or folder (for single file rename)",
      },
      renames: {
        type: "array",
        description: "Array of rename operations for batch renaming. Each item should have either fileId, fileName, or folderName (to identify the file), and newName (the new name).",
        items: {
          type: "object",
          properties: {
            fileId: {
              type: "string",
              description: "The ID of the file or folder to rename (use this if you know the ID)",
            },
            fileName: {
              type: "string",
              description: "The current name of the file to rename (will search for exact match)",
            },
            folderName: {
              type: "string",
              description: "The current name of the folder to rename (will search for exact match)",
            },
            newName: {
              type: "string",
              description: "The new name to assign to the file or folder",
            },
          },
          required: ["newName"],
        },
      },
    },
    required: [], // No required fields since we support both single and batch modes
  },
} as const;

// Helper function to find file/folder by name
async function findFileByName(
  drive: any,
  name: string,
  isFolder: boolean = false,
): Promise<string | null> {
  try {
    const mimeType = isFolder
      ? "mimeType='application/vnd.google-apps.folder'"
      : "mimeType!='application/vnd.google-apps.folder'";
    
    const query = `name='${name.replace(/'/g, "\\'")}' and ${mimeType} and trashed=false`;
    
    const res = await drive.files.list({
      q: query,
      fields: "files(id, name)",
      pageSize: 1,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = res.data.files || [];
    if (files.length > 0) {
      return files[0].id!;
    }
    return null;
  } catch (error: any) {
    console.error(`Error finding file by name "${name}":`, error);
    return null;
  }
}

// Helper function to resolve fileId from fileId, fileName, or folderName
async function resolveFileId(
  drive: any,
  item: any,
): Promise<{ fileId: string | null; error?: string }> {
  // If fileId is provided, use it directly
  if (item.fileId || item.id) {
    return { fileId: item.fileId || item.id };
  }

  // If fileName is provided, search for the file
  if (item.fileName || item.file) {
    const name = item.fileName || item.file;
    const fileId = await findFileByName(drive, name, false);
    if (fileId) {
      return { fileId };
    }
    return {
      fileId: null,
      error: `File not found: "${name}"`,
    };
  }

  // If folderName is provided, search for the folder
  if (item.folderName || item.folder) {
    const name = item.folderName || item.folder;
    const fileId = await findFileByName(drive, name, true);
    if (fileId) {
      return { fileId };
    }
    return {
      fileId: null,
      error: `Folder not found: "${name}"`,
    };
  }

  return {
    fileId: null,
    error: "Missing identifier: provide fileId, fileName, or folderName",
  };
}

async function renameSingleFile(
  drive: any,
  fileId: string,
  newName: string,
): Promise<{ success: boolean; message: string; file?: any; oldName?: string }> {
  try {
    // Step 1: Fetch current metadata for logging
    const fileMeta = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, modifiedTime",
      supportsAllDrives: true,
    });

    const oldName = fileMeta.data.name;

    // Step 2: Rename the file/folder
    const res = await drive.files.update({
      fileId,
      requestBody: { name: newName },
      fields: "id, name, mimeType, modifiedTime, webViewLink, parents",
      supportsAllDrives: true,
    });

    return {
      success: true,
      message: `✅ Renamed: "${oldName}" → "${res.data.name}"`,
      file: res.data,
      oldName,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `❌ Failed to rename file ${fileId}: ${error.message || error}`,
    };
  }
}

// Validate file name
function validateFileName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "File name cannot be empty" };
  }
  if (name.length > 255) {
    return { valid: false, error: "File name too long (max 255 characters)" };
  }
  // Google Drive doesn't allow certain characters
  if (/[\/\\<>:"|?*\x00-\x1f]/.test(name)) {
    return { valid: false, error: "File name contains invalid characters" };
  }
  return { valid: true };
}

export async function rename(
  args: GDriveRenameInput,
): Promise<InternalToolResponse> {
  try {
    const drive = google.drive("v3");

    // Check if batch rename mode (renames array) or single rename mode
    // Handle both direct renames array and nested structure
    const renamesArray = args.renames || (args as any)?.renames;
    
    if (renamesArray && Array.isArray(renamesArray) && renamesArray.length > 0) {
      // Batch rename mode
      const results = await Promise.all(
        renamesArray.map(async (item: any) => {
          const newName = item.newName || item.name;
          if (!newName) {
            return {
              success: false,
              message: `❌ Invalid rename item: missing newName`,
            };
          }

          // Validate file name
          const validation = validateFileName(newName);
          if (!validation.valid) {
            return {
              success: false,
              message: `❌ Invalid file name: ${validation.error}`,
            };
          }

          // Resolve fileId from fileId, fileName, or folderName
          const { fileId, error } = await resolveFileId(drive, item);
          if (!fileId) {
            return {
              success: false,
              message: error || `❌ Could not find file/folder to rename`,
            };
          }

          return renameSingleFile(drive, fileId, newName);
        }),
      );

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      const responseLines = [
        `📝 Batch Rename Results:`,
        `✅ Successful: ${successful.length}/${results.length}`,
        ...successful.map((r) => `  ${r.message}`),
      ];

      if (failed.length > 0) {
        responseLines.push(`\n❌ Failed: ${failed.length}/${results.length}`);
        responseLines.push(...failed.map((r) => `  ${r.message}`));
      }

      return {
        content: [{ type: "text", text: responseLines.join("\n") }],
        isError: failed.length === results.length, // Error only if all failed
      };
    } else if (args.fileId && args.newName) {
      // Validate file name
      const validation = validateFileName(args.newName);
      if (!validation.valid) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Invalid file name: ${validation.error}`,
            },
          ],
          isError: true,
        };
      }

      // Single rename mode (backward compatible)
      const result = await renameSingleFile(drive, args.fileId, args.newName);

      if (result.success && result.file) {
        const responseText = [
          `✅ Renamed successfully!`,
          `📄 ID: ${result.file.id}`,
          `📝 Old Name: ${result.oldName}`,
          `📝 New Name: ${result.file.name}`,
          `📦 Type: ${result.file.mimeType}`,
          `🕒 Modified: ${result.file.modifiedTime}`,
          result.file.webViewLink ? `🔗 URL: ${result.file.webViewLink}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        return {
          content: [{ type: "text", text: responseText }],
          isError: false,
        };
      } else {
        return {
          content: [{ type: "text", text: result.message }],
          isError: true,
        };
      }
    } else {
      return {
        content: [
          {
            type: "text",
            text: "❌ Error: Either provide 'fileId' and 'newName' for single rename, or 'renames' array for batch rename.",
          },
        ],
        isError: true,
      };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error renaming file: ${error.message || error}`,
        },
      ],
      isError: true,
    };
  }
}
