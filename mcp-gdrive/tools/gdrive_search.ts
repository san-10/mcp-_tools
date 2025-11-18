import { google } from "googleapis";
import { GDriveSearchInput, InternalToolResponse } from "./types.js";

export const schema = {
  name: "gdrive_search",
  description: "Search for files in Google Drive",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      pageToken: { type: "string", description: "Next page token" },
      pageSize: { type: "number", description: "Results per page (max 100)" },
    },
    required: ["query"],
  },
} as const;

export async function search(
  args: GDriveSearchInput,
): Promise<InternalToolResponse> {
  try {
    const drive = google.drive("v3");
    const userQuery = args.query.trim();
    let searchQuery = "";

    if (userQuery.match(/( in parents|=|mimeType )/)) {
      searchQuery = userQuery;
    } else if (!userQuery) {
      searchQuery = "trashed = false";
    } else {
      const escapedQuery = userQuery.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      const conditions = [`name contains '${escapedQuery}'`];
      if (userQuery.toLowerCase().includes("sheet")) {
        conditions.push("mimeType = 'application/vnd.google-sheets.spreadsheet'");
      }
      searchQuery = `(${conditions.join(" or ")}) and trashed = false`;
    }

    // Validate and limit pageSize
    const pageSize = Math.min(Math.max(1, args.pageSize || 10), 100);

    const res = await drive.files.list({
      q: searchQuery,
      pageSize,
      pageToken: args.pageToken,
      orderBy: "modifiedTime desc",
      fields: "nextPageToken, files(id, name, mimeType, modifiedTime, size, parents, owners)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const fileList = res.data.files
      ?.map((file: any) => `${file.id} ${file.name} (${file.mimeType})`)
      .join("\n");

    let response = `Found ${res.data.files?.length ?? 0} files:\n${fileList ?? ""}`;

    if (res.data.nextPageToken) {
      response += `\n\nMore results available. Use pageToken: ${res.data.nextPageToken}`;
    }

    return {
      content: [{ type: "text", text: response }],
      isError: false,
    };
  } catch (error: any) {
    return {
      content: [{
        type: "text",
        text: `Error searching Google Drive: ${error.message || error}`,
      }],
      isError: true,
    };
  }
}
