"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { streamChat } from "@/lib/chat/stream-client";
import type { ChatMessageInput } from "@/lib/llm/gemini";
import type { Message, ToolMessage } from "@/lib/types";
import { isAssistantMessage, isUserMessage } from "@/lib/types";

function createId(): string {
  return crypto.randomUUID();
}

type UseChatOptions = {
  sessionId: string | null;
  sessionIds?: string[];
  initialMessages?: Message[];
  onMessagesChange?: (messages: Message[]) => void;
};

function toApiMessages(messages: Message[]): ChatMessageInput[] {
  const result: ChatMessageInput[] = [];

  for (const message of messages) {
    if (isUserMessage(message)) {
      result.push({ role: "user", content: message.content });
      continue;
    }
    if (isAssistantMessage(message) && message.content.trim().length > 0) {
      result.push({ role: "assistant", content: message.content });
    }
  }

  return result;
}

export function useChat({
  sessionId,
  sessionIds = [],
  initialMessages = [],
  onMessagesChange,
}: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const onMessagesChangeRef = useRef(onMessagesChange);

  useEffect(() => {
    onMessagesChangeRef.current = onMessagesChange;
  }, [onMessagesChange]);

  const prevSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (sessionId !== prevSessionIdRef.current) {
      prevSessionIdRef.current = sessionId;
      setMessages(initialMessages);
      abortRef.current?.abort();
      abortRef.current = null;
      setIsStreaming(false);
    }
  }, [sessionId, initialMessages]);

  const updateMessages = useCallback(
    (updater: Message[] | ((prev: Message[]) => Message[])) => {
      setMessages((prev) => {
        const next =
          typeof updater === "function" ? updater(prev) : updater;
        onMessagesChangeRef.current?.(next);
        return next;
      });
    },
    [],
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming || !sessionId) return;

      abortRef.current?.abort();

      const userMessage: Message = {
        id: createId(),
        role: "user",
        content: trimmed,
      };

      const assistantId = createId();
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
      };

      const historyForApi = toApiMessages([...messages, userMessage]);

      updateMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChat({
          messages: historyForApi,
          sessionIds,
          signal: controller.signal,
          onChunk: (chunk) => {
            updateMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId && isAssistantMessage(msg)
                  ? { ...msg, content: msg.content + chunk }
                  : msg,
              ),
            );
          },
          onToolStart: (payload) => {
            const toolMessage: ToolMessage = {
              id: payload.id,
              role: "tool",
              geminiName: payload.geminiName,
              serverName: payload.serverName,
              toolName: payload.toolName,
              args: payload.args,
              ok: false,
              status: "running",
            };

            updateMessages((prev) => {
              const assistantIdx = prev.findIndex((msg) => msg.id === assistantId);
              if (assistantIdx === -1) {
                return [...prev, toolMessage];
              }
              return [
                ...prev.slice(0, assistantIdx),
                toolMessage,
                ...prev.slice(assistantIdx),
              ];
            });
          },
          onToolResult: (payload) => {
            updateMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.id && msg.role === "tool"
                  ? {
                      ...msg,
                      status: "done",
                      ok: payload.ok,
                      ...(payload.ok
                        ? { result: payload.result }
                        : { error: payload.error }),
                      durationMs: payload.durationMs,
                    }
                  : msg,
              ),
            );
          },
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.";

        updateMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId && isAssistantMessage(msg)
              ? { ...msg, content: message }
              : msg,
          ),
        );
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setIsStreaming(false);
      }
    },
    [isStreaming, messages, sessionId, sessionIds, updateMessages],
  );

  return { messages, isStreaming, sendMessage, stopStreaming };
}
