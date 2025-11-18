import { schema as gdriveSearchSchema, search } from './gdrive_search.js';
import { schema as gdriveReadFileSchema, readFile } from './gdrive_read_file.js';
import { schema as gsheetsUpdateCellSchema, updateCell } from './gsheets_update_cell.js';
import { schema as gsheetsReadSchema, readSheet } from './gsheets_read.js';
import { schema as gdriveListSchema, listAll } from './gdrive_list.js';
import { schema as gdriveRenameSchema, rename } from './gdrive_rename_file.js';

import {
  Tool,
  GDriveSearchInput,
  GDriveReadFileInput,
  GSheetsUpdateCellInput,
  GSheetsReadInput,
  GDriveListInput,
  GDriveRenameInput,
} from './types.js';

/**
 * Export all MCP tools
 */
export const tools: [
  Tool<GDriveSearchInput>,
  Tool<GDriveReadFileInput>,
  Tool<GSheetsUpdateCellInput>,
  Tool<GSheetsReadInput>,
  Tool<GDriveListInput>,
  Tool<GDriveRenameInput>
] = [
  {
    ...gdriveSearchSchema,
    handler: search,
  },
  {
    ...gdriveReadFileSchema,
    handler: readFile,
  },
  {
    ...gsheetsUpdateCellSchema,
    handler: updateCell,
  },
  {
    ...gsheetsReadSchema,
    handler: readSheet,
  },
  {
    ...gdriveListSchema,
    handler: listAll,
  },
  {
    ...gdriveRenameSchema,
    handler: rename,
  },
];

/**
 * Optional helper to log registered tools when server starts.
 * Using console.error to ensure logs go to stderr, not stdout (which is for JSON-RPC only)
 */
console.error('\n🧩 Registered MCP Tools:');
for (const tool of tools) {
  console.error(`  - ${tool.name}: ${tool.description}`);
}
console.error('');
