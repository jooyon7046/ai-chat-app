"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { EmptyState } from "@/components/chat/EmptyState";
import { MessageList } from "@/components/chat/MessageList";
import { StorageMigrationGate } from "@/components/StorageMigrationGate";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/useChat";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useMcpServers } from "@/hooks/useMcpServers";
import type { Message } from "@/lib/types";

const EMPTY_MESSAGES: Message[] = [];

export default function Home() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const {
    sessions,
    activeSessionId,
    activeSession,
    hydrated,
    loadError,
    reload: reloadSessions,
    createSession,
    selectSession,
    updateSession,
    deleteSession,
    ensureActiveSession,
  } = useChatHistory();

  const { servers, getRuntime, reload: reloadServers } = useMcpServers();

  const handleMigrated = useCallback(() => {
    void reloadSessions();
    void reloadServers();
  }, [reloadSessions, reloadServers]);

  const connectedSessionIds = useMemo(
    () =>
      servers
        .map((server) => {
          const runtime = getRuntime(server.id);
          if (runtime.status !== "connected" || !runtime.sessionId) {
            return null;
          }
          return runtime.sessionId;
        })
        .filter((sessionId): sessionId is string => Boolean(sessionId)),
    [servers, getRuntime],
  );

  useEffect(() => {
    if (hydrated) {
      void ensureActiveSession();
    }
  }, [hydrated, ensureActiveSession]);

  const initialMessages = useMemo(
    () => activeSession?.messages ?? EMPTY_MESSAGES,
    [activeSession?.messages],
  );

  const handleMessagesChange = useCallback(
    (messages: Message[]) => {
      if (activeSessionId) {
        void updateSession(activeSessionId, messages);
      }
    },
    [activeSessionId, updateSession],
  );

  const { messages, isStreaming, sendMessage, stopStreaming } = useChat({
    sessionId: activeSessionId,
    sessionIds: connectedSessionIds,
    initialMessages,
    onMessagesChange: handleMessagesChange,
  });

  const hasMessages = messages.length > 0;
  const showMcpBanner = connectedSessionIds.length === 0;

  const handleNewChat = () => {
    void createSession();
    setMobileSidebarOpen(false);
  };

  const handleSelectSession = (id: string) => {
    selectSession(id);
    setMobileSidebarOpen(false);
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      </div>
    );
  }

  return (
    <StorageMigrationGate onMigrated={handleMigrated}>
      <div className="flex min-h-full flex-1 bg-background">
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onNew={handleNewChat}
          onSelect={handleSelectSession}
          onDelete={(id) => void deleteSession(id)}
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ChatHeader onMenuOpen={() => setMobileSidebarOpen(true)} />
          {loadError && (
            <p className="mx-4 mt-3 text-sm text-destructive">{loadError}</p>
          )}
          {showMcpBanner && (
            <div
              role="status"
              className="mx-4 mt-3 flex flex-wrap items-start gap-3 rounded-lg border border-dashed bg-muted/30 px-4 py-3"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm font-medium">
                  MCP 서버가 연결되지 않았습니다
                </p>
                <p className="text-sm text-muted-foreground">
                  Inspector에서 MCP 서버를 연결하면 채팅에서 도구를 자동으로
                  사용할 수 있습니다. 채팅과 MCP 설정은 Supabase에 저장되며
                  이 브라우저의 익명 계정에 귀속됩니다.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/inspector" />}
                >
                  MCP 설정 열기
                </Button>
              </div>
            </div>
          )}
          <main className="flex min-h-0 flex-1 flex-col">
            {hasMessages ? (
              <MessageList messages={messages} isStreaming={isStreaming} />
            ) : (
              <EmptyState
                onSelectPrompt={sendMessage}
                disabled={isStreaming}
              />
            )}
          </main>
          <ChatInput
            onSend={sendMessage}
            onStop={stopStreaming}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    </StorageMigrationGate>
  );
}
