import type {
  McpServerConfig,
  McpServerFormValues,
  McpTransportType,
} from "@/lib/mcp/types";

export const MCP_SERVERS_STORAGE_KEY = "mcp-servers";

type ClaudeDesktopServerEntry = {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  transport?: McpTransportType;
};

type ClaudeDesktopExport = {
  mcpServers: Record<string, ClaudeDesktopServerEntry>;
};

function inferTransport(entry: ClaudeDesktopServerEntry): McpTransportType {
  if (entry.transport) return entry.transport;
  if (entry.url) {
    return entry.url.includes("/sse") ? "sse" : "http";
  }
  return "stdio";
}

function isValidServer(value: unknown): value is McpServerConfig {
  if (!value || typeof value !== "object") return false;
  const server = value as Partial<McpServerConfig>;
  return (
    typeof server.id === "string" &&
    typeof server.name === "string" &&
    typeof server.transport === "string" &&
    typeof server.createdAt === "number" &&
    typeof server.updatedAt === "number"
  );
}

export function loadServers(): McpServerConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MCP_SERVERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidServer).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveServers(servers: McpServerConfig[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MCP_SERVERS_STORAGE_KEY, JSON.stringify(servers));
  } catch {
    // ignore quota / private mode errors
  }
}

export function createEmptyServer(
  overrides?: Partial<McpServerFormValues>,
): McpServerConfig {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: "새 MCP 서버",
    transport: "stdio",
    command: "",
    args: [],
    env: {},
    url: "",
    headers: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function exportServers(servers: McpServerConfig[]): string {
  const mcpServers: ClaudeDesktopExport["mcpServers"] = {};

  for (const server of servers) {
    const entry: ClaudeDesktopServerEntry = { transport: server.transport };

    if (server.transport === "stdio") {
      entry.command = server.command ?? "";
      entry.args = server.args ?? [];
      if (server.env && Object.keys(server.env).length > 0) {
        entry.env = server.env;
      }
    } else {
      entry.url = server.url ?? "";
      if (server.headers && Object.keys(server.headers).length > 0) {
        entry.headers = server.headers;
      }
    }

    mcpServers[server.name] = entry;
  }

  return JSON.stringify({ mcpServers }, null, 2);
}

export function importServers(
  json: string,
  existing: McpServerConfig[],
): { servers: McpServerConfig[]; error?: string } {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return { servers: existing, error: "유효하지 않은 JSON 형식입니다." };
    }

    const payload = parsed as Partial<ClaudeDesktopExport> & {
      servers?: McpServerConfig[];
    };

    const imported: McpServerConfig[] = [];

    if (Array.isArray(payload.servers)) {
      for (const item of payload.servers) {
        if (!isValidServer(item)) continue;
        imported.push(item);
      }
    }

    if (payload.mcpServers && typeof payload.mcpServers === "object") {
      for (const [name, entry] of Object.entries(payload.mcpServers)) {
        if (!entry || typeof entry !== "object") continue;
        const transport = inferTransport(entry);
        const now = Date.now();
        imported.push({
          id: crypto.randomUUID(),
          name,
          transport,
          command: entry.command ?? "",
          args: entry.args ?? [],
          env: entry.env ?? {},
          url: entry.url ?? "",
          headers: entry.headers ?? {},
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (imported.length === 0) {
      return {
        servers: existing,
        error: "가져올 MCP 서버 설정을 찾지 못했습니다.",
      };
    }

    const existingNames = new Set(existing.map((s) => s.name));
    const merged = [...existing];

    for (const server of imported) {
      let uniqueName = server.name;
      let suffix = 1;
      while (existingNames.has(uniqueName)) {
        uniqueName = `${server.name} (${suffix})`;
        suffix += 1;
      }
      existingNames.add(uniqueName);
      merged.unshift({ ...server, name: uniqueName });
    }

    return { servers: merged.sort((a, b) => b.updatedAt - a.updatedAt) };
  } catch {
    return { servers: existing, error: "JSON 파싱에 실패했습니다." };
  }
}

export function downloadServersExport(servers: McpServerConfig[]): void {
  const blob = new Blob([exportServers(servers)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "mcp-servers.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
