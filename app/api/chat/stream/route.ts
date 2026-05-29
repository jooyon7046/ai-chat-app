import { encodeSseEvent } from "@/lib/chat/sse";
import { toChatError, chatErrorResponse } from "@/lib/llm/errors";
import {
  streamGeminiResponse,
  streamGeminiWithTools,
  type ChatMessageInput,
} from "@/lib/llm/gemini";
import { assertLiveSessionOwners, requireAuthUser } from "@/lib/mcp/server/auth";
import { McpProxyError } from "@/lib/mcp/server/errors";
import {
  collectToolDeclarations,
  runChatTool,
} from "@/lib/mcp/server/tools-for-chat";

export const runtime = "nodejs";

type StreamRequestBody = {
  messages?: ChatMessageInput[];
  sessionIds?: string[];
};

export async function POST(request: Request) {
  let body: StreamRequestBody;

  try {
    const { supabase, user } = await requireAuthUser();
    body = (await request.json()) as StreamRequestBody;

    const sessionIds = Array.isArray(body.sessionIds)
      ? body.sessionIds.filter((id) => typeof id === "string" && id.length > 0)
      : [];

    if (sessionIds.length > 0) {
      await assertLiveSessionOwners(supabase, user.id, sessionIds);
    }
  } catch (error) {
    if (error instanceof McpProxyError) {
      const status =
        error.code === "UNAUTHORIZED"
          ? 401
          : error.code === "FORBIDDEN"
            ? 403
            : 400;
      const code =
        error.code === "UNAUTHORIZED"
          ? "UNAUTHORIZED"
          : error.code === "FORBIDDEN"
            ? "FORBIDDEN"
            : "BAD_REQUEST";
      return chatErrorResponse({ code, message: error.message }, status);
    }
    return chatErrorResponse(
      { code: "BAD_REQUEST", message: "요청 형식이 올바르지 않습니다." },
      400,
    );
  }

  const messages = body.messages?.filter(
    (m) =>
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.trim().length > 0,
  );

  if (!messages?.length) {
    return chatErrorResponse(
      { code: "BAD_REQUEST", message: "메시지가 비어 있습니다." },
      400,
    );
  }

  const sessionIds = Array.isArray(body.sessionIds)
    ? body.sessionIds.filter((id) => typeof id === "string" && id.length > 0)
    : [];

  const { declarations, map } =
    sessionIds.length > 0
      ? collectToolDeclarations(sessionIds)
      : { declarations: [], map: new Map() };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const abort = () => {
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", abort);

      try {
        const events =
          declarations.length > 0
            ? streamGeminiWithTools(
                messages,
                declarations,
                map,
                request.signal,
                (geminiName, args) => runChatTool(map, geminiName, args),
              )
            : (async function* () {
                for await (const text of streamGeminiResponse(
                  messages,
                  request.signal,
                )) {
                  yield { type: "text" as const, text };
                }
              })();

        for await (const event of events) {
          if (request.signal.aborted) {
            break;
          }

          if (event.type === "text") {
            controller.enqueue(
              encoder.encode(encodeSseEvent({ type: "chunk", text: event.text })),
            );
          } else if (event.type === "tool_start") {
            controller.enqueue(encoder.encode(encodeSseEvent(event)));
          } else if (event.type === "tool_result") {
            controller.enqueue(encoder.encode(encodeSseEvent(event)));
          }
        }

        if (!request.signal.aborted) {
          controller.enqueue(
            encoder.encode(encodeSseEvent({ type: "done" })),
          );
        }
      } catch (error) {
        const chatError = toChatError(error);
        controller.enqueue(
          encoder.encode(
            encodeSseEvent({
              type: "error",
              code: chatError.code,
              message: chatError.message,
            }),
          ),
        );
      } finally {
        request.signal.removeEventListener("abort", abort);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
