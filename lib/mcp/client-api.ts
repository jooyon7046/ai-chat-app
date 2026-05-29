import type {
  McpCapabilities,
  McpTestResult,
} from "@/lib/mcp/types";

type ErrorPayload = { code?: string; message?: string };

export class McpApiError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "McpApiError";
    this.code = code;
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = "요청 처리 중 오류가 발생했습니다.";
    let code: string | undefined;
    try {
      const payload = (await response.json()) as ErrorPayload;
      if (payload.message) message = payload.message;
      if (payload.code) code = payload.code;
    } catch {
      // ignore body parse errors
    }
    throw new McpApiError(message, code);
  }

  return (await response.json()) as T;
}

export async function connectServer(
  serverId: string,
): Promise<{ sessionId: string; capabilities: McpCapabilities }> {
  return postJson("/api/mcp/connect", { serverId });
}

export async function disconnectServer(sessionId: string): Promise<void> {
  await postJson("/api/mcp/disconnect", { sessionId });
}

export async function getSessionStatus(
  sessionId: string,
): Promise<{ alive: boolean; capabilities?: McpCapabilities }> {
  return postJson("/api/mcp/session", { sessionId });
}

export async function callTool(
  sessionId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<McpTestResult> {
  return postJson("/api/mcp/tools/call", { sessionId, name, arguments: args });
}

export async function getPrompt(
  sessionId: string,
  name: string,
  args: Record<string, string>,
): Promise<McpTestResult> {
  return postJson("/api/mcp/prompts/get", { sessionId, name, arguments: args });
}

export async function readResource(
  sessionId: string,
  uri: string,
): Promise<McpTestResult> {
  return postJson("/api/mcp/resources/read", { sessionId, uri });
}
