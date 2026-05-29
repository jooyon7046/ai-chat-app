import type { Tables, TablesInsert } from "@/lib/supabase/database.types";
import type { McpServerConfig, McpTransportType } from "@/lib/mcp/types";

type McpServerRow = Tables<"mcp_servers">;

function parseTransport(value: string): McpTransportType {
  if (value === "stdio" || value === "sse" || value === "http") {
    return value;
  }
  return "stdio";
}

export function rowToMcpServerConfig(row: McpServerRow): McpServerConfig {
  return {
    id: row.id,
    name: row.name,
    transport: parseTransport(row.transport),
    command: row.command ?? undefined,
    args: Array.isArray(row.args) ? (row.args as string[]) : [],
    env:
      row.env && typeof row.env === "object" && !Array.isArray(row.env)
        ? (row.env as Record<string, string>)
        : {},
    url: row.url ?? undefined,
    headers:
      row.headers &&
      typeof row.headers === "object" &&
      !Array.isArray(row.headers)
        ? (row.headers as Record<string, string>)
        : {},
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export function serverToInsert(
  server: McpServerConfig,
  userId: string,
): TablesInsert<"mcp_servers"> {
  return {
    id: server.id,
    user_id: userId,
    name: server.name,
    transport: server.transport,
    command: server.command ?? null,
    args: server.args ?? [],
    env: server.env ?? {},
    url: server.url ?? null,
    headers: server.headers ?? {},
    created_at: new Date(server.createdAt).toISOString(),
    updated_at: new Date(server.updatedAt).toISOString(),
  };
}
