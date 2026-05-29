import Link from "next/link";
import { Menu, MessageSquare, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type InspectorHeaderProps = {
  onMenuOpen?: () => void;
};

export function InspectorHeader({ onMenuOpen }: InspectorHeaderProps) {
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
              aria-label="서버 목록 열기"
              onClick={onMenuOpen}
            >
              <Menu className="size-5" aria-hidden />
            </Button>
          )}
          <Avatar className="rounded-lg after:rounded-lg">
            <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
              <Search className="size-4" aria-hidden />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-sm font-semibold leading-none">MCP Inspector</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              서버 관리 · 조회 · 테스트
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            nativeButton={false}
            render={<Link href="/" />}
          >
            <MessageSquare className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Chat</span>
          </Button>
          <Button
            variant="secondary"
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
      <Separator />
    </header>
  );
}
