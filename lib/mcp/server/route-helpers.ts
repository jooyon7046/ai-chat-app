import { statusForCode, toMcpError } from "@/lib/mcp/server/errors";

export function mcpErrorResponse(error: unknown): Response {
  const payload = toMcpError(error);
  return Response.json(payload, { status: statusForCode(payload.code) });
}

export async function parseJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("요청 형식이 올바르지 않습니다.");
  }
}
