"use client";

import { Wrench } from "lucide-react";
import { JsonResult } from "@/components/inspector/JsonResult";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ToolMessage } from "@/lib/types";

type ToolCallCardProps = {
  message: ToolMessage;
};

export function ToolCallCard({ message }: ToolCallCardProps) {
  const isRunning = message.status === "running";

  return (
    <article
      className="flex justify-center"
      aria-label={`MCP 도구 호출: ${message.toolName}`}
    >
      <Card className="w-full max-w-[min(85%,42rem)] py-0 ring-1 ring-border/60">
        <CardHeader className="gap-2 border-b px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Wrench className="size-4 text-muted-foreground" aria-hidden />
            <CardTitle className="text-sm font-medium">
              {message.serverName} · {message.toolName}
            </CardTitle>
            <Badge
              variant={
                isRunning ? "secondary" : message.ok ? "default" : "destructive"
              }
              className={cn(isRunning && "animate-pulse")}
            >
              {isRunning ? "실행 중" : message.ok ? "성공" : "실패"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-4 py-3">
          <details className="group">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
              인자 보기
            </summary>
            <div className="pt-2">
              <JsonResult value={message.args} emptyMessage="인자가 없습니다." />
            </div>
          </details>

          {!isRunning && (
            <details className="group" open={message.ok}>
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                결과 보기
              </summary>
              <div className="pt-2">
                <JsonResult
                  value={message.result}
                  error={message.error}
                  durationMs={message.durationMs}
                />
              </div>
            </details>
          )}

          {isRunning && (
            <p className="text-xs text-muted-foreground">도구를 실행하는 중…</p>
          )}
        </CardContent>
      </Card>
    </article>
  );
}
