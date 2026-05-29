import {
  GoogleGenerativeAI,
  type Content,
  type FunctionDeclaration,
  type Part,
} from "@google/generative-ai";
import type { ChatToolResult, ToolMappingEntry } from "@/lib/mcp/server/tools-for-chat";
import { formatToolResponseForGemini } from "@/lib/mcp/server/tools-for-chat";
import { getGeminiEnv } from "./env";

export type ChatMessageInput = {
  role: "user" | "assistant";
  content: string;
};

export type GeminiStreamEvent =
  | { type: "text"; text: string }
  | {
      type: "tool_start";
      id: string;
      geminiName: string;
      serverName: string;
      toolName: string;
      args: Record<string, unknown>;
    }
  | {
      type: "tool_result";
      id: string;
      ok: boolean;
      result?: unknown;
      error?: string;
      durationMs: number;
    };

export type ToolExecutionHandler = (
  geminiName: string,
  args: Record<string, unknown>,
) => Promise<ChatToolResult>;

const MAX_TOOL_ROUNDS = 5;

function toGeminiContents(messages: ChatMessageInput[]): Content[] {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content } satisfies Part],
  }));
}

export async function* streamGeminiResponse(
  messages: ChatMessageInput[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  for await (const event of streamGeminiWithTools(messages, [], new Map(), signal)) {
    if (event.type === "text") {
      yield event.text;
    }
  }
}

export async function* streamGeminiWithTools(
  messages: ChatMessageInput[],
  declarations: FunctionDeclaration[],
  toolMap: Map<string, ToolMappingEntry>,
  signal?: AbortSignal,
  executeTool?: ToolExecutionHandler,
): AsyncGenerator<GeminiStreamEvent> {
  const { apiKey, model } = getGeminiEnv();
  const client = new GoogleGenerativeAI(apiKey);
  const hasTools = declarations.length > 0 && executeTool;
  const generativeModel = client.getGenerativeModel({
    model,
    ...(hasTools ? { tools: [{ functionDeclarations: declarations }] } : {}),
  });

  const contents: Content[] = toGeminiContents(messages);

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    if (signal?.aborted) {
      return;
    }

    const result = await generativeModel.generateContentStream({ contents });
    let responseText = "";

    for await (const chunk of result.stream) {
      if (signal?.aborted) {
        return;
      }

      const text = chunk.text();
      if (text) {
        responseText += text;
        yield { type: "text", text };
      }
    }

    if (signal?.aborted) {
      return;
    }

    const response = await result.response;
    const functionCalls = response.functionCalls() ?? [];

    if (!hasTools || functionCalls.length === 0 || !executeTool) {
      return;
    }

    const modelParts: Part[] = [];
    if (responseText) {
      modelParts.push({ text: responseText });
    }
    for (const call of functionCalls) {
      if (call.name) {
        modelParts.push({ functionCall: call });
      }
    }
    if (modelParts.length > 0) {
      contents.push({ role: "model", parts: modelParts });
    }

    const responseParts: Part[] = [];

    for (const call of functionCalls) {
      if (signal?.aborted) {
        return;
      }

      const geminiName = call.name ?? "unknown_tool";
      const args = (call.args ?? {}) as Record<string, unknown>;
      const toolId = crypto.randomUUID();
      const mapping = toolMap.get(geminiName);

      yield {
        type: "tool_start",
        id: toolId,
        geminiName,
        serverName: mapping?.serverName ?? geminiName,
        toolName: mapping?.toolName ?? geminiName,
        args,
      };

      const toolResult = await executeTool(geminiName, args);

      yield {
        type: "tool_result",
        id: toolId,
        ok: toolResult.ok,
        ...(toolResult.ok
          ? { result: toolResult.data }
          : { error: toolResult.error }),
        durationMs: toolResult.durationMs,
      };

      responseParts.push({
        functionResponse: {
          name: geminiName,
          response: formatToolResponseForGemini(toolResult),
        },
      });
    }

    if (responseParts.length > 0) {
      contents.push({ role: "user", parts: responseParts });
    }
  }
}
