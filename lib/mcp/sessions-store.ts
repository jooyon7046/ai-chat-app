export const MCP_ACTIVE_SESSIONS_KEY = "mcp-active-sessions";

export type SessionMap = Record<string, string>;

export function loadSessionMap(): SessionMap {
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

function saveSessionMap(map: SessionMap): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MCP_ACTIVE_SESSIONS_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode errors
  }
}

export function setSessionId(serverId: string, sessionId: string): void {
  const map = loadSessionMap();
  map[serverId] = sessionId;
  saveSessionMap(map);
}

export function removeSessionId(serverId: string): void {
  const map = loadSessionMap();
  if (serverId in map) {
    delete map[serverId];
    saveSessionMap(map);
  }
}
