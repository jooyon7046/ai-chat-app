"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { JsonResult } from "@/components/inspector/JsonResult";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  formatToolArgsJson,
  validateToolArgs,
} from "@/lib/mcp/tool-args";
import type { McpTestResult, McpTool } from "@/lib/mcp/types";
import { cn } from "@/lib/utils";

type ToolsTabProps = {
  tools: McpTool[];
  onTest: (
    toolName: string,
    args: Record<string, unknown>,
  ) => Promise<McpTestResult>;
};

function getRequiredFields(inputSchema?: Record<string, unknown>): string[] {
  const required = inputSchema?.required;
  return Array.isArray(required)
    ? required.filter((field): field is string => typeof field === "string")
    : [];
}

export function ToolsTab({ tools, onTest }: ToolsTabProps) {
  const [selectedName, setSelectedName] = useState<string | null>(
    tools[0]?.name ?? null,
  );
  const [argsByTool, setArgsByTool] = useState<Record<string, string>>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<McpTestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const effectiveName = selectedName ?? tools[0]?.name ?? null;
  const selected =
    tools.find((item) => item.name === effectiveName) ?? tools[0] ?? null;
  const argsJson =
    selected && effectiveName
      ? (argsByTool[effectiveName] ?? formatToolArgsJson(selected.inputSchema))
      : "{}";

  const handleSelect = (name: string) => {
    const tool = tools.find((item) => item.name === name);
    setSelectedName(name);
    setParseError(null);
    setResult(null);
    setArgsByTool((prev) => ({
      ...prev,
      [name]: prev[name] ?? formatToolArgsJson(tool?.inputSchema),
    }));
  };

  const handleArgsChange = (value: string) => {
    if (!effectiveName) return;
    setArgsByTool((prev) => ({ ...prev, [effectiveName]: value }));
  };

  const handleRun = async () => {
    if (!selected) return;
    setParseError(null);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(argsJson) as Record<string, unknown>;
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("객체 형식의 JSON이 필요합니다.");
      }
    } catch (error) {
      setParseError(
        error instanceof Error ? error.message : "JSON 파싱에 실패했습니다.",
      );
      return;
    }

    const validationError = validateToolArgs(selected.inputSchema, parsed);
    if (validationError) {
      setParseError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await onTest(selected.name, parsed);
      setResult(response);
    } finally {
      setLoading(false);
    }
  };

  if (tools.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        사용 가능한 Tool이 없습니다.
      </p>
    );
  }

  return (
    <div className="grid min-h-80 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <ScrollArea className="h-80 rounded-lg border">
        <ul className="p-1" role="list">
          {tools.map((tool) => (
            <li key={tool.name}>
              <button
                type="button"
                onClick={() => handleSelect(tool.name)}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left transition-colors",
                  effectiveName === tool.name
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/60",
                )}
              >
                <span className="block text-sm font-medium">{tool.name}</span>
                {tool.description && (
                  <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">
                    {tool.description}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </ScrollArea>

      <div className="space-y-4">
        {selected ? (
          <>
            <div>
              <h3 className="text-sm font-medium">{selected.name}</h3>
              {selected.description && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {selected.description}
                </p>
              )}
            </div>

            {selected.inputSchema && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Input Schema
                </p>
                <pre className="max-h-32 overflow-auto rounded-lg border bg-muted/40 p-2 font-mono text-xs">
                  {JSON.stringify(selected.inputSchema, null, 2)}
                </pre>
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Arguments (JSON)
              </p>
              {getRequiredFields(selected.inputSchema).length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    필수: {getRequiredFields(selected.inputSchema).join(", ")}
                  </p>
                )}
              <Textarea
                value={argsJson}
                onChange={(e) => handleArgsChange(e.target.value)}
                rows={5}
                className="font-mono text-xs"
                placeholder='{"latitude": 37.5665, "longitude": 126.978}'
              />
              {parseError && (
                <p className="text-xs text-destructive">{parseError}</p>
              )}
            </div>

            <Button onClick={handleRun} disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Play className="size-4" aria-hidden />
              )}
              Tool 실행
            </Button>

            <JsonResult
              value={result?.ok ? result.data : undefined}
              error={result?.ok ? undefined : result?.error}
              durationMs={result?.durationMs}
            />
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Tool을 선택하세요.
          </p>
        )}
      </div>
    </div>
  );
}
