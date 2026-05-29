import { connectClient } from "@/lib/mcp/server/connection";
import { McpProxyError } from "@/lib/mcp/server/errors";
import {
  loadOwnedMcpServer,
  requireAuthUser,
  upsertLiveSession,
} from "@/lib/mcp/server/auth";
import { mcpErrorResponse, parseJsonBody } from "@/lib/mcp/server/route-helpers";
import { createSession } from "@/lib/mcp/server/registry";

export const runtime = "nodejs";

type ConnectBody = {
  serverId?: string;
};

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthUser();
    const body = await parseJsonBody<ConnectBody>(request);

    if (!body.serverId) {
      throw new McpProxyError("BAD_REQUEST", "serverId가 필요합니다.");
    }

    const config = await loadOwnedMcpServer(supabase, user.id, body.serverId);
    const { connection, capabilities } = await connectClient(config);
    const sessionId = createSession(connection, config, capabilities);

    await upsertLiveSession(supabase, user.id, body.serverId, sessionId);

    return Response.json({ sessionId, capabilities });
  } catch (error) {
    return mcpErrorResponse(error);
  }
}
