"use client";

import { Send, Square } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type ChatInputProps = {
  onSend: (text: string) => void;
  onStop?: () => void;
  isStreaming?: boolean;
};

export function ChatInput({ onSend, onStop, isStreaming }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue("");
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
    }
  }, [value, isStreaming, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="shrink-0 bg-background">
      <Separator />
      <form
        className="mx-auto flex max-w-3xl items-end gap-2 px-4 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (isStreaming) {
            onStop?.();
          } else {
            handleSubmit();
          }
        }}
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            rows={1}
            placeholder="메시지를 입력하세요…"
            aria-label="메시지 입력"
            className="min-h-11 max-h-40 resize-none rounded-xl"
          />
          <p className="px-1 text-xs text-muted-foreground">
            Enter로 전송 · Shift+Enter로 줄바꿈 ·{" "}
            <span className="font-mono">/</span> 는 Prompt 전용
          </p>
        </div>
        {isStreaming ? (
          <Button
            type="submit"
            variant="outline"
            size="icon-lg"
            aria-label="응답 중지"
            className="shrink-0 rounded-xl"
          >
            <Square className="size-4 fill-current" aria-hidden />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon-lg"
            disabled={!value.trim()}
            aria-label="메시지 전송"
            className="shrink-0 rounded-xl"
          >
            <Send className="size-4" aria-hidden />
          </Button>
        )}
      </form>
    </div>
  );
}
