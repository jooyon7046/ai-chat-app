export type ChatErrorCode =
  | "CONFIG_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "BAD_REQUEST"
  | "UPSTREAM_ERROR"
  | "UNKNOWN";

export type ChatErrorPayload = {
  code: ChatErrorCode;
  message: string;
};

const ERROR_MESSAGES: Record<ChatErrorCode, string> = {
  CONFIG_ERROR:
    "API 키가 설정되지 않았습니다. 프로젝트 루트의 .env.local 파일에 GEMINI_API_KEY를 추가해 주세요.",
  UNAUTHORIZED:
    "API 키가 유효하지 않습니다. GEMINI_API_KEY 값을 확인해 주세요.",
  FORBIDDEN: "이 API 키로는 해당 모델을 사용할 수 없습니다.",
  RATE_LIMITED: "요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.",
  BAD_REQUEST: "요청 형식이 올바르지 않습니다.",
  UPSTREAM_ERROR: "AI 서비스에 일시적인 오류가 발생했습니다. 다시 시도해 주세요.",
  UNKNOWN: "알 수 없는 오류가 발생했습니다. 다시 시도해 주세요.",
};

export function toChatError(error: unknown): ChatErrorPayload {
  if (error instanceof Error) {
    if (error.message === "GEMINI_API_KEY_MISSING") {
      return { code: "CONFIG_ERROR", message: ERROR_MESSAGES.CONFIG_ERROR };
    }

    const modelError = extractGeminiModelError(error.message);
    if (modelError) {
      return modelError;
    }

    const status =
      extractStatusFromObject(error) ?? extractStatus(error.message);
    if (status) {
      return mapStatusToError(status, error.message);
    }
  }

  const status = extractStatusFromObject(error);
  if (status) {
    const message =
      error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN;
    return mapStatusToError(status, message);
  }

  return { code: "UNKNOWN", message: ERROR_MESSAGES.UNKNOWN };
}

function extractGeminiModelError(message: string): ChatErrorPayload | null {
  if (!/\[404 Not Found\]|is not found for API version/i.test(message)) {
    return null;
  }

  const modelMatch = message.match(/models\/([^:]+):/);
  const modelName = modelMatch?.[1];

  return {
    code: "BAD_REQUEST",
    message: modelName
      ? `모델 "${modelName}"을(를) 찾을 수 없습니다. .env.local의 LLM_MODEL 값을 확인해 주세요. (예: gemini-2.5-flash-lite)`
      : "LLM 모델을 찾을 수 없습니다. .env.local의 LLM_MODEL 값을 확인해 주세요.",
  };
}

function extractStatusFromObject(error: unknown): number | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const record = error as Record<string, unknown>;
  if (typeof record.status === "number") {
    return record.status;
  }
  if (typeof record.statusCode === "number") {
    return record.statusCode;
  }

  return null;
}

function extractStatus(message: string): number | null {
  const match = message.match(/\b(401|403|429|4\d{2}|5\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function mapStatusToError(
  status: number,
  rawMessage?: string,
): ChatErrorPayload {
  if (status === 401) {
    return { code: "UNAUTHORIZED", message: ERROR_MESSAGES.UNAUTHORIZED };
  }
  if (status === 403) {
    return { code: "FORBIDDEN", message: ERROR_MESSAGES.FORBIDDEN };
  }
  if (status === 429) {
    return { code: "RATE_LIMITED", message: ERROR_MESSAGES.RATE_LIMITED };
  }
  if (status >= 400 && status < 500) {
    const modelError =
      rawMessage !== undefined ? extractGeminiModelError(rawMessage) : null;
    if (modelError) {
      return modelError;
    }
    return { code: "BAD_REQUEST", message: ERROR_MESSAGES.BAD_REQUEST };
  }
  if (status >= 500) {
    return { code: "UPSTREAM_ERROR", message: ERROR_MESSAGES.UPSTREAM_ERROR };
  }
  return { code: "UNKNOWN", message: ERROR_MESSAGES.UNKNOWN };
}

export function chatErrorResponse(
  payload: ChatErrorPayload,
  status = 500,
): Response {
  return Response.json(payload, { status });
}
