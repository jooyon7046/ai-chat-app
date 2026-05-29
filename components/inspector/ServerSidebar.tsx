"use client";

import { useRef, useState } from "react";
import {
  Download,
  Pencil,
  Plus,
  Server,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ServerFormDialog } from "@/components/inspector/ServerFormDialog";
import { downloadServersExport } from "@/lib/mcp/servers-storage";
import type {
  ConnectionStatus,
  McpServerConfig,
  McpServerFormValues,
  ServerRuntimeState,
} from "@/lib/mcp/types";
import { TRANSPORT_LABELS } from "@/lib/mcp/types";
import { cn } from "@/lib/utils";

type ServerSidebarProps = {
  servers: McpServerConfig[];
  activeServerId: string | null;
  getRuntime: (id: string) => ServerRuntimeState;
  onSelect: (id: string) => void;
  onAdd: (values: McpServerFormValues) => void | Promise<unknown>;
  onUpdate: (id: string, values: McpServerFormValues) => void | Promise<unknown>;
  onDelete: (id: string) => void | Promise<unknown>;
  onImport: (json: string) => boolean | Promise<boolean>;
  importError?: string | null;
  onClearImportError?: () => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
};

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  disconnected: "bg-muted-foreground/40",
  connecting: "bg-amber-500 animate-pulse",
  connected: "bg-emerald-500",
  error: "bg-destructive",
};

function SidebarContent({
  servers,
  activeServerId,
  getRuntime,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
  onImport,
  importError,
  onClearImportError,
  onItemSelect,
}: ServerSidebarProps & { onItemSelect?: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editingServer, setEditingServer] = useState<McpServerConfig | null>(
    null,
  );

  const openAddDialog = () => {
    setEditingServer(null);
    setFormKey((key) => key + 1);
    setFormOpen(true);
  };

  const openEditDialog = (server: McpServerConfig) => {
    setEditingServer(server);
    setFormKey((key) => key + 1);
    setFormOpen(true);
  };

  const handleSelect = (id: string) => {
    onSelect(id);
    onItemSelect?.();
  };

  const handleImportClick = () => {
    onClearImportError?.();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const text = await file.text();
    void onImport(text);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 p-3">
        <Button
          className="w-full justify-start gap-2"
          onClick={openAddDialog}
        >
          <Plus className="size-4" aria-hidden />
          서버 추가
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleImportClick}
          >
            <Upload className="size-3.5" aria-hidden />
            가져오기
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={servers.length === 0}
            onClick={() => downloadServersExport(servers)}
          >
            <Download className="size-3.5" aria-hidden />
            내보내기
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFileChange}
        />
        {importError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
            {importError}
          </p>
        )}
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-2 py-2">
        {servers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-2 py-10 text-center">
            <Server className="size-8 text-muted-foreground/60" aria-hidden />
            <p className="text-xs text-muted-foreground">
              등록된 MCP 서버가 없습니다
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5" role="list">
            {servers.map((server) => {
              const runtime = getRuntime(server.id);
              const isActive = server.id === activeServerId;
              return (
                <li key={server.id}>
                  <div
                    className={cn(
                      "group flex items-center gap-1 rounded-lg pr-1 transition-colors",
                      isActive ? "bg-accent" : "hover:bg-muted/60",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(server.id)}
                      className="min-w-0 flex-1 px-3 py-2.5 text-left"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            STATUS_COLORS[runtime.status],
                          )}
                          aria-hidden
                        />
                        <span
                          className={cn(
                            "truncate text-sm",
                            isActive
                              ? "font-medium text-foreground"
                              : "text-foreground/90",
                          )}
                        >
                          {server.name}
                        </span>
                      </span>
                      <span className="mt-0.5 block pl-4 text-xs text-muted-foreground">
                        {TRANSPORT_LABELS[server.transport]}
                      </span>
                    </button>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                            aria-label={`${server.name} 편집`}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(server);
                            }}
                          >
                            <Pencil className="size-3.5" aria-hidden />
                          </Button>
                        }
                      />
                      <TooltipContent side="right">편집</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                            aria-label={`${server.name} 삭제`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(server.id);
                            }}
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                          </Button>
                        }
                      />
                      <TooltipContent side="right">삭제</TooltipContent>
                    </Tooltip>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>

      <ServerFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editingServer}
        onSubmit={(values) => {
          if (editingServer) {
            onUpdate(editingServer.id, values);
          } else {
            onAdd(values);
          }
        }}
      />
    </div>
  );
}

export function ServerSidebar({
  mobileOpen = false,
  onMobileOpenChange,
  ...props
}: ServerSidebarProps) {
  return (
    <>
      <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-border bg-muted/30 md:flex">
        <SidebarContent {...props} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[min(85vw,18rem)] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>MCP 서버 목록</SheetTitle>
          </SheetHeader>
          <SidebarContent
            {...props}
            onItemSelect={() => onMobileOpenChange?.(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
