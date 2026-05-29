"use client";

import { PenSquare, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { Session } from "@/lib/types";

type ChatSidebarProps = {
  sessions: Session[];
  activeSessionId: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
};

function formatSessionDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

function SidebarContent({
  sessions,
  activeSessionId,
  onNew,
  onSelect,
  onDelete,
  onItemSelect,
}: ChatSidebarProps & { onItemSelect?: () => void }) {
  const handleNew = () => {
    onNew();
    onItemSelect?.();
  };

  const handleSelect = (id: string) => {
    onSelect(id);
    onItemSelect?.();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button className="w-full justify-start gap-2" onClick={handleNew}>
          <PenSquare className="size-4" aria-hidden />
          새 채팅
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-2 py-2">
        {sessions.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            채팅 기록이 없습니다
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5" role="list">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <li key={session.id}>
                  <div
                    className={cn(
                      "group flex items-center gap-1 rounded-lg pr-1 transition-colors",
                      isActive ? "bg-accent" : "hover:bg-muted/60",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(session.id)}
                      className="min-w-0 flex-1 px-3 py-2.5 text-left"
                    >
                      <span
                        className={cn(
                          "block truncate text-sm",
                          isActive
                            ? "font-medium text-foreground"
                            : "text-foreground/90",
                        )}
                      >
                        {session.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {formatSessionDate(session.updatedAt)}
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
                            aria-label={`${session.title} 삭제`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(session.id);
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
    </div>
  );
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onNew,
  onSelect,
  onDelete,
  mobileOpen = false,
  onMobileOpenChange,
}: ChatSidebarProps) {
  const contentProps = {
    sessions,
    activeSessionId,
    onNew,
    onSelect,
    onDelete,
  };

  return (
    <>
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-border bg-muted/30 md:flex">
        <SidebarContent {...contentProps} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[min(85vw,18rem)] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>채팅 기록</SheetTitle>
          </SheetHeader>
          <SidebarContent
            {...contentProps}
            onItemSelect={() => onMobileOpenChange?.(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
