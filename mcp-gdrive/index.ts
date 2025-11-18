#!/usr/bin/env node
import 'dotenv/config';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { google } from "googleapis";
import fs from "fs";
import { tools } from "./tools/index.js";
import { InternalToolResponse } from "./tools/types.js";
import { getValidCredentials, setupTokenRefresh } from "./auth.js";

/* -------------------------------------------------------------------------- */
/*                                AUTH SETUP                                  */
/* -------------------------------------------------------------------------- */

async function ensureAuth() {
  // Try OAuth2 first (for user credentials) if CLIENT_ID/CLIENT_SECRET are set
  if (process.env.CLIENT_ID && process.env.CLIENT_SECRET) {
    const auth = await getValidCredentials();
    if (auth) {
      google.options({ auth });
      console.error("✅ Authenticated using OAuth2 credentials");
      // Setup automatic token refresh
      setupTokenRefresh();
      return auth;
    }
    throw new Error("❌ Failed to authenticate with OAuth2. Please run authentication flow.");
  }

  // Fallback to service account if GOOGLE_APPLICATION_CREDENTIALS is set
  // But only if it's actually a service account file (has private_key and client_email)
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath && fs.existsSync(keyPath)) {
    try {
      const keyFileContent = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
      // Check if it's a service account file (has private_key and client_email)
      if (keyFileContent.private_key && keyFileContent.client_email) {
        const auth = new google.auth.GoogleAuth({
          keyFile: keyPath,
          scopes: [
            "https://www.googleapis.com/auth/drive",
            "https://www.googleapis.com/auth/spreadsheets",
          ],
        });

        google.options({ auth });
        console.error("✅ Authenticated using service account:", keyPath);
        return auth;
      } else {
        // It's an OAuth2 token file, not a service account
        throw new Error("❌ GOOGLE_APPLICATION_CREDENTIALS points to an OAuth2 token file, not a service account. Please set CLIENT_ID and CLIENT_SECRET for OAuth2 authentication.");
      }
    } catch (error: any) {
      throw new Error(`❌ Error reading credentials file: ${error.message}`);
    }
  }

  throw new Error("❌ Missing authentication: Either set CLIENT_ID/CLIENT_SECRET for OAuth2 or GOOGLE_APPLICATION_CREDENTIALS for service account");
}

/* -------------------------------------------------------------------------- */
/*                              SERVER SETUP                                  */
/* -------------------------------------------------------------------------- */

const drive = google.drive("v3");

const server = new Server(
  {
    name: "example-servers/gdrive",
    version: "0.2.0",
  },
  {
    capabilities: {
      resources: {
        schemes: ["gdrive"], // Declare that we handle gdrive:/// URIs
        listable: true,      // Support listing available resources
        readable: true,      // Support reading resource contents
      },
      tools: {},
    },
  },
);

/* -------------------------------------------------------------------------- */
/*                             REQUEST HANDLERS                               */
/* -------------------------------------------------------------------------- */

// List files in Drive
server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
  await ensureAuth();

  const pageSize = 20;
  const params: any = {
    pageSize,
    fields: "nextPageToken, files(id, name, mimeType, parents)",
    q: "trashed = false",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  };

  if (request.params?.cursor) {
    params.pageToken = request.params.cursor;
  }

  const res = await drive.files.list(params);
  const files = res.data.files || [];

  return {
    resources: files.map((file) => ({
      uri: `gdrive:///${file.id}`,
      mimeType: file.mimeType || "application/octet-stream",
      name: file.name || "Untitled",
    })),
    nextCursor: res.data.nextPageToken,
  };
});

// Read a file's contents
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  try {
    await ensureAuth();

    const fileId = request.params.uri.replace("gdrive:///", "");
    if (!fileId || fileId.trim().length === 0) {
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "text/plain",
            text: "Error: Invalid file ID in URI",
          },
        ],
      };
    }

    const readFileTool = tools.find((t) => t.name === "gdrive_read_file");
    if (!readFileTool) {
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "text/plain",
            text: "Error: gdrive_read_file tool not found",
          },
        ],
      };
    }

    const result = await readFileTool.handler({ fileId } as any);
    const fileContents = result.content?.[0]?.text?.split("\n\n")[1] || result.content?.[0]?.text || "";

    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "text/plain",
          text: fileContents,
        },
      ],
    };
  } catch (error: any) {
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "text/plain",
          text: `Error reading file: ${error.message || error}`,
        },
      ],
    };
  }
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error(`📋 ListToolsRequestSchema called - returning ${tools.length} tools`);
  const toolList = tools.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  }));
  console.error(`📋 Tools: ${toolList.map(t => t.name).join(', ')}`);
  return {
    tools: toolList,
  };
});

/* -------------------------------------------------------------------------- */
/*                            TOOL CALL HANDLER                               */
/* -------------------------------------------------------------------------- */

function convertToolResponse(response: InternalToolResponse) {
  return {
    _meta: {},
    content: response.content,
    isError: response.isError,
  };
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  await ensureAuth();

  const tool = tools.find((t) => t.name === request.params.name);
  if (!tool) throw new Error(`Tool not found: ${request.params.name}`);

  const result = await tool.handler(request.params.arguments as any);
  return convertToolResponse(result);
});

/* -------------------------------------------------------------------------- */
/*                             SERVER STARTUP                                 */
/* -------------------------------------------------------------------------- */

async function startServer() {
  try {
    console.error("🚀 Starting server...");
    console.error(`📦 Environment check: CLIENT_ID=${!!process.env.CLIENT_ID}, CLIENT_SECRET=${!!process.env.CLIENT_SECRET}, GDRIVE_CREDS_DIR=${process.env.GDRIVE_CREDS_DIR || 'not set'}`);
    console.error(`🔧 Total tools registered: ${tools.length}`);
    
    // Don't authenticate at startup - let it happen on first tool call
    // This allows the server to connect even if credentials need to be refreshed
    
    const transport = new StdioServerTransport();
    console.error("🔌 Connecting to stdio transport...");
    await server.connect(transport);

    console.error("🌍 Server ready and connected via stdio transport.");
    console.error("✅ All systems ready - waiting for MCP requests...");
  } catch (error) {
    console.error("💥 Error starting server:", error);
    if (error instanceof Error) {
      console.error("💥 Error stack:", error.stack);
    }
    process.exit(1);
  }
}

startServer().catch(console.error);
