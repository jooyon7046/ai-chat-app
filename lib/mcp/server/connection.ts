import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  getDefaultEnvironment,
  StdioClientTransport,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { McpProxyError } from "@/lib/mcp/server/errors";
import type {
  McpCapabilities,
  McpServerConfig,
  McpTestResult,
} from "@/lib/mcp/types";

const CLIENT_INFO = { name: "mcp-inspector", version: "0.1.0" };
const CONNECT_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 60_000;

export type LiveConnection = {
  client: Client;
  transport: Transport;
};

function buildTransport(config: McpServerConfig): Transport {
  if (config.transport === "stdio") {
    const command = config.command?.trim();
    if (!command) {
      throw new McpProxyError(
        "BAD_REQUEST",
        "STDIO transport에는 command가 필요합니다.",
      );
    }
    return new StdioClientTransport({
      command,
      args: config.args ?? [],
      env: { ...getDefaultEnvironment(), ...(config.env ?? {}) },
    });
  }

  const url = config.url?.trim();
  if (!url) {
    throw new McpProxyError("BAD_REQUEST", "원격 transport에는 URL이 필요합니다.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new McpProxyError("BAD_REQUEST", "URL 형식이 올바르지 않습니다.");
  }

  const headers = config.headers ?? {};
  const hasHeaders = Object.keys(headers).length > 0;
  const requestInit: RequestInit | undefined = hasHeaders
    ? { headers: new Headers(headers) }
    : undefined;

  if (config.transport === "sse") {
    return new SSEClientTransport(parsedUrl, { requestInit });
  }

  return new StreamableHTTPClientTransport(parsedUrl, { requestInit });
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new McpProxyError("TIMEOUT", `${label} 시간이 초과되었습니다.`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function listCapabilities(client: Client): Promise<McpCapabilities> {
  const serverCapabilities = client.getServerCapabilities();
  const result: McpCapabilities = { prompts: [], resources: [], tools: [] };

  if (serverCapabilities?.tools) {
    try {
      let cursor: string | undefined;
      do {
        const page = await client.listTools({ cursor });
        result.tools.push(
          ...page.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema as Record<string, unknown>,
          })),
        );
        cursor = page.nextCursor;
      } while (cursor);
    } catch {
      // server advertised tools but listing failed; keep empty
    }
  }

  if (serverCapabilities?.prompts) {
    try {
      let cursor: string | undefined;
      do {
        const page = await client.listPrompts({ cursor });
        result.prompts.push(
          ...page.prompts.map((prompt) => ({
            name: prompt.name,
            description: prompt.description,
            arguments: prompt.arguments?.map((arg) => ({
              name: arg.name,
              description: arg.description,
              required: arg.required,
            })),
          })),
        );
        cursor = page.nextCursor;
      } while (cursor);
    } catch {
      // ignore
    }
  }

  if (serverCapabilities?.resources) {
    try {
      let cursor: string | undefined;
      do {
        const page = await client.listResources({ cursor });
        result.resources.push(
          ...page.resources.map((resource) => ({
            uri: resource.uri,
            name: resource.name,
            mimeType: resource.mimeType,
            description: resource.description,
          })),
        );
        cursor = page.nextCursor;
      } while (cursor);
    } catch {
      // ignore
    }
  }

  return result;
}

export async function connectClient(config: McpServerConfig): Promise<{
  connection: LiveConnection;
  capabilities: McpCapabilities;
}> {
  const transport = buildTransport(config);
  const client = new Client(CLIENT_INFO, { capabilities: {} });

  try {
    await withTimeout(client.connect(transport), CONNECT_TIMEOUT_MS, "연결");
  } catch (error) {
    try {
      await client.close();
    } catch {
      // ignore close failure during connect error
    }
    throw error;
  }

  const capabilities = await listCapabilities(client);
  return { connection: { client, transport }, capabilities };
}

export async function callTool(
  connection: LiveConnection,
  name: string,
  args: Record<string, unknown>,
): Promise<McpTestResult> {
  const started = performance.now();
  const result = await connection.client.callTool(
    { name, arguments: args },
    undefined,
    { timeout: REQUEST_TIMEOUT_MS },
  );
  const durationMs = Math.round(performance.now() - started);

  const isError = "isError" in result && result.isError === true;
  return {
    ok: !isError,
    data: result,
    error: isError ? extractText(result) : undefined,
    durationMs,
  };
}

export async function getPrompt(
  connection: LiveConnection,
  name: string,
  args: Record<string, string>,
): Promise<McpTestResult> {
  const started = performance.now();
  const result = await connection.client.getPrompt(
    { name, arguments: args },
    { timeout: REQUEST_TIMEOUT_MS },
  );
  return {
    ok: true,
    data: result,
    durationMs: Math.round(performance.now() - started),
  };
}

export async function readResource(
  connection: LiveConnection,
  uri: string,
): Promise<McpTestResult> {
  const started = performance.now();
  const result = await connection.client.readResource(
    { uri },
    { timeout: REQUEST_TIMEOUT_MS },
  );
  return {
    ok: true,
    data: result,
    durationMs: Math.round(performance.now() - started),
  };
}

function extractText(result: Record<string, unknown>): string {
  const content = result.content;
  if (Array.isArray(content)) {
    const text = content
      .filter(
        (block): block is { type: "text"; text: string } =>
          typeof block === "object" &&
          block !== null &&
          (block as { type?: unknown }).type === "text",
      )
      .map((block) => block.text)
      .join("\n");
    if (text) return text;
  }
  return "Tool 실행 중 오류가 발생했습니다.";
}
