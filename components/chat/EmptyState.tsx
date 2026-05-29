import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SUGGESTED_PROMPTS,
  WELCOME_DESCRIPTION,
  WELCOME_TITLE,
} from "@/lib/mock-responses";

type EmptyStateProps = {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
};

export function EmptyState({ onSelectPrompt, disabled }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Card className="mx-auto w-full max-w-lg border-none bg-transparent py-0 shadow-none ring-0">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-muted">
            <Sparkles
              className="size-6 text-muted-foreground"
              aria-hidden
            />
          </div>
          <CardTitle className="text-xl">{WELCOME_TITLE}</CardTitle>
          <CardDescription className="max-w-md text-center">
            {WELCOME_DESCRIPTION}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <Button
                key={prompt}
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() => onSelectPrompt(prompt)}
                className="h-auto justify-start px-4 py-3 text-left text-sm font-normal whitespace-normal"
              >
                {prompt}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
