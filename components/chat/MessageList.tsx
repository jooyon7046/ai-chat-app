"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message } from "@/lib/types";
import { isAssistantMessage, isToolMessage } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { ToolCallCard } from "./ToolCallCard";

type MessageListProps = {
  messages: Message[];
  isStreaming: boolean;
};

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  return (
    <ScrollArea
      className="flex-1"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="채팅 메시지"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;
          const isStreamingThis =
            isStreaming &&
            isLast &&
            isAssistantMessage(message);

          if (isToolMessage(message)) {
            return <ToolCallCard key={message.id} message={message} />;
          }

          return (
            <MessageBubble
              key={message.id}
              message={message}
              isStreaming={isStreamingThis}
            />
          );
        })}
        <div ref={bottomRef} aria-hidden />
      </div>
    </ScrollArea>
  );
}
