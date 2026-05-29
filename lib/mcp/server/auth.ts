import type { SupabaseClient } from "@supabase/supabase-js";
import { McpProxyError } from "@/lib/mcp/server/errors";
import { rowToMcpServerConfig } from "@/lib/mcp/server-mapper";
import type { Database } from "@/lib/supabase/database.types";
import { getUser } from "@/lib/supabase/server";

type AppSupabase = SupabaseClient<Database>;

export async function requireAuthUser() {
  const result = await getUser();
  if (!result) {
    throw new McpProxyError(
      "UNAUTHORIZED",
      "익명 인증에 실패했습니다. Supabase에서 Anonymous sign-ins를 활성화했는지 확인해 주세요.",
    );
  }
  return result;
}

export async function loadMcpServer(supabase: AppSupabase, serverId: string) {
  const { data, error } = await supabase
    .from("mcp_servers")
    .select("*")
    .eq("id", serverId)
    .maybeSingle();

  if (error || !data) {
    throw new McpProxyError(
      "NOT_FOUND",
      "MCP 서버 설정을 찾을 수 없습니다.",
    );
  }

  return rowToMcpServerConfig(data);
}

export async function assertLiveSessionOwner(
  supabase: AppSupabase,
  liveSessionId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("mcp_live_sessions")
    .select("id")
    .eq("live_session_id", liveSessionId)
    .maybeSingle();

  if (error || !data) {
    throw new McpProxyError(
      "FORBIDDEN",
      "이 MCP 세션에 접근할 수 없습니다.",
    );
  }
}

export async function assertLiveSessionOwners(
  supabase: AppSupabase,
  liveSessionIds: string[],
): Promise<void> {
  if (liveSessionIds.length === 0) {
    return;
  }

  const { data, error } = await supabase
    .from("mcp_live_sessions")
    .select("live_session_id")
    .in("live_session_id", liveSessionIds);

  if (error) {
    throw new McpProxyError("UPSTREAM_ERROR", error.message);
  }

  const owned = new Set((data ?? []).map((row) => row.live_session_id));
  const missing = liveSessionIds.filter((id) => !owned.has(id));

  if (missing.length > 0) {
    throw new McpProxyError(
      "FORBIDDEN",
      "연결되지 않았거나 권한이 없는 MCP 세션이 포함되어 있습니다.",
    );
  }
}

export async function upsertLiveSession(
  supabase: AppSupabase,
  userId: string,
  serverId: string,
  liveSessionId: string,
): Promise<void> {
  const { error } = await supabase.from("mcp_live_sessions").upsert(
    {
      user_id: userId,
      server_id: serverId,
      live_session_id: liveSessionId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "server_id" },
  );

  if (error) {
    throw new McpProxyError("UPSTREAM_ERROR", error.message);
  }
}

export async function removeLiveSessionByLiveId(
  supabase: AppSupabase,
  liveSessionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("mcp_live_sessions")
    .delete()
    .eq("live_session_id", liveSessionId);

  if (error) {
    throw new McpProxyError("UPSTREAM_ERROR", error.message);
  }
}
