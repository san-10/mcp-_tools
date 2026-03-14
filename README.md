MCP tools


# 📂 Google Drive MCP — Setup Guide

This repository includes an MCP server for interacting with **Google Drive**.  
Follow this guide to configure credentials, authenticate your account, and run the server locally.

---

## 🔧 1. Set Your Credentials Directory

Choose a directory where your Google Drive credentials will be stored.

Example:

```bash
export GDRIVE_CREDS_DIR="/Applications/mcp-gdrive/creds"
```

Make sure the directory exists:

```bash
mkdir -p "$GDRIVE_CREDS_DIR"
```

---

## 🌐 2. Run Manual Authentication

This step generates the OAuth token file needed by the MCP server.

```bash
cd mcp-gdrive
node manual_auth.js
```

You will see a message like:

```
Open this URL in your browser to authorize access:
https://accounts.google.com/o/oauth2/v2/auth?...

After you allow access, copy the code from the URL and paste it here.
```

After pasting the code, you should see:

```
Tokens saved to <your-creds-dir>/.gdrive-server-credentials.json
```

---

## 🔑 3. Set Required Environment Variables

Replace `<your-client-id>` and `<your-client-secret>` with your real OAuth credentials  
(**Never commit these to GitHub**).

```bash
export CLIENT_ID="<your-client-id>"
export CLIENT_SECRET="<your-client-secret>"
export GDRIVE_CREDS_DIR="/Applications/SAP/mcp-gdrive/creds"
export GOOGLE_APPLICATION_CREDENTIALS="/Applications/SAP/mcp-gdrive/creds/.gdrive-server-credentials.json"
```

Reload your shell session:

```bash
source ~/.zshrc
```

---

## 📦 4. Install Dependencies & Build

Ensure you are running Node.js **v20+**:

```bash
node -v
```

Then install & build:

```bash
cd mcp-gdrive
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 🧩 5. MCP Client Configuration Example

Add this to your MCP config file  
(e.g., `claude_desktop_config.json`, `config.json`, or your custom MCP loader):

```json
{
  "mcpServers": {
    "gdrive": {
      "command": "npx",
      "args": ["-y", "@isaacphi/mcp-gdrive"],
      "env": {
        "CLIENT_ID": "<your-client-id>",
        "CLIENT_SECRET": "<your-client-secret>",
        "GDRIVE_CREDS_DIR": "/Applications/SAP/mcp-gdrive/creds",
        "GOOGLE_APPLICATION_CREDENTIALS": "/Applications/SAP/mcp-gdrive/creds/.gdrive-server-credentials.json"
      }
    }
  }
}
```

Make sure:

- The `creds/` folder exists  
- `.gdrive-server-credentials.json` is inside it  
- Environment variables match the actual paths

---

## 🎉 You're Ready to Use the Google Drive MCP

Once configured:

- Restart your MCP client  
- The Google Drive MCP server will load automatically  
- You can now list, search, upload, rename, and manage Drive files from within your MCP-enabled tools

---

## ⚠️ Important Security Notes

- **Never commit** your Client ID, Client Secret, OAuth token JSON, or environment variables.
- Always keep the `creds/` directory in your `.gitignore`.
- Generate new secrets immediately if you accidentally expose them.

---

## 📁 Repository Structure (Example)

```
mcp-gdrive/
  ├── creds/                     # OAuth token stored here
  ├── dist/                      # Build output
  ├── tools/                     # MCP tools (list, search, rename, etc.)
  ├── manual_auth.js             # Run this to authenticate
  ├── package.json
  ├── tsconfig.json
  ├── README.md                  # (This file)
```

---



