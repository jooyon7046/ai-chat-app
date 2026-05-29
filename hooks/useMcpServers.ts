"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  callTool,
  connectServer,
  disconnectServer,
  getPrompt,
  getSessionStatus,
  McpApiError,
  readResource,
} from "@/lib/mcp/client-api";
import {
  listLiveSessionMap,
  removeLiveSessionId,
} from "@/lib/mcp/live-sessions-repository";
import {
  deleteServerRecord,
  listServers,
  upsertServer,
} from "@/lib/mcp/servers-repository";
import {
  createEmptyServer,
  importServers,
} from "@/lib/mcp/servers-storage";
import type {
  McpServerConfig,
  McpServerFormValues,
  McpTestResult,
  ServerRuntimeState,
} from "@/lib/mcp/types";

const DEFAULT_RUNTIME: ServerRuntimeState = { status: "disconnected" };

async function persistServers(next: McpServerConfig[]): Promise<McpServerConfig[]> {
  const sorted = [...next].sort((a, b) => b.updatedAt - a.updatedAt);
  await Promise.all(sorted.map((server) => upsertServer(server)));
  return sorted;
}

export function useMcpServers() {
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [runtimeById, setRuntimeById] = useState<
    Record<string, ServerRuntimeState>
  >({});
  const [hydrated, setHydrated] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const runtimeRef = useRef<Record<string, ServerRuntimeState>>(runtimeById);

  useEffect(() => {
    runtimeRef.current = runtimeById;
  }, [runtimeById]);

  const reattachLiveSessions = useCallback(
    (loaded: McpServerConfig[], sessionMap: Record<string, string>) => {
      const validIds = new Set(loaded.map((server) => server.id));
      let cancelled = false;

      for (const [serverId, sessionId] of Object.entries(sessionMap)) {
        if (!validIds.has(serverId)) {
          void removeLiveSessionId(serverId);
          continue;
        }
        void getSessionStatus(sessionId)
          .then((status) => {
            if (cancelled) return;
            if (status.alive) {
              setRuntimeById((prev) => ({
                ...prev,
                [serverId]: {
                  status: "connected",
                  error: undefined,
                  capabilities: status.capabilities,
                  sessionId,
                },
              }));
            } else {
              void removeLiveSessionId(serverId);
            }
          })
          .catch(() => {
            if (!cancelled) void removeLiveSessionId(serverId);
          });
      }

      return () => {
        cancelled = true;
      };
    },
    [],
  );

  const reload = useCallback(async () => {
    const loaded = await listServers();
    const sessionMap = await listLiveSessionMap();
    setServers(loaded);
    setActiveServerId((current) => {
      if (current && loaded.some((server) => server.id === current)) {
        return current;
      }
      return loaded[0]?.id ?? null;
    });
    return reattachLiveSessions(loaded, sessionMap);
  }, [reattachLiveSessions]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void Promise.all([listServers(), listLiveSessionMap()])
      .then(([loaded, sessionMap]) => {
        if (cancelled) return;
        setServers(loaded);
        setActiveServerId(loaded[0]?.id ?? null);
        setHydrated(true);
        cleanup = reattachLiveSessions(loaded, sessionMap);
      })
      .catch(() => {
        if (cancelled) return;
        setHydrated(true);
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [reattachLiveSessions]);

  useEffect(() => {
    const KEEPALIVE_MS = 5 * 60 * 1000;
    const interval = setInterval(() => {
      for (const [serverId, runtime] of Object.entries(runtimeRef.current)) {
        if (runtime.status !== "connected" || !runtime.sessionId) continue;
        const sessionId = runtime.sessionId;
        void getSessionStatus(sessionId)
          .then((status) => {
            if (status.alive) return;
            void removeLiveSessionId(serverId);
            setRuntimeById((prev) => ({
              ...prev,
              [serverId]: { status: "disconnected" },
            }));
          })
          .catch(() => {
            // ignore transient keepalive failures
          });
      }
    }, KEEPALIVE_MS);
    return () => clearInterval(interval);
  }, []);

  const updateRuntime = useCallback(
    (id: string, patch: Partial<ServerRuntimeState>) => {
      setRuntimeById((prev) => ({
        ...prev,
        [id]: { ...(prev[id] ?? DEFAULT_RUNTIME), ...patch },
      }));
    },
    [],
  );

  const addServer = useCallback(
    async (values: McpServerFormValues) => {
      const now = Date.now();
      const server: McpServerConfig = {
        id: crypto.randomUUID(),
        ...values,
        createdAt: now,
        updatedAt: now,
      };
      setServers((prev) => [server, ...prev]);
      setActiveServerId(server.id);
      try {
        await upsertServer(server);
      } catch {
        await reload();
        throw new Error("MCP 서버 저장에 실패했습니다.");
      }
      return server.id;
    },
    [reload],
  );

  const updateServer = useCallback(
    async (id: string, values: McpServerFormValues) => {
      const sessionId = runtimeById[id]?.sessionId;
      if (sessionId) {
        void disconnectServer(sessionId).catch(() => {
          // best-effort cleanup
        });
        void removeLiveSessionId(id);
        updateRuntime(id, {
          status: "disconnected",
          error: undefined,
          capabilities: undefined,
          sessionId: undefined,
        });
      }

      const previous = servers;
      const next = servers.map((server) =>
        server.id === id
          ? { ...server, ...values, updatedAt: Date.now() }
          : server,
      );
      setServers(next);
      try {
        const updated = next.find((server) => server.id === id);
        if (updated) await upsertServer(updated);
      } catch {
        setServers(previous);
      }
    },
    [runtimeById, servers, updateRuntime],
  );

  const deleteServer = useCallback(
    async (id: string) => {
      const sessionId = runtimeById[id]?.sessionId;
      if (sessionId) {
        void disconnectServer(sessionId).catch(() => {
          // best-effort cleanup
        });
      }
      void removeLiveSessionId(id);

      const previous = servers;
      const next = servers.filter((server) => server.id !== id);
      setServers(next);
      setRuntimeById((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (activeServerId === id) {
        setActiveServerId(next[0]?.id ?? null);
      }

      try {
        await deleteServerRecord(id);
      } catch {
        setServers(previous);
      }
    },
    [activeServerId, runtimeById, servers],
  );

  const selectServer = useCallback((id: string) => {
    setActiveServerId(id);
  }, []);

  const connect = useCallback(
    async (id: string) => {
      const server = servers.find((item) => item.id === id);
      if (!server) return;

      updateRuntime(id, {
        status: "connecting",
        error: undefined,
        capabilities: undefined,
        sessionId: undefined,
      });

      try {
        const { sessionId, capabilities } = await connectServer(id);
        updateRuntime(id, {
          status: "connected",
          error: undefined,
          capabilities,
          sessionId,
        });
      } catch (error) {
        updateRuntime(id, {
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "연결 중 알 수 없는 오류가 발생했습니다.",
          capabilities: undefined,
          sessionId: undefined,
        });
      }
    },
    [servers, updateRuntime],
  );

  const disconnect = useCallback(
    (id: string) => {
      const sessionId = runtimeById[id]?.sessionId;
      if (sessionId) {
        void disconnectServer(sessionId).catch(() => {
          // best-effort cleanup
        });
      }
      void removeLiveSessionId(id);
      updateRuntime(id, {
        status: "disconnected",
        error: undefined,
        capabilities: undefined,
        sessionId: undefined,
      });
    },
    [runtimeById, updateRuntime],
  );

  const importFromJson = useCallback(
    async (json: string) => {
      const result = importServers(json, servers);
      if (result.error) {
        setImportError(result.error);
        return false;
      }
      setImportError(null);
      const sorted = result.servers.sort((a, b) => b.updatedAt - a.updatedAt);
      setServers(sorted);
      if (!activeServerId && sorted[0]) {
        setActiveServerId(sorted[0].id);
      }
      try {
        await persistServers(sorted);
      } catch {
        setImportError("가져온 MCP 서버를 저장하지 못했습니다.");
        return false;
      }
      return true;
    },
    [activeServerId, servers],
  );

  const requireSession = useCallback(
    (id: string): string | null => runtimeById[id]?.sessionId ?? null,
    [runtimeById],
  );

  const withCall = useCallback(
    async (
      id: string,
      run: (sessionId: string) => Promise<McpTestResult>,
    ): Promise<McpTestResult> => {
      const sessionId = requireSession(id);
      if (!sessionId) {
        return { ok: false, error: "서버에 연결되어 있지 않습니다.", durationMs: 0 };
      }
      try {
        return await run(sessionId);
      } catch (error) {
        if (error instanceof McpApiError && error.code === "SESSION_NOT_FOUND") {
          void removeLiveSessionId(id);
          updateRuntime(id, {
            status: "disconnected",
            error: undefined,
            capabilities: undefined,
            sessionId: undefined,
          });
        }
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "요청 처리 중 오류가 발생했습니다.",
          durationMs: 0,
        };
      }
    },
    [requireSession, updateRuntime],
  );

  const testPrompt = useCallback(
    (id: string, promptName: string, args: Record<string, string>) =>
      withCall(id, (sessionId) => getPrompt(sessionId, promptName, args)),
    [withCall],
  );

  const testResource = useCallback(
    (id: string, uri: string) =>
      withCall(id, (sessionId) => readResource(sessionId, uri)),
    [withCall],
  );

  const testTool = useCallback(
    (id: string, toolName: string, args: Record<string, unknown>) =>
      withCall(id, (sessionId) => callTool(sessionId, toolName, args)),
    [withCall],
  );

  const activeServer = servers.find((s) => s.id === activeServerId) ?? null;
  const activeRuntime = activeServerId
    ? (runtimeById[activeServerId] ?? DEFAULT_RUNTIME)
    : DEFAULT_RUNTIME;

  const getRuntime = useCallback(
    (id: string) => runtimeById[id] ?? DEFAULT_RUNTIME,
    [runtimeById],
  );

  return {
    servers,
    activeServerId,
    activeServer,
    activeRuntime,
    hydrated,
    importError,
    reload,
    addServer,
    updateServer,
    deleteServer,
    selectServer,
    connect,
    disconnect,
    importFromJson,
    testPrompt,
    testResource,
    testTool,
    getRuntime,
    clearImportError: () => setImportError(null),
    createEmptyServer,
  };
}
