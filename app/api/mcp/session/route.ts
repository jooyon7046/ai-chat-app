import { assertLiveSessionOwner, requireAuthUser } from "@/lib/mcp/server/auth";
import { mcpErrorResponse, parseJsonBody } from "@/lib/mcp/server/route-helpers";
import { peekSession } from "@/lib/mcp/server/registry";

export const runtime = "nodejs";

type Body = {
  sessionId?: string;
};

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthUser();
    const { sessionId } = await parseJsonBody<Body>(request);

    if (!sessionId) {
      return Response.json({ alive: false });
    }

    await assertLiveSessionOwner(supabase, user.id, sessionId);

    const entry = peekSession(sessionId);
    if (!entry) {
      return Response.json({ alive: false });
    }

    return Response.json({ alive: true, capabilities: entry.capabilities });
  } catch (error) {
    return mcpErrorResponse(error);
  }
}
