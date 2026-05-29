export type StreamChunkEvent = {
  type: "chunk";
  text: string;
};

export type StreamToolStartEvent = {
  type: "tool_start";
  id: string;
  geminiName: string;
  serverName: string;
  toolName: string;
  args: Record<string, unknown>;
};

export type StreamToolResultEvent = {
  type: "tool_result";
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
  durationMs: number;
};

export type StreamDoneEvent = {
  type: "done";
};

export type StreamErrorEvent = {
  type: "error";
  code: string;
  message: string;
};

export type StreamEvent =
  | StreamChunkEvent
  | StreamToolStartEvent
  | StreamToolResultEvent
  | StreamDoneEvent
  | StreamErrorEvent;

export function encodeSseEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function parseSseLine(line: string): StreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) {
    return null;
  }

  try {
    return JSON.parse(trimmed.slice(5).trim()) as StreamEvent;
  } catch {
    return null;
  }
}
