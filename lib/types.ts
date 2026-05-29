import type { McpTool } from "@/lib/mcp/types";

export type UserMessage = {
  id: string;
  role: "user";
  content: string;
};

export type AssistantMessage = {
  id: string;
  role: "assistant";
  content: string;
};

export type ToolMessage = {
  id: string;
  role: "tool";
  geminiName: string;
  serverName: string;
  toolName: string;
  args: Record<string, unknown>;
  ok: boolean;
  result?: unknown;
  error?: string;
  durationMs?: number;
  status: "running" | "done";
};

export type Message = UserMessage | AssistantMessage | ToolMessage;

export type Session = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

export type ConnectedMcpSessionInput = {
  sessionId: string;
  serverId: string;
  serverName: string;
  tools: McpTool[];
};

export function isUserMessage(message: Message): message is UserMessage {
  return message.role === "user";
}

export function isAssistantMessage(
  message: Message,
): message is AssistantMessage {
  return message.role === "assistant";
}

export function isToolMessage(message: Message): message is ToolMessage {
  return message.role === "tool";
}
