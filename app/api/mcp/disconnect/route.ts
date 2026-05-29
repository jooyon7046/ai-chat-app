import {
  assertLiveSessionOwner,
  requireAuthUser,
  removeLiveSessionByLiveId,
} from "@/lib/mcp/server/auth";
import { mcpErrorResponse, parseJsonBody } from "@/lib/mcp/server/route-helpers";
import { deleteSession } from "@/lib/mcp/server/registry";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthUser();
    const { sessionId } = await parseJsonBody<{ sessionId?: string }>(request);

    if (sessionId) {
      await assertLiveSessionOwner(supabase, user.id, sessionId);
      await deleteSession(sessionId);
      await removeLiveSessionByLiveId(supabase, user.id, sessionId);
    }

    return Response.json({ ok: true });
  } catch (error) {
    return mcpErrorResponse(error);
  }
}
