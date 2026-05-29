import { SESSIONS_STORAGE_KEY } from "@/lib/chat/sessions-storage";
import {
  insertSession,
  listSessions,
} from "@/lib/chat/sessions-repository";
import {
  MCP_ACTIVE_SESSIONS_KEY,
  type SessionMap,
} from "@/lib/mcp/sessions-store";
import { setLiveSessionId } from "@/lib/mcp/live-sessions-repository";
import {
  MCP_SERVERS_STORAGE_KEY,
  loadServers,
} from "@/lib/mcp/servers-storage";
import { upsertServer } from "@/lib/mcp/servers-repository";
import { getSupabaseWithUser } from "@/lib/supabase/client-auth";
import type { Session } from "@/lib/types";
import type { McpServerConfig } from "@/lib/mcp/types";

export type ImportResult = {
  imported: boolean;
  chatCount: number;
  serverCount: number;
  error?: string;
};

function loadLegacySessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Session[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadLegacySessionMap(): SessionMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MCP_ACTIVE_SESSIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const result: SessionMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string") result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

function clearLegacyStorage(): void {
  localStorage.removeItem(SESSIONS_STORAGE_KEY);
  localStorage.removeItem(MCP_SERVERS_STORAGE_KEY);
  localStorage.removeItem(MCP_ACTIVE_SESSIONS_KEY);
}

export async function importLocalStorageIfNeeded(): Promise<ImportResult> {
  let supabase;
  let user;

  try {
    ({ supabase, user } = await getSupabaseWithUser());
  } catch {
    return { imported: false, chatCount: 0, serverCount: 0 };
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("local_storage_migrated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (settings?.local_storage_migrated_at) {
    return { imported: false, chatCount: 0, serverCount: 0 };
  }

  const legacySessions = loadLegacySessions();
  const legacyServers = loadServers();
  const legacySessionMap = loadLegacySessionMap();

  const existingSessions = await listSessions().catch(() => [] as Session[]);
  const existingSessionIds = new Set(existingSessions.map((s) => s.id));

  let chatCount = 0;
  for (const session of legacySessions) {
    if (existingSessionIds.has(session.id)) continue;
    try {
      await insertSession(session);
      chatCount += 1;
    } catch {
      const fresh = { ...session, id: crypto.randomUUID() };
      await insertSession(fresh);
      chatCount += 1;
    }
  }

  let serverCount = 0;
  const importedServerIds = new Set<string>();
  for (const server of legacyServers) {
    try {
      await upsertServer(server);
      importedServerIds.add(server.id);
      serverCount += 1;
    } catch {
      const fresh: McpServerConfig = { ...server, id: crypto.randomUUID() };
      await upsertServer(fresh);
      importedServerIds.add(fresh.id);
      serverCount += 1;
    }
  }

  for (const [serverId, liveSessionId] of Object.entries(legacySessionMap)) {
    if (!importedServerIds.has(serverId)) continue;
    try {
      await setLiveSessionId(serverId, liveSessionId);
    } catch {
      // stale live sessions are ignored; user reconnects manually
    }
  }

  const { error: settingsError } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    local_storage_migrated_at: new Date().toISOString(),
  });

  if (settingsError) {
    return {
      imported: false,
      chatCount,
      serverCount,
      error: settingsError.message,
    };
  }

  clearLegacyStorage();

  return {
    imported: chatCount > 0 || serverCount > 0,
    chatCount,
    serverCount,
  };
}
