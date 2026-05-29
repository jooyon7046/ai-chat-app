import { callTool } from "@/lib/mcp/server/connection";
import { assertLiveSessionOwner, requireAuthUser } from "@/lib/mcp/server/auth";
import { McpProxyError } from "@/lib/mcp/server/errors";
import { mcpErrorResponse, parseJsonBody } from "@/lib/mcp/server/route-helpers";
import { getSession } from "@/lib/mcp/server/registry";

export const runtime = "nodejs";

type Body = {
  sessionId?: string;
  name?: string;
  arguments?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthUser();
    const body = await parseJsonBody<Body>(request);
    if (!body.sessionId || !body.name) {
      throw new McpProxyError("BAD_REQUEST", "sessionId와 name이 필요합니다.");
    }

    await assertLiveSessionOwner(supabase, body.sessionId);
    const session = getSession(body.sessionId);
    const result = await callTool(
      session.connection,
      body.name,
      body.arguments ?? {},
    );
    return Response.json(result);
  } catch (error) {
    return mcpErrorResponse(error);
  }
}
