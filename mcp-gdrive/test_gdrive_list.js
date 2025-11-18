import { MCPClient } from "mcp-use";

const config = {
  mcpServers: {
    gdrive: {
      command: "npx",
      args: ["-y", "@isaacphi/mcp-gdrive"],
      env: {
        CLIENT_ID: "38186857502-fr0ojprui92maf07lss68edhel21uqou.apps.googleusercontent.com",
        CLIENT_SECRET: "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",
        GDRIVE_CREDS_DIR: "C:\\Users\\sn874\\OneDrive\\Desktop\\SAP\\mcp-gdrive\\creds",
      },
    },
  },
};

async function main() {
  console.log("⏳ Starting MCP client (legacy 1.2.x API)...");
  const client = new MCPClient(config);

  await client.startServers();   // ✅ start the MCP servers manually
  console.log("✅ Connected to gdrive MCP server");

  const servers = await client.listServers();
  console.log("Available servers:", servers);

  for (const srv of servers) {
    console.log(`\n🔧 Tools for server '${srv}':`);
    const tools = await client.listTools(srv);
    console.log(tools.map(t => t.name));

    if (tools.some(t => t.name === "list_files")) {
      console.log("📂 Listing files...");
      const result = await client.callTool(srv, "list_files", {});
      console.log("Result:", result);
    }
  }

  await client.stopServers();    // ✅ stop the MCP servers
  console.log("🟢 Done!");
}

main().catch(console.error);
