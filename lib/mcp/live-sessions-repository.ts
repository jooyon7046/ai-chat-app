import { getSupabaseWithUser } from "@/lib/supabase/client-auth";
import type { SessionMap } from "@/lib/mcp/sessions-store";

export async function listLiveSessionMap(): Promise<SessionMap> {
  const { supabase } = await getSupabaseWithUser();
  const { data, error } = await supabase
    .from("mcp_live_sessions")
    .select("server_id, live_session_id");

  if (error) {
    throw new Error(error.message);
  }

  const map: SessionMap = {};
  for (const row of data ?? []) {
    map[row.server_id] = row.live_session_id;
  }
  return map;
}

export async function setLiveSessionId(
  serverId: string,
  liveSessionId: string,
): Promise<void> {
  const { supabase, user } = await getSupabaseWithUser();

  const { error } = await supabase.from("mcp_live_sessions").upsert(
    {
      user_id: user.id,
      server_id: serverId,
      live_session_id: liveSessionId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "server_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeLiveSessionId(serverId: string): Promise<void> {
  const { supabase } = await getSupabaseWithUser();
  const { error } = await supabase
    .from("mcp_live_sessions")
    .delete()
    .eq("server_id", serverId);

  if (error) {
    throw new Error(error.message);
  }
}
