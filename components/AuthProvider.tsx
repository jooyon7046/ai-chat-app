"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AUTH_ERROR_MESSAGE } from "@/lib/supabase/client-auth";
import { ensureAnonymousUser } from "@/lib/supabase/ensure-anonymous-auth";

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    void ensureAnonymousUser(supabase).then((user) => {
      if (cancelled) return;
      if (user) {
        setReady(true);
        return;
      }
      setError(AUTH_ERROR_MESSAGE);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">인증 준비 중…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-background p-4">
        <p className="max-w-md text-center text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return children;
}
