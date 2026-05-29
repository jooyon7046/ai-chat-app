type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  default?: unknown;
  examples?: unknown[];
  items?: JsonSchema;
};

function resolveSchemaType(schema: JsonSchema): string | undefined {
  if (typeof schema.type === "string") {
    return schema.type.toLowerCase();
  }

  if (Array.isArray(schema.type)) {
    return schema.type.find((value) => value !== "null")?.toLowerCase();
  }

  return undefined;
}

function defaultValueForProperty(
  name: string,
  schema: JsonSchema,
): unknown {
  if (schema.default !== undefined) {
    return schema.default;
  }

  if (Array.isArray(schema.examples) && schema.examples.length > 0) {
    return schema.examples[0];
  }

  const type = resolveSchemaType(schema);

  switch (type) {
    case "string":
      return "";
    case "number":
    case "integer":
      if (/lat/i.test(name)) return 37.5665;
      if (/lon/i.test(name)) return 126.978;
      return 0;
    case "boolean":
      return false;
    case "array":
      return [];
    case "object":
      return buildDefaultToolArgs(schema as Record<string, unknown>);
    default:
      return null;
  }
}

export function buildDefaultToolArgs(
  inputSchema?: Record<string, unknown>,
): Record<string, unknown> {
  if (!inputSchema || typeof inputSchema !== "object") {
    return {};
  }

  const schema = inputSchema as JsonSchema;
  if (schema.type !== "object" || !schema.properties) {
    return {};
  }

  const required = new Set(schema.required ?? []);
  const result: Record<string, unknown> = {};

  for (const [key, propertySchema] of Object.entries(schema.properties)) {
    if (required.has(key)) {
      result[key] = defaultValueForProperty(key, propertySchema);
    }
  }

  return result;
}

export function formatToolArgsJson(
  inputSchema?: Record<string, unknown>,
): string {
  return JSON.stringify(buildDefaultToolArgs(inputSchema), null, 2);
}

export function validateToolArgs(
  inputSchema: Record<string, unknown> | undefined,
  args: Record<string, unknown>,
): string | null {
  if (!inputSchema || typeof inputSchema !== "object") {
    return null;
  }

  const schema = inputSchema as JsonSchema;
  if (schema.type !== "object" || !schema.properties) {
    return null;
  }

  const required = schema.required ?? [];
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const key of required) {
    const value = args[key];
    const propertySchema = schema.properties[key];

    if (value === undefined || value === null) {
      missing.push(key);
      continue;
    }

    const type = propertySchema ? resolveSchemaType(propertySchema) : undefined;

    if (type === "number" || type === "integer") {
      if (typeof value !== "number" || Number.isNaN(value)) {
        invalid.push(`${key} (number)`);
      }
      continue;
    }

    if (type === "string" && typeof value !== "string") {
      invalid.push(`${key} (string)`);
      continue;
    }

    if (type === "boolean" && typeof value !== "boolean") {
      invalid.push(`${key} (boolean)`);
    }
  }

  if (missing.length > 0) {
    return `필수 인자가 없습니다: ${missing.join(", ")}`;
  }

  if (invalid.length > 0) {
    return `인자 타입이 올바르지 않습니다: ${invalid.join(", ")}`;
  }

  return null;
}
