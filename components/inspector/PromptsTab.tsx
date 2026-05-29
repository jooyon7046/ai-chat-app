"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { JsonResult } from "@/components/inspector/JsonResult";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { McpPrompt, McpTestResult } from "@/lib/mcp/types";
import { cn } from "@/lib/utils";

type PromptsTabProps = {
  prompts: McpPrompt[];
  onTest: (
    promptName: string,
    args: Record<string, string>,
  ) => Promise<McpTestResult>;
};

export function PromptsTab({ prompts, onTest }: PromptsTabProps) {
  const [selectedName, setSelectedName] = useState<string | null>(
    prompts[0]?.name ?? null,
  );
  const [argValues, setArgValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<McpTestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const selected = prompts.find((item) => item.name === selectedName) ?? null;

  const handleSelect = (name: string) => {
    setSelectedName(name);
    setArgValues({});
    setResult(null);
  };

  const handleRun = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const response = await onTest(selected.name, argValues);
      setResult(response);
    } finally {
      setLoading(false);
    }
  };

  if (prompts.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        사용 가능한 Prompt가 없습니다.
      </p>
    );
  }

  return (
    <div className="grid min-h-80 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <ScrollArea className="h-80 rounded-lg border">
        <ul className="p-1" role="list">
          {prompts.map((prompt) => (
            <li key={prompt.name}>
              <button
                type="button"
                onClick={() => handleSelect(prompt.name)}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left transition-colors",
                  selectedName === prompt.name
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/60",
                )}
              >
                <span className="block text-sm font-medium">{prompt.name}</span>
                {prompt.description && (
                  <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">
                    {prompt.description}
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

            {(selected.arguments ?? []).length > 0 ? (
              <div className="grid gap-3">
                {(selected.arguments ?? []).map((arg) => (
                  <div key={arg.name} className="grid gap-1.5">
                    <Label htmlFor={`prompt-arg-${arg.name}`}>
                      {arg.name}
                      {arg.required ? " *" : ""}
                    </Label>
                    <Input
                      id={`prompt-arg-${arg.name}`}
                      value={argValues[arg.name] ?? ""}
                      onChange={(e) =>
                        setArgValues((prev) => ({
                          ...prev,
                          [arg.name]: e.target.value,
                        }))
                      }
                      placeholder={arg.description}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                이 Prompt는 인자가 필요하지 않습니다.
              </p>
            )}

            <Button onClick={handleRun} disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Play className="size-4" aria-hidden />
              )}
              Prompt 실행
            </Button>

            <JsonResult
              value={result?.ok ? result.data : undefined}
              error={result?.ok ? undefined : result?.error}
              durationMs={result?.durationMs}
            />
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Prompt를 선택하세요.
          </p>
        )}
      </div>
    </div>
  );
}
