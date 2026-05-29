export type McpTransportType = "stdio" | "sse" | "http";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type McpServerConfig = {
  id: string;
  name: string;
  transport: McpTransportType;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
};

export type McpPromptArgument = {
  name: string;
  description?: string;
  required?: boolean;
};

export type McpPrompt = {
  name: string;
  description?: string;
  arguments?: McpPromptArgument[];
};

export type McpResource = {
  uri: string;
  name: string;
  mimeType?: string;
  description?: string;
};

export type McpTool = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
};

export type McpCapabilities = {
  prompts: McpPrompt[];
  resources: McpResource[];
  tools: McpTool[];
};

export type ServerRuntimeState = {
  status: ConnectionStatus;
  error?: string;
  capabilities?: McpCapabilities;
  sessionId?: string;
};

export type McpTestResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
  durationMs: number;
};

export type McpServerFormValues = Omit<
  McpServerConfig,
  "id" | "createdAt" | "updatedAt"
>;

export const TRANSPORT_LABELS: Record<McpTransportType, string> = {
  stdio: "STDIO",
  sse: "SSE",
  http: "Streamable HTTP",
};
