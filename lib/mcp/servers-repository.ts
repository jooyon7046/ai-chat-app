import { getSupabaseWithUser } from "@/lib/supabase/client-auth";
import { rowToMcpServerConfig, serverToInsert } from "@/lib/mcp/server-mapper";
import type { McpServerConfig } from "@/lib/mcp/types";

export async function listServers(): Promise<McpServerConfig[]> {
  const { supabase } = await getSupabaseWithUser();
  const { data, error } = await supabase
    .from("mcp_servers")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToMcpServerConfig);
}

export async function upsertServer(server: McpServerConfig): Promise<void> {
  const { supabase, user } = await getSupabaseWithUser();

  const { error } = await supabase
    .from("mcp_servers")
    .upsert(serverToInsert(server, user.id));

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteServerRecord(id: string): Promise<void> {
  const { supabase } = await getSupabaseWithUser();
  const { error } = await supabase.from("mcp_servers").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
