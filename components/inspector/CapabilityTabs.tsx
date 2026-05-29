"use client";

import { PromptsTab } from "@/components/inspector/PromptsTab";
import { ResourcesTab } from "@/components/inspector/ResourcesTab";
import { ToolsTab } from "@/components/inspector/ToolsTab";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { McpCapabilities, McpTestResult } from "@/lib/mcp/types";

type CapabilityTabsProps = {
  connected: boolean;
  capabilities?: McpCapabilities;
  onTestPrompt: (
    promptName: string,
    args: Record<string, string>,
  ) => Promise<McpTestResult>;
  onTestResource: (uri: string) => Promise<McpTestResult>;
  onTestTool: (
    toolName: string,
    args: Record<string, unknown>,
  ) => Promise<McpTestResult>;
};

export function CapabilityTabs({
  connected,
  capabilities,
  onTestPrompt,
  onTestResource,
  onTestTool,
}: CapabilityTabsProps) {
  if (!connected) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>Capabilities</CardTitle>
          <CardDescription>
            서버에 연결하면 Prompt, Resource, Tool을 조회하고 테스트할 수
            있습니다.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const prompts = capabilities?.prompts ?? [];
  const resources = capabilities?.resources ?? [];
  const tools = capabilities?.tools ?? [];

  return (
    <Card size="sm" className="min-h-0 flex-1">
      <CardHeader className="pb-2">
        <CardTitle>Capabilities</CardTitle>
        <CardDescription>
          Prompts {prompts.length} · Resources {resources.length} · Tools{" "}
          {tools.length}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="prompts">
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>
          <TabsContent value="prompts" className="mt-4">
            <PromptsTab prompts={prompts} onTest={onTestPrompt} />
          </TabsContent>
          <TabsContent value="resources" className="mt-4">
            <ResourcesTab resources={resources} onTest={onTestResource} />
          </TabsContent>
          <TabsContent value="tools" className="mt-4">
            <ToolsTab tools={tools} onTest={onTestTool} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
