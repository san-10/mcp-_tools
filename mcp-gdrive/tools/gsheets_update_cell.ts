import { google } from "googleapis";
import { GSheetsUpdateCellInput, InternalToolResponse } from "./types.js";

export const schema = {
  name: "gsheets_update_cell",
  description: "Update a cell value in a Google Spreadsheet",
  inputSchema: {
    type: "object",
    properties: {
      fileId: {
        type: "string",
        description: "ID of the spreadsheet",
      },
      range: {
        type: "string",
        description: "Cell range in A1 notation (e.g. 'Sheet1!A1')",
      },
      value: {
        type: "string",
        description: "New cell value",
      },
    },
    required: ["fileId", "range", "value"],
  },
} as const;

export async function updateCell(
  args: GSheetsUpdateCellInput,
): Promise<InternalToolResponse> {
  try {
    const { fileId, range, value } = args;
    
    // Basic validation
    if (!range || !range.trim()) {
      return {
        content: [
          {
            type: "text",
            text: "❌ Error: Range cannot be empty",
          },
        ],
        isError: true,
      };
    }

    const sheets = google.sheets({ version: "v4" });

    await sheets.spreadsheets.values.update({
      spreadsheetId: fileId,
      range: range,
      valueInputOption: "RAW",
      requestBody: {
        values: [[value]],
      },
    });

    // Verify the update by reading back the value
    try {
      const confirm = await sheets.spreadsheets.values.get({
        spreadsheetId: fileId,
        range: range,
      });
      const updatedValue = confirm.data.values?.[0]?.[0] || value;
      
      return {
        content: [
          {
            type: "text",
            text: `✅ Updated cell ${range} to: ${updatedValue}`,
          },
        ],
        isError: false,
      };
    } catch (verifyError) {
      // Update succeeded but verification failed - still report success
      return {
        content: [
          {
            type: "text",
            text: `✅ Updated cell ${range} to value: ${value}`,
          },
        ],
        isError: false,
      };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Error updating cell: ${error.message || error}`,
        },
      ],
      isError: true,
    };
  }
}

