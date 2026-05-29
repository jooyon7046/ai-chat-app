import type { LiveConnection } from "@/lib/mcp/server/connection";
import { McpProxyError } from "@/lib/mcp/server/errors";
import type { McpCapabilities, McpServerConfig } from "@/lib/mcp/types";

const IDLE_TTL_MS = 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;

type SessionEntry = {
  connection: LiveConnection;
  config: McpServerConfig;
  capabilities: McpCapabilities;
  createdAt: number;
  lastUsed: number;
};

type RegistryStore = {
  sessions: Map<string, SessionEntry>;
  sweepTimer?: ReturnType<typeof setInterval>;
};

const globalRef = globalThis as typeof globalThis & {
  __mcpRegistry?: RegistryStore;
};

function getStore(): RegistryStore {
  if (!globalRef.__mcpRegistry) {
    globalRef.__mcpRegistry = { sessions: new Map() };
  }
  const store = globalRef.__mcpRegistry;

  if (!store.sweepTimer) {
    store.sweepTimer = setInterval(() => {
      const now = Date.now();
      for (const [id, entry] of store.sessions) {
        if (now - entry.lastUsed > IDLE_TTL_MS) {
          void closeEntry(entry);
          store.sessions.delete(id);
        }
      }
    }, SWEEP_INTERVAL_MS);
    // Do not keep the Node process alive solely for the sweep timer.
    store.sweepTimer.unref?.();
  }

  return store;
}

async function closeEntry(entry: SessionEntry): Promise<void> {
  try {
    await entry.connection.client.close();
  } catch {
    // ignore close errors
  }
}

export function createSession(
  connection: LiveConnection,
  config: McpServerConfig,
  capabilities: McpCapabilities,
): string {
  const store = getStore();
  const sessionId = crypto.randomUUID();
  const now = Date.now();
  store.sessions.set(sessionId, {
    connection,
    config,
    capabilities,
    createdAt: now,
    lastUsed: now,
  });
  return sessionId;
}

export function getSession(sessionId: string): SessionEntry {
  const store = getStore();
  const entry = store.sessions.get(sessionId);
  if (!entry) {
    throw new McpProxyError(
      "SESSION_NOT_FOUND",
      "세션을 찾을 수 없습니다. 서버에 다시 연결해 주세요.",
    );
  }
  entry.lastUsed = Date.now();
  return entry;
}

export function peekSession(sessionId: string): SessionEntry | undefined {
  const store = getStore();
  const entry = store.sessions.get(sessionId);
  if (!entry) return undefined;
  entry.lastUsed = Date.now();
  return entry;
}

export function listSessions(): Array<[string, SessionEntry]> {
  const store = getStore();
  return [...store.sessions.entries()];
}

export async function deleteSession(sessionId: string): Promise<void> {
  const store = getStore();
  const entry = store.sessions.get(sessionId);
  if (!entry) return;
  store.sessions.delete(sessionId);
  await closeEntry(entry);
}
