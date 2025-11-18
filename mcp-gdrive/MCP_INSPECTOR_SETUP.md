# MCP Inspector Configuration Guide

## Configuration Options

You have **two options** for running the MCP server:

### Option 1: Using Published Package (npx) - May show 4 or 6 tools
- **Command**: `npx`
- **Arguments**: `-y @isaacphi/mcp-gdrive`
- **Pros**: Simple, no local build needed
- **Cons**: May have connection issues (JSON parsing errors), version depends on npm package
- **Tools**: Depends on published version (may be 4 or 6 tools)
- **Note**: If you get "Starting server is not valid JSON" error, try Option 2 or clear npm cache

### Option 2: Using Local Version - 6 Tools (Recommended)
- **Command**: `node`
- **Arguments**: `C:\Users\sn874\OneDrive\Desktop\SAP\mcp-gdrive\dist\index.js`
- **Working Directory**: `C:\Users\sn874\OneDrive\Desktop\SAP\mcp-gdrive`
- **Pros**: All 6 tools with latest features (gdrive_search, gdrive_rename_file with batch rename)
- **Cons**: Requires local build (`npm run build`)
- **Tools**: All 6 tools including new ones

**Recommendation**: Use Option 2 to see all 6 tools and latest features.

## Required Configuration (Option 2 - Local Version)

### Command
```
node
```

### Arguments
```
dist\index.js
```
OR full path:
```
C:\Users\sn874\OneDrive\Desktop\SAP\mcp-gdrive\dist\index.js
```

### Working Directory
```
C:\Users\sn874\OneDrive\Desktop\SAP\mcp-gdrive
```

### Environment Variables (MUST BE SET)
```
CLIENT_ID=38186857502-fr0ojprui92maf07lss68edhel21uqou.apps.googleusercontent.com
CLIENT_SECRET=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
GDRIVE_CREDS_DIR=C:\Users\sn874\OneDrive\Desktop\SAP\mcp-gdrive\creds
```

## Step-by-Step in MCP Inspector

1. **Open MCP Inspector**
2. **Add New Server** or **Edit Existing Server**
3. **Set Command**: `node`
4. **Set Args**: `dist\index.js` (or full path)
5. **Set Working Directory**: `C:\Users\sn874\OneDrive\Desktop\SAP\mcp-gdrive`
6. **Add Environment Variables**:
   - Key: `CLIENT_ID`, Value: `38186857502-fr0ojprui92maf07lss68edhel21uqou.apps.googleusercontent.com`
   - Key: `CLIENT_SECRET`, Value: `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`
   - Key: `GDRIVE_CREDS_DIR`, Value: `C:\Users\sn874\OneDrive\Desktop\SAP\mcp-gdrive\creds`
7. **Save and Connect**

## Expected Output

When connected, you should see in the logs:
```
🧩 Registered MCP Tools:
  - gdrive_search: Search for files in Google Drive
  - gdrive_read_file: Read contents of a file from Google Drive
  - gsheets_update_cell: Update a cell value in a Google Spreadsheet
  - gsheets_read: Read data from a Google Spreadsheet with flexible options for ranges and formatting
  - gdrive_list: Recursively list all files and subfolders inside a Google Drive folder by name or ID (works for shared drives too)
  - gdrive_rename_file: Rename one or multiple files/folders in Google Drive by their IDs. multiple files (use renames array).

🚀 Starting server...
🌍 Server ready and connected via stdio transport.
```

## Troubleshooting

### If connection fails:

#### Error: "Starting server" is not valid JSON
**This is the exact error you're seeing!** The published npm package has a bug where it outputs logs to stdout instead of stderr.

**The Fix:**
1. **Stop using `npx`** - The published package has this bug
2. **Switch to local version** (Option 2):
   - Command: `node`
   - Arguments: `C:\Users\sn874\OneDrive\Desktop\SAP\mcp-gdrive\dist\index.js`
   - Working Directory: `C:\Users\sn874\OneDrive\Desktop\SAP\mcp-gdrive`
3. **Why this works**: The local version uses `console.error()` for all logs (goes to stderr), so stdout only has JSON-RPC messages
4. **Bonus**: You'll also get the batch rename feature with `renames` array support!

**Don't use `npx`** until the published package is fixed. The local version is the only working solution right now.

#### General connection issues:
1. Check that all environment variables are set correctly
2. Verify the working directory path is correct (if using relative paths)
3. Make sure `dist/index.js` exists (if using local version)
4. Check MCP Inspector logs for error messages
5. Try disconnecting and reconnecting

### If tools don't appear:

#### Using `npx` (published package):
- You'll see **4 tools** (old version):
  - gdrive_read_file
  - gdrive_list
  - gsheets_read
  - gsheets_update_cell

#### Using local version (`node dist/index.js`):
- You'll see **6 tools** (latest version with all features):
  - gdrive_search (new)
  - gdrive_read_file
  - gdrive_list
  - gdrive_rename_file (new - with batch rename)
  - gsheets_read
  - gsheets_update_cell

**To see all 6 tools**, you must use the local version (Option 2).

### If you see "old tools":
- You're using the published npm package (`npx`)
- Switch to local version to see all 6 tools with latest features
- See "Configuration Options" section above

