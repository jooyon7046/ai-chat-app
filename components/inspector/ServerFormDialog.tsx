"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { McpServerConfig, McpServerFormValues } from "@/lib/mcp/types";
import { TRANSPORT_LABELS } from "@/lib/mcp/types";

type ServerFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: McpServerConfig | null;
  onSubmit: (values: McpServerFormValues) => void;
};

function parseKeyValueLines(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

function formatKeyValueLines(record?: Record<string, string>): string {
  if (!record) return "";
  return Object.entries(record)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function toFormState(server?: McpServerConfig | null): McpServerFormValues {
  return {
    name: server?.name ?? "새 MCP 서버",
    transport: server?.transport ?? "stdio",
    command: server?.command ?? "",
    args: server?.args ?? [],
    env: server?.env ?? {},
    url: server?.url ?? "",
    headers: server?.headers ?? {},
  };
}

export function ServerFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: ServerFormDialogProps) {
  const [form, setForm] = useState<McpServerFormValues>(() => toFormState(initial));
  const [argsText, setArgsText] = useState(() =>
    (toFormState(initial).args ?? []).join("\n"),
  );
  const [envText, setEnvText] = useState(() =>
    formatKeyValueLines(toFormState(initial).env),
  );
  const [headersText, setHeadersText] = useState(() =>
    formatKeyValueLines(toFormState(initial).headers),
  );

  const handleSubmit = () => {
    onSubmit({
      ...form,
      args: argsText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      env: parseKeyValueLines(envText),
      headers: parseKeyValueLines(headersText),
    });
    onOpenChange(false);
  };

  const isRemote = form.transport === "sse" || form.transport === "http";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "서버 편집" : "MCP 서버 추가"}</DialogTitle>
          <DialogDescription>
            MCP Inspector에서 테스트할 서버 설정을 입력하세요. (현재는 mock
            연결)
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label htmlFor="server-name">이름</Label>
            <Input
              id="server-name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="예: filesystem"
            />
          </div>

          <div className="grid gap-2">
            <Label>Transport</Label>
            <Select
              value={form.transport}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  transport: value as McpServerFormValues["transport"],
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRANSPORT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isRemote ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="server-command">Command</Label>
                <Input
                  id="server-command"
                  value={form.command ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, command: e.target.value }))
                  }
                  placeholder="예: npx"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="server-args">Args (줄바꿈 구분)</Label>
                <Textarea
                  id="server-args"
                  value={argsText}
                  onChange={(e) => setArgsText(e.target.value)}
                  placeholder={"-y\n@modelcontextprotocol/server-filesystem\n/path"}
                  rows={4}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="server-env">Env (KEY=VALUE, 줄바꿈 구분)</Label>
                <Textarea
                  id="server-env"
                  value={envText}
                  onChange={(e) => setEnvText(e.target.value)}
                  placeholder={"API_KEY=your-key"}
                  rows={3}
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="server-url">URL</Label>
                <Input
                  id="server-url"
                  value={form.url ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, url: e.target.value }))
                  }
                  placeholder={
                    form.transport === "sse"
                      ? "https://example.com/mcp/sse"
                      : "https://example.com/mcp"
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="server-headers">
                  Headers (KEY=VALUE, 줄바꿈 구분)
                </Label>
                <Textarea
                  id="server-headers"
                  value={headersText}
                  onChange={(e) => setHeadersText(e.target.value)}
                  placeholder={"Authorization=Bearer token"}
                  rows={3}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!form.name.trim()}>
            {initial ? "저장" : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
