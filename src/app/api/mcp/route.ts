import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerTools } from "@/lib/mcp/tools";

const handler = createMcpHandler(
  (server) => {
    registerTools(server);
  },
  {
    serverInfo: { name: "brandhub-mcp", version: "0.1.0" },
  },
);

// Shared-secret bearer auth — AI clients must send `Authorization: Bearer <MCP_SERVER_SECRET>`.
// Swap for withMcpAuth's OAuth flow later if brands need per-client scoped tokens.
const authedHandler = withMcpAuth(handler, (_req, bearerToken) => {
  if (!bearerToken || bearerToken !== process.env.MCP_SERVER_SECRET) return undefined;
  return { token: bearerToken, clientId: "brandhub-client", scopes: [] };
});

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };
