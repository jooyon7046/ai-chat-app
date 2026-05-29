"use client";

import { Loader2, Plug, PlugZap, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { McpServerConfig, ServerRuntimeState } from "@/lib/mcp/types";
import { TRANSPORT_LABELS } from "@/lib/mcp/types";

type ConnectionPanelProps = {
  server: McpServerConfig | null;
  runtime: ServerRuntimeState;
  onConnect: () => void;
  onDisconnect: () => void;
};

const STATUS_LABELS: Record<ServerRuntimeState["status"], string> = {
  disconnected: "연결 안 됨",
  connecting: "연결 중…",
  connected: "연결됨",
  error: "오류",
};

const STATUS_VARIANT: Record<
  ServerRuntimeState["status"],
  "secondary" | "default" | "destructive"
> = {
  disconnected: "secondary",
  connecting: "secondary",
  connected: "default",
  error: "destructive",
};

export function ConnectionPanel({
  server,
  runtime,
  onConnect,
  onDisconnect,
}: ConnectionPanelProps) {
  if (!server) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>서버 연결</CardTitle>
          <CardDescription>
            좌측에서 MCP 서버를 선택하거나 새로 추가하세요.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isConnecting = runtime.status === "connecting";
  const isConnected = runtime.status === "connected";

  return (
    <Card size="sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{server.name}</CardTitle>
            <CardDescription>
              {TRANSPORT_LABELS[server.transport]} · Inspector mock 연결
            </CardDescription>
          </div>
          <Badge variant={STATUS_VARIANT[runtime.status]}>
            {STATUS_LABELS[runtime.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-2 text-xs sm:grid-cols-2">
          {server.transport === "stdio" ? (
            <>
              <div>
                <dt className="text-muted-foreground">Command</dt>
                <dd className="mt-0.5 font-mono break-all">
                  {server.command || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Args</dt>
                <dd className="mt-0.5 font-mono break-all">
                  {(server.args ?? []).join(" ") || "—"}
                </dd>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">URL</dt>
              <dd className="mt-0.5 font-mono break-all">{server.url || "—"}</dd>
            </div>
          )}
        </dl>

        {runtime.error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {runtime.error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {isConnected ? (
            <Button variant="outline" onClick={onDisconnect}>
              <Plug className="size-4" aria-hidden />
              연결 해제
            </Button>
          ) : (
            <Button onClick={onConnect} disabled={isConnecting}>
              {isConnecting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : runtime.status === "error" ? (
                <RefreshCw className="size-4" aria-hidden />
              ) : (
                <PlugZap className="size-4" aria-hidden />
              )}
              {isConnecting
                ? "연결 중…"
                : runtime.status === "error"
                  ? "재시도"
                  : "연결"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
