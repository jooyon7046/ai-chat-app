import type { Session } from "@/lib/types";
import { isUserMessage } from "@/lib/types";

export const SESSIONS_STORAGE_KEY = "chat-sessions";

const TITLE_MAX_LENGTH = 30;

export function deriveSessionTitle(messages: Session["messages"]): string {
  const firstUser = messages.find(
    (message) => isUserMessage(message) && message.content.trim(),
  );
  if (!firstUser || !isUserMessage(firstUser)) {
    return "새 채팅";
  }
  const trimmed = firstUser.content.trim().replace(/\s+/g, " ");
  if (trimmed.length <= TITLE_MAX_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, TITLE_MAX_LENGTH)}…`;
}

export function loadSessions(): Session[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Session[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveSessions(sessions: Session[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // ignore quota / private mode errors
  }
}

export function createEmptySession(): Session {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "새 채팅",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}
