import { Bot, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AssistantMessage, UserMessage } from "@/lib/types";
import { Markdown } from "./Markdown";

type MessageBubbleProps = {
  message: UserMessage | AssistantMessage;
  isStreaming?: boolean;
};

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const showCursor =
    !isUser && isStreaming && message.content.length > 0;

  return (
    <article
      className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
      aria-label={isUser ? "사용자 메시지" : "AI 메시지"}
    >
      <Avatar size="sm">
        <AvatarFallback
          className={cn(
            isUser
              ? "bg-secondary text-secondary-foreground"
              : "bg-primary text-primary-foreground",
          )}
        >
          {isUser ? (
            <User className="size-3.5" aria-hidden />
          ) : (
            <Bot className="size-3.5" aria-hidden />
          )}
        </AvatarFallback>
      </Avatar>
      <Card
        size="sm"
        className={cn(
          "max-w-[min(85%,42rem)] py-0 ring-0",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        <CardContent className="px-4 py-2.5">
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          ) : message.content.length > 0 ? (
            <div className="flex items-end gap-0.5">
              <Markdown>{message.content}</Markdown>
              {showCursor && (
                <span
                  className="mb-1 inline-block h-4 w-0.5 shrink-0 animate-pulse bg-foreground align-bottom"
                  aria-hidden
                />
              )}
            </div>
          ) : null}
          {!isUser && isStreaming && message.content.length === 0 && (
            <span
              className="inline-flex gap-1 py-1"
              aria-label="응답 생성 중"
            >
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
            </span>
          )}
        </CardContent>
      </Card>
    </article>
  );
}
