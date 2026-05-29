"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { JsonResult } from "@/components/inspector/JsonResult";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { McpResource, McpTestResult } from "@/lib/mcp/types";
import { cn } from "@/lib/utils";

type ResourcesTabProps = {
  resources: McpResource[];
  onTest: (uri: string) => Promise<McpTestResult>;
};

export function ResourcesTab({ resources, onTest }: ResourcesTabProps) {
  const [selectedUri, setSelectedUri] = useState<string | null>(
    resources[0]?.uri ?? null,
  );
  const [result, setResult] = useState<McpTestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const selected =
    resources.find((item) => item.uri === selectedUri) ?? null;

  const handleRun = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const response = await onTest(selected.uri);
      setResult(response);
    } finally {
      setLoading(false);
    }
  };

  if (resources.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        사용 가능한 Resource가 없습니다.
      </p>
    );
  }

  return (
    <div className="grid min-h-80 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <ScrollArea className="h-80 rounded-lg border">
        <ul className="p-1" role="list">
          {resources.map((resource) => (
            <li key={resource.uri}>
              <button
                type="button"
                onClick={() => {
                  setSelectedUri(resource.uri);
                  setResult(null);
                }}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left transition-colors",
                  selectedUri === resource.uri
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/60",
                )}
              >
                <span className="block text-sm font-medium">{resource.name}</span>
                <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
                  {resource.uri}
                </span>
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
              <p className="mt-1 font-mono text-xs text-muted-foreground break-all">
                {selected.uri}
              </p>
              {selected.mimeType && (
                <p className="mt-1 text-xs text-muted-foreground">
                  MIME: {selected.mimeType}
                </p>
              )}
              {selected.description && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {selected.description}
                </p>
              )}
            </div>

            <Button onClick={handleRun} disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Play className="size-4" aria-hidden />
              )}
              Resource 읽기
            </Button>

            <JsonResult
              value={result?.ok ? result.data : undefined}
              error={result?.ok ? undefined : result?.error}
              durationMs={result?.durationMs}
            />
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Resource를 선택하세요.
          </p>
        )}
      </div>
    </div>
  );
}
