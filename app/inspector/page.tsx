"use client";

import { useCallback, useState } from "react";
import { CapabilityTabs } from "@/components/inspector/CapabilityTabs";
import { ConnectionPanel } from "@/components/inspector/ConnectionPanel";
import { InspectorHeader } from "@/components/inspector/InspectorHeader";
import { ServerSidebar } from "@/components/inspector/ServerSidebar";
import { StorageMigrationGate } from "@/components/StorageMigrationGate";
import { useMcpServers } from "@/hooks/useMcpServers";

export default function InspectorPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const {
    servers,
    activeServerId,
    activeServer,
    activeRuntime,
    hydrated,
    importError,
    reload,
    addServer,
    updateServer,
    deleteServer,
    selectServer,
    connect,
    disconnect,
    importFromJson,
    testPrompt,
    testResource,
    testTool,
    getRuntime,
    clearImportError,
  } = useMcpServers();

  const handleMigrated = useCallback(() => {
    void reload();
  }, [reload]);

  if (!hydrated) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      </div>
    );
  }

  return (
    <StorageMigrationGate onMigrated={handleMigrated}>
      <div className="flex min-h-full flex-1 bg-background">
        <ServerSidebar
          servers={servers}
          activeServerId={activeServerId}
          getRuntime={getRuntime}
          onSelect={selectServer}
          onAdd={addServer}
          onUpdate={updateServer}
          onDelete={deleteServer}
          onImport={importFromJson}
          importError={importError}
          onClearImportError={clearImportError}
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <InspectorHeader onMenuOpen={() => setMobileSidebarOpen(true)} />

          <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            <ConnectionPanel
              server={activeServer}
              runtime={activeRuntime}
              onConnect={() => activeServerId && connect(activeServerId)}
              onDisconnect={() => activeServerId && disconnect(activeServerId)}
            />

            <CapabilityTabs
              connected={activeRuntime.status === "connected"}
              capabilities={activeRuntime.capabilities}
              onTestPrompt={(promptName, args) =>
                activeServerId
                  ? testPrompt(activeServerId, promptName, args)
                  : Promise.resolve({
                      ok: false,
                      error: "서버가 선택되지 않았습니다.",
                      durationMs: 0,
                    })
              }
              onTestResource={(uri) =>
                activeServerId
                  ? testResource(activeServerId, uri)
                  : Promise.resolve({
                      ok: false,
                      error: "서버가 선택되지 않았습니다.",
                      durationMs: 0,
                    })
              }
              onTestTool={(toolName, args) =>
                activeServerId
                  ? testTool(activeServerId, toolName, args)
                  : Promise.resolve({
                      ok: false,
                      error: "서버가 선택되지 않았습니다.",
                      durationMs: 0,
                    })
              }
            />
          </main>
        </div>
      </div>
    </StorageMigrationGate>
  );
}
