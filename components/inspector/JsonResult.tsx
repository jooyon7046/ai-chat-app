"use client";

import { useMemo } from "react";

type JsonResultProps = {
  value: unknown;
  error?: string;
  durationMs?: number;
  emptyMessage?: string;
};

export function JsonResult({
  value,
  error,
  durationMs,
  emptyMessage = "실행 결과가 여기에 표시됩니다.",
}: JsonResultProps) {
  const formatted = useMemo(() => {
    if (error) return error;
    if (value === undefined || value === null) return null;
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
  }, [error, value]);

  return (
    <div className="space-y-2">
      {durationMs !== undefined && (
        <p className="text-xs text-muted-foreground">응답 시간: {durationMs}ms</p>
      )}
      <pre className="max-h-80 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
        {formatted ?? emptyMessage}
      </pre>
    </div>
  );
}
