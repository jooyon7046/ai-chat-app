export type McpErrorCode =
  | "BAD_REQUEST"
  | "SESSION_NOT_FOUND"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "COMMAND_NOT_FOUND"
  | "CONNECTION_REFUSED"
  | "TIMEOUT"
  | "UNAUTHORIZED"
  | "UPSTREAM_ERROR"
  | "CAPABILITY_UNSUPPORTED"
  | "UNKNOWN";

export type McpErrorPayload = {
  code: McpErrorCode;
  message: string;
};

const STATUS_BY_CODE: Record<McpErrorCode, number> = {
  BAD_REQUEST: 400,
  SESSION_NOT_FOUND: 404,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  COMMAND_NOT_FOUND: 400,
  CONNECTION_REFUSED: 502,
  TIMEOUT: 504,
  UNAUTHORIZED: 401,
  UPSTREAM_ERROR: 502,
  CAPABILITY_UNSUPPORTED: 400,
  UNKNOWN: 500,
};

export class McpProxyError extends Error {
  readonly code: McpErrorCode;

  constructor(code: McpErrorCode, message: string) {
    super(message);
    this.name = "McpProxyError";
    this.code = code;
  }
}

export function statusForCode(code: McpErrorCode): number {
  return STATUS_BY_CODE[code] ?? 500;
}

export function toMcpError(error: unknown): McpErrorPayload {
  if (error instanceof McpProxyError) {
    return { code: error.code, message: error.message };
  }

  if (error instanceof Error) {
    const message = error.message;
    const errnoCode = (error as NodeJS.ErrnoException).code;

    if (errnoCode === "ENOENT" || /ENOENT/.test(message)) {
      return {
        code: "COMMAND_NOT_FOUND",
        message:
          "명령을 찾을 수 없습니다. command 경로가 올바른지, 해당 실행 파일이 설치되어 있는지 확인해 주세요.",
      };
    }

    if (errnoCode === "ECONNREFUSED" || /ECONNREFUSED/.test(message)) {
      return {
        code: "CONNECTION_REFUSED",
        message: "서버 연결이 거부되었습니다. URL과 서버 실행 상태를 확인해 주세요.",
      };
    }

    if (/timed? ?out/i.test(message)) {
      return { code: "TIMEOUT", message: "요청 시간이 초과되었습니다." };
    }

    const status = extractStatus(message);
    if (status === 401 || status === 403) {
      return {
        code: "UNAUTHORIZED",
        message: "인증에 실패했습니다. 헤더/토큰 설정을 확인해 주세요.",
      };
    }
    if (status && status >= 500) {
      return { code: "UPSTREAM_ERROR", message: "MCP 서버에서 오류가 발생했습니다." };
    }

    return { code: "UNKNOWN", message: message || "알 수 없는 오류가 발생했습니다." };
  }

  return { code: "UNKNOWN", message: "알 수 없는 오류가 발생했습니다." };
}

function extractStatus(message: string): number | null {
  const match = message.match(/\b(4\d{2}|5\d{2})\b/);
  return match ? Number(match[1]) : null;
}
