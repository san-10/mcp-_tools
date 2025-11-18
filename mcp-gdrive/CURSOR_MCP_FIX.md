# Fix: Missing Tools in Cursor/Eigent AI

## Problem
Only 4 tools appear in Cursor/Eigent AI instead of all 6 tools:
- ✅ gdrive_search
- ✅ gdrive_read_file  
- ✅ gsheets_update_cell
- ✅ gsheets_read
- ❌ gdrive_list (missing)
- ❌ gdrive_rename_file (missing)

## Root Cause
Cursor/Eigent AI is using the **published npm package** (`npx -y @isaacphi/mcp-gdrive`) which is an older version with only 4 tools. Your local build has all 6 tools.

## Solution: Use Local Build

You need to update your Cursor MCP configuration to use the **local build** instead of the npm package.

### Step 1: Find Your Cursor MCP Configuration

The MCP configuration is typically in one of these locations:
- `~/Library/Application Support/Cursor/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`
- Or in Cursor's settings under "MCP Servers"

### Step 2: Update the Configuration

Change from:
```json
{
  "mcpServers": {
    "gdrive": {
      "command": "npx",
      "args": ["-y", "@isaacphi/mcp-gdrive"],
      "env": {
        "CLIENT_ID": "...",
        "CLIENT_SECRET": "...",
        "GDRIVE_CREDS_DIR": "..."
      }
    }
  }
}
```

To (using local build):
```json
{
  "mcpServers": {
    "gdrive": {
      "command": "node",
      "args": ["/Applications/SAP/mcp-gdrive/dist/index.js"],
      "env": {
        "CLIENT_ID": "38186857502-fr0ojprui92maf07lss68edhel21uqou.apps.googleusercontent.com",
        "CLIENT_SECRET": "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",
        "GDRIVE_CREDS_DIR": "/Applications/SAP/mcp-gdrive/creds"
      }
    }
  }
}
```

### Step 3: Ensure Local Build is Up to Date

```bash
cd /Applications/SAP/mcp-gdrive
npm run build
```

### Step 4: Restart Cursor

1. **Completely quit Cursor** (Cmd+Q, not just close window)
2. **Restart Cursor**
3. The MCP server should reconnect and show all 6 tools

### Step 5: Verify

After restarting, check the MCP server logs. You should see:
```
🧩 Registered MCP Tools:
  - gdrive_search: Search for files in Google Drive
  - gdrive_read_file: Read contents of a file from Google Drive
  - gsheets_update_cell: Update a cell value in a Google Spreadsheet
  - gsheets_read: Read data from a Google Spreadsheet...
  - gdrive_list: Recursively list all files and subfolders...
  - gdrive_rename_file: Rename one or multiple files/folders...

🔧 Total tools registered: 6
```

## Alternative: MCP Inspector Configuration

If using MCP Inspector, update the configuration:

1. **Command**: `node`
2. **Arguments**: `/Applications/SAP/mcp-gdrive/dist/index.js`
3. **Working Directory**: `/Applications/SAP/mcp-gdrive` (optional, if using relative paths)
4. **Environment Variables**:
   - `CLIENT_ID`: `38186857502-fr0ojprui92maf07lss68edhel21uqou.apps.googleusercontent.com`
   - `CLIENT_SECRET`: `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`
   - `GDRIVE_CREDS_DIR`: `/Applications/SAP/mcp-gdrive/creds`

## Why This Happens

- **Published npm package** (`@isaacphi/mcp-gdrive`): Version 0.2.0 may have been published before the last 2 tools were added
- **Local build**: Has all 6 tools because you have the latest source code
- **Caching**: Cursor may cache the tool list from the initial connection, so you need to restart after changing config

## Troubleshooting

### If tools still don't appear:

1. **Check the build**: Ensure `dist/index.js` exists and is recent
   ```bash
   ls -la /Applications/SAP/mcp-gdrive/dist/index.js
   ```

2. **Check server logs**: Look for the "Total tools registered: 6" message

3. **Clear Cursor cache**: 
   - Quit Cursor completely
   - Delete `~/Library/Application Support/Cursor/Cache` (optional, if needed)
   - Restart Cursor

4. **Verify environment variables**: Make sure all 3 env vars are set correctly

5. **Test locally first**: Run `node ./dist/index.js` in terminal to confirm all 6 tools are registered

### If server connects then disconnects (MCP Inspector "Not connected" error):

This error usually means:
1. **Server process exited**: The server might be crashing. Check:
   - Environment variables are set correctly
   - Credentials file exists and is valid
   - Node.js version is compatible (v20+)

2. **MCP Inspector transport mismatch**: 
   - MCP Inspector might be trying to use SSE transport
   - Your server uses stdio transport (which is correct)
   - Try disconnecting and reconnecting in MCP Inspector

3. **Path issues**: 
   - Ensure the path to `dist/index.js` is absolute: `/Applications/SAP/mcp-gdrive/dist/index.js`
   - Or use relative path with correct working directory

4. **Quick fix**:
   ```bash
   # Test server manually first
   cd /Applications/SAP/mcp-gdrive
   CLIENT_ID=your_id CLIENT_SECRET=your_secret GDRIVE_CREDS_DIR=/Applications/SAP/mcp-gdrive/creds node dist/index.js
   ```
   If this works, the issue is with MCP Inspector configuration, not the server.

5. **Rebuild if needed**:
   ```bash
   cd /Applications/SAP/mcp-gdrive
   npm run build
   ```

6. **Check MCP Inspector configuration**:
   - Command: `node` (not `npx`)
   - Args: `/Applications/SAP/mcp-gdrive/dist/index.js` (absolute path)
   - Working Directory: `/Applications/SAP/mcp-gdrive` (optional but recommended)
   - Environment Variables: All 3 must be set

