import { readResource } from "@/lib/mcp/server/connection";
import { assertLiveSessionOwner, requireAuthUser } from "@/lib/mcp/server/auth";
import { McpProxyError } from "@/lib/mcp/server/errors";
import { mcpErrorResponse, parseJsonBody } from "@/lib/mcp/server/route-helpers";
import { getSession } from "@/lib/mcp/server/registry";

export const runtime = "nodejs";

type Body = {
  sessionId?: string;
  uri?: string;
};

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthUser();
    const body = await parseJsonBody<Body>(request);
    if (!body.sessionId || !body.uri) {
      throw new McpProxyError("BAD_REQUEST", "sessionId와 uri가 필요합니다.");
    }

    await assertLiveSessionOwner(supabase, body.sessionId);
    const session = getSession(body.sessionId);
    const result = await readResource(session.connection, body.uri);
    return Response.json(result);
  } catch (error) {
    return mcpErrorResponse(error);
  }
}
