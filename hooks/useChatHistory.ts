"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createEmptySession,
  deleteSessionRecord,
  deriveSessionTitle,
  insertSession,
  listSessions,
  updateSessionRecord,
} from "@/lib/chat/sessions-repository";
import type { Message, Session } from "@/lib/types";

export function useChatHistory() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const loaded = await listSessions();
    setSessions(loaded);
    setActiveSessionId((current) => {
      if (current && loaded.some((session) => session.id === current)) {
        return current;
      }
      return loaded[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    void listSessions()
      .then((loaded) => {
        if (cancelled) return;
        setSessions(loaded);
        setActiveSessionId(loaded[0]?.id ?? null);
        setHydrated(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "채팅 기록을 불러오지 못했습니다.",
        );
        setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const createSession = useCallback(async () => {
    const session = createEmptySession();
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    try {
      await insertSession(session);
    } catch (error) {
      await reload();
      throw error;
    }
    return session.id;
  }, [reload]);

  const selectSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const updateSession = useCallback(
    async (id: string, messages: Message[]) => {
      const now = Date.now();
      const previous = sessions;
      setSessions((current) =>
        current
          .map((session) =>
            session.id === id
              ? {
                  ...session,
                  messages,
                  title: deriveSessionTitle(messages),
                  updatedAt: now,
                }
              : session,
          )
          .sort((a, b) => b.updatedAt - a.updatedAt),
      );

      try {
        await updateSessionRecord(id, messages);
      } catch {
        setSessions(previous);
      }
    },
    [sessions],
  );

  const deleteSession = useCallback(
    async (id: string) => {
      const previous = sessions;
      const next = sessions.filter((session) => session.id !== id);
      setSessions(next);
      if (activeSessionId === id) {
        setActiveSessionId(next[0]?.id ?? null);
      }

      try {
        await deleteSessionRecord(id);
      } catch {
        setSessions(previous);
        setActiveSessionId(activeSessionId);
      }
    },
    [activeSessionId, sessions],
  );

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? null;

  const ensureActiveSession = useCallback(async () => {
    if (activeSessionId && sessions.some((session) => session.id === activeSessionId)) {
      return activeSessionId;
    }
    if (sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
      return sessions[0].id;
    }
    return createSession();
  }, [activeSessionId, createSession, sessions]);

  return {
    sessions,
    activeSessionId,
    activeSession,
    hydrated,
    loadError,
    reload,
    createSession,
    selectSession,
    updateSession,
    deleteSession,
    ensureActiveSession,
  };
}
