import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerTools } from "@/lib/mcp/tools";
import { resolveBrandBySlug, BrandResolutionError } from "@/lib/mcp/resolve-brand";

export const runtime = "nodejs";
// Data-fetch tool calls shouldn't hit the platform's default 10s cap.
export const maxDuration = 60;

async function handleRequest(request: Request, { params }: { params: Promise<{ brand: string }> }) {
  const { brand: slug } = await params;

  let brand: { id: string; name: string };
  try {
    brand = await resolveBrandBySlug(slug);
  } catch (err) {
    if (err instanceof BrandResolutionError) {
      return Response.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }

  const handler = createMcpHandler(
    (server) => {
      registerTools(server, brand.id);
    },
    { serverInfo: { name: `brandhub-mcp-${slug}`, version: "0.1.0" } },
  );

  // Shared-secret bearer auth — AI clients must send `Authorization: Bearer <MCP_SERVER_SECRET>`.
  const authedHandler = withMcpAuth(handler, (_req, bearerToken) => {
    if (!bearerToken || bearerToken !== process.env.MCP_SERVER_SECRET) return undefined;
    return { token: bearerToken, clientId: brand.id, scopes: [] };
  });

  return authedHandler(request);
}

export { handleRequest as GET, handleRequest as POST, handleRequest as DELETE };
