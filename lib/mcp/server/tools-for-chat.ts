import {
  SchemaType,
  type FunctionDeclaration,
  type FunctionDeclarationSchema,
  type Schema,
} from "@google/generative-ai";
import { callTool } from "@/lib/mcp/server/connection";
import { getSession } from "@/lib/mcp/server/registry";
import type { McpTestResult } from "@/lib/mcp/types";

const MAX_GEMINI_NAME_LENGTH = 64;

export type ToolMappingEntry = {
  sessionId: string;
  serverName: string;
  toolName: string;
};

export type ToolCollection = {
  declarations: FunctionDeclaration[];
  map: Map<string, ToolMappingEntry>;
};

export type ChatToolResult = McpTestResult & {
  serverName: string;
  toolName: string;
};

function sanitizeGeminiName(serverName: string, toolName: string): string {
  const raw = `${serverName}__${toolName}`;
  return raw.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, MAX_GEMINI_NAME_LENGTH);
}

function uniqueGeminiName(
  base: string,
  used: Set<string>,
): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }

  let index = 2;
  while (index < 1000) {
    const suffix = `_${index}`;
    const candidate = base.slice(0, MAX_GEMINI_NAME_LENGTH - suffix.length) + suffix;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
    index += 1;
  }

  const fallback = `tool_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
  used.add(fallback);
  return fallback;
}

function mapJsonSchemaType(type: unknown): SchemaType | undefined {
  if (typeof type !== "string") return undefined;

  switch (type.toLowerCase()) {
    case "string":
      return SchemaType.STRING;
    case "number":
      return SchemaType.NUMBER;
    case "integer":
      return SchemaType.INTEGER;
    case "boolean":
      return SchemaType.BOOLEAN;
    case "array":
      return SchemaType.ARRAY;
    case "object":
      return SchemaType.OBJECT;
    default:
      return undefined;
  }
}

function convertJsonSchema(schema: unknown): Schema | undefined {
  if (!schema || typeof schema !== "object") return undefined;

  const record = schema as Record<string, unknown>;
  const schemaType = mapJsonSchemaType(record.type);
  if (!schemaType) return undefined;

  const description =
    typeof record.description === "string" ? record.description : undefined;

  if (schemaType === SchemaType.OBJECT) {
    const properties: Record<string, Schema> = {};
    const rawProperties = record.properties;
    if (rawProperties && typeof rawProperties === "object") {
      for (const [key, value] of Object.entries(rawProperties)) {
        const converted = convertJsonSchema(value);
        if (converted) {
          properties[key] = converted;
        }
      }
    }

    return {
      type: SchemaType.OBJECT,
      properties,
      ...(description ? { description } : {}),
      ...(Array.isArray(record.required)
        ? { required: record.required.filter((item) => typeof item === "string") }
        : {}),
    };
  }

  if (schemaType === SchemaType.ARRAY) {
    const items =
      convertJsonSchema(record.items) ??
      ({ type: SchemaType.STRING } as Schema);

    return {
      type: SchemaType.ARRAY,
      items,
      ...(description ? { description } : {}),
    };
  }

  return {
    type: schemaType,
    ...(description ? { description } : {}),
  } as Schema;
}

function convertToFunctionParameters(
  schema: unknown,
): FunctionDeclarationSchema | undefined {
  const converted = convertJsonSchema(schema);
  if (!converted) return undefined;

  if (converted.type === SchemaType.OBJECT) {
    return converted as FunctionDeclarationSchema;
  }

  return {
    type: SchemaType.OBJECT,
    properties: {},
    description:
      typeof schema === "object" &&
      schema !== null &&
      typeof (schema as Record<string, unknown>).description === "string"
        ? ((schema as Record<string, unknown>).description as string)
        : undefined,
  };
}

export function collectToolDeclarations(sessionIds: string[]): ToolCollection {
  const map = new Map<string, ToolMappingEntry>();
  const declarations: FunctionDeclaration[] = [];
  const usedNames = new Set<string>();

  for (const sessionId of sessionIds) {
    try {
      const entry = getSession(sessionId);
      const serverName = entry.config.name;

      for (const tool of entry.capabilities.tools) {
        const baseName = sanitizeGeminiName(serverName, tool.name);
        const geminiName = uniqueGeminiName(baseName, usedNames);

        map.set(geminiName, {
          sessionId,
          serverName,
          toolName: tool.name,
        });

        declarations.push({
          name: geminiName,
          ...(tool.description ? { description: tool.description } : {}),
          ...(tool.inputSchema
            ? { parameters: convertToFunctionParameters(tool.inputSchema) }
            : {}),
        });
      }
    } catch {
      // Skip missing or expired sessions.
    }
  }

  return { declarations, map };
}

export async function runChatTool(
  map: Map<string, ToolMappingEntry>,
  geminiName: string,
  args: Record<string, unknown>,
): Promise<ChatToolResult> {
  const mapping = map.get(geminiName);
  if (!mapping) {
    return {
      ok: false,
      error: "등록되지 않은 도구입니다.",
      durationMs: 0,
      serverName: "",
      toolName: geminiName,
    };
  }

  try {
    const session = getSession(mapping.sessionId);
    const result = await callTool(
      session.connection,
      mapping.toolName,
      args,
    );
    return {
      ...result,
      serverName: mapping.serverName,
      toolName: mapping.toolName,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "도구 실행 중 오류가 발생했습니다.",
      durationMs: 0,
      serverName: mapping.serverName,
      toolName: mapping.toolName,
    };
  }
}

export function formatToolResponseForGemini(result: ChatToolResult): Record<string, unknown> {
  if (result.ok) {
    return { ok: true, data: result.data ?? null };
  }
  return { ok: false, error: result.error ?? "도구 실행에 실패했습니다." };
}
