import Link from "next/link";
import { Bot, Menu, MessageSquare, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MODEL_DISPLAY_NAME } from "@/lib/llm/config";

type ChatHeaderProps = {
  onMenuOpen?: () => void;
};

export function ChatHeader({ onMenuOpen }: ChatHeaderProps) {
  return (
    <header className="shrink-0 bg-background">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {onMenuOpen && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="채팅 기록 열기"
              onClick={onMenuOpen}
            >
              <Menu className="size-5" aria-hidden />
            </Button>
          )}
          <Avatar className="rounded-lg after:rounded-lg">
            <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
              <Bot className="size-4" aria-hidden />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-sm font-semibold leading-none">AI Chat</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              MCP Host & Client
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {MODEL_DISPLAY_NAME}
          </Badge>
          <nav className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5"
              nativeButton={false}
              render={<Link href="/" />}
            >
              <MessageSquare className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Chat</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              nativeButton={false}
              render={<Link href="/inspector" />}
            >
              <Search className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Inspector</span>
            </Button>
          </nav>
        </div>
      </div>
      <Separator />
    </header>
  );
}
