import { google } from "googleapis";
import { GDriveListInput, InternalToolResponse } from "./types.js";

export const schema = {
  name: "gdrive_list",
  description:
    "Recursively list all files and subfolders inside a Google Drive folder by name or ID (works for shared drives too)",
  inputSchema: {
    type: "object",
    properties: {
      folderNameOrId: {
        type: "string",
        description:
          "Folder name or ID. The tool will auto-detect whether it's a name or an ID.",
      },
    },
    required: ["folderNameOrId"],
  },
} as const;

// Recursively list all files and subfolders
async function listFolderRecursive(
  drive: any,
  folderId: string,
  indent = "",
  depth = 0,
  maxDepth = 20,
): Promise<string> {
  let output = "";
  
  // Prevent infinite recursion
  if (depth > maxDepth) {
    return `${indent}⚠️ Maximum depth reached (${maxDepth} levels)\n`;
  }

  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, modifiedTime, size)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = res.data.files || [];
    for (const file of files) {
      const isFolder = file.mimeType === "application/vnd.google-apps.folder";
      output += `${indent}${isFolder ? "📁" : "📄"} ${file.name} — ${file.id} (${file.mimeType})\n`;

      if (isFolder) {
        // Recurse into subfolder with increased depth
        output += await listFolderRecursive(drive, file.id, indent + "   ", depth + 1, maxDepth);
      }
    }
  } catch (err: any) {
    output += `${indent} Error reading folder ${folderId}: ${err.message || err}\n`;
  }
  return output;
}

export async function listAll(
  args: GDriveListInput,
): Promise<InternalToolResponse> {
  const drive = google.drive("v3");
  const queryInput = args.folderNameOrId.trim();
  let folderId: string | null = null;
  let folderName: string | null = null;

  try {
    // Step 1: Detect if input is a folder ID
    if (/^[a-zA-Z0-9_-]{20,}$/.test(queryInput)) {
      folderId = queryInput;

      // Fetch folder metadata for display
      const folderMeta = await drive.files.get({
        fileId: folderId,
        fields: "id, name",
        supportsAllDrives: true,
      });
      folderName = folderMeta.data.name ?? folderId; // ✅ safely handle undefined
    } else {
      // Step 2: Search by folder name
      const folderRes = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${queryInput}' and trashed=false`,
        fields: "files(id, name)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const folder = folderRes.data.files?.[0];
      if (!folder || !folder.id) {
        return {
          content: [
            { type: "text", text: `❌ Folder '${queryInput}' not found.` },
          ],
          isError: true,
        };
      }

      folderId = folder.id ?? null;
      folderName = folder.name ?? folderId;
    }

    if (!folderId) {
      throw new Error("Folder ID could not be resolved.");
    }

    // Step 3: Recursively list all files and subfolders
    const header = `📁 Folder '${folderName}' (ID: ${folderId})\n\n`;
    const fileTree = await listFolderRecursive(drive, folderId, "", 0, 20);

    const responseText =
      fileTree.trim().length > 0
        ? header + fileTree
        : `${header}⚠️ Folder is empty.`;

    return {
      content: [{ type: "text", text: responseText }],
      isError: false,
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Error listing all contents: ${error.message || error}`,
        },
      ],
      isError: true,
    };
  }
}

