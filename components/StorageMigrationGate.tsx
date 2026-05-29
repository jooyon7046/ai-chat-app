"use client";

import { useEffect, useState } from "react";
import { importLocalStorageIfNeeded } from "@/lib/migration/import-local-storage";

type StorageMigrationGateProps = {
  children: React.ReactNode;
  onMigrated?: () => void;
};

export function StorageMigrationGate({
  children,
  onMigrated,
}: StorageMigrationGateProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void importLocalStorageIfNeeded()
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          setError(result.error);
        } else if (result.imported) {
          onMigrated?.();
        }
        setReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "localStorage 데이터를 가져오지 못했습니다.",
        );
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [onMigrated]);

  if (!ready) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">데이터 동기화 중…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-2 bg-background p-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <p className="text-xs text-muted-foreground">
          브라우저 localStorage 데이터는 유지됩니다. 새로고침 후 다시 시도해
          주세요.
        </p>
        {children}
      </div>
    );
  }

  return children;
}
