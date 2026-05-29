import { parseSseLine, type StreamEvent } from "./sse";
import type { ChatErrorPayload } from "@/lib/llm/errors";
import type { ChatMessageInput } from "@/lib/llm/gemini";

type StreamToolStartPayload = {
  id: string;
  geminiName: string;
  serverName: string;
  toolName: string;
  args: Record<string, unknown>;
};

type StreamToolResultPayload = {
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
  durationMs: number;
};

type StreamChatOptions = {
  messages: ChatMessageInput[];
  sessionIds?: string[];
  signal?: AbortSignal;
  onChunk: (text: string) => void;
  onToolStart?: (payload: StreamToolStartPayload) => void;
  onToolResult?: (payload: StreamToolResultPayload) => void;
};

export async function streamChat({
  messages,
  sessionIds = [],
  signal,
  onChunk,
  onToolStart,
  onToolResult,
}: StreamChatOptions): Promise<void> {
  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ messages, sessionIds }),
    signal,
  });

  if (!response.ok) {
    let error: ChatErrorPayload = {
      code: "UNKNOWN",
      message: "요청에 실패했습니다.",
    };

    try {
      error = (await response.json()) as ChatErrorPayload;
    } catch {
      // use default
    }

    throw new Error(error.message);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("스트리밍 응답을 읽을 수 없습니다.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const event = parseSseLine(line) as StreamEvent | null;
      if (!event) continue;

      if (event.type === "chunk") {
        onChunk(event.text);
      } else if (event.type === "tool_start") {
        onToolStart?.({
          id: event.id,
          geminiName: event.geminiName,
          serverName: event.serverName,
          toolName: event.toolName,
          args: event.args,
        });
      } else if (event.type === "tool_result") {
        onToolResult?.({
          id: event.id,
          ok: event.ok,
          result: event.result,
          error: event.error,
          durationMs: event.durationMs,
        });
      } else if (event.type === "error") {
        throw new Error(event.message);
      }
    }
  }
}
