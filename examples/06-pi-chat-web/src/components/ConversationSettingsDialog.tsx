import { useState } from "react";
import { InfoIcon, Settings2Icon, WrenchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { GlobalToolSettingItem, GlobalToolSettingsView } from "../../shared/types";

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
  toolSettings?: GlobalToolSettingsView;
  toolSettingsLoading?: boolean;
  onGlobalTool(name: string, enabled: boolean): Promise<void>;
}

export function ConversationSettingsDialog({
  open,
  onOpenChange,
  toolSettings,
  toolSettingsLoading = false,
  onGlobalTool,
}: Props) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="flex h-[min(680px,calc(100vh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
      <DialogHeader className="gap-1 border-b px-6 py-5 pr-12">
        <DialogTitle>全局设置</DialogTitle>
        <DialogDescription className="text-xs">管理所有会话可用的工具。修改会立即应用到现有会话及后续新建的会话。</DialogDescription>
      </DialogHeader>
      <Tabs defaultValue="tools" orientation="vertical" className="min-h-0 flex-1 flex-col gap-0 sm:flex-row">
        <TabsList variant="line" className="w-full shrink-0 justify-start gap-1 rounded-none border-b bg-surface-subtle p-2 sm:h-full sm:w-52 sm:flex-col sm:items-stretch sm:justify-start sm:border-r sm:border-b-0 sm:p-3">
          <TabsTrigger value="tools" className="h-9 justify-start px-3 text-xs sm:flex-none">
            <Settings2Icon className="size-4" />
            工具
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tools" className="min-h-0 overflow-y-auto p-5 sm:p-6">
          <ToolSettingsPanel
            settings={toolSettings}
            loading={toolSettingsLoading}
            onGlobalTool={onGlobalTool}
          />
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>;
}

function ToolSettingsPanel({
  settings,
  loading,
  onGlobalTool,
}: {
  settings?: GlobalToolSettingsView;
  loading: boolean;
  onGlobalTool(name: string, enabled: boolean): Promise<void>;
}) {
  if (loading && !settings) return <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">正在加载工具…</div>;
  if (!settings) return <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">工具配置加载失败。</div>;
  const groups = settings.tools.reduce<Record<string, GlobalToolSettingItem[]>>((result, tool) => {
    (result[tool.source.label] ??= []).push(tool);
    return result;
  }, {});
  return <div className="mx-auto max-w-4xl space-y-4">
    <p className="text-xs text-muted-foreground">新安装并注册的工具默认启用。此处仅管理全局状态，不包含任何单个会话的覆盖配置。</p>
    {Object.entries(groups).map(([label, tools]) => <SettingSection key={label} icon={WrenchIcon} title={label} tip="工具由服务端加载和执行。">
      <div className="divide-y px-3">
        {tools?.map((tool) => <ToolSettingRow key={tool.name} tool={tool} onGlobalTool={onGlobalTool} />)}
      </div>
    </SettingSection>)}
  </div>;
}

function ToolSettingRow({
  tool,
  onGlobalTool,
}: {
  tool: GlobalToolSettingItem;
  onGlobalTool(name: string, enabled: boolean): Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const run = async (action: () => Promise<void>) => {
    setSaving(true);
    try { await action(); }
    finally { setSaving(false); }
  };
  return <div className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <code className="truncate text-xs font-medium">{tool.name}</code>
        <Badge variant={tool.enabled ? "secondary" : "outline"}>{tool.enabled ? "已启用" : "已禁用"}</Badge>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground" title={tool.description}>{tool.description}</p>
    </div>
    <label className="flex items-center justify-between gap-2 text-xs sm:justify-start">
      <span>全局</span>
      <Switch
        aria-label={`${tool.name} 全局状态`}
        checked={tool.enabled}
        disabled={saving}
        onCheckedChange={(enabled) => { run(() => onGlobalTool(tool.name, enabled)).catch(() => undefined); }}
      />
    </label>
  </div>;
}

function SettingSection({ icon: Icon, title, tip, children }: { icon: typeof Settings2Icon; title: string; tip: string; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-md border"><div className="flex h-10 items-center gap-2 border-b bg-surface-subtle px-3"><Icon className="size-3.5 shrink-0 text-muted-foreground" /><h3 className="text-xs font-medium">{title}</h3><InfoTip label={`${title}说明`}>{tip}</InfoTip></div><div className="px-3">{children}</div></section>;
}

function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  return <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-xs" className="size-4 rounded-full text-muted-foreground hover:text-foreground" aria-label={label}><InfoIcon className="size-3" /></Button></TooltipTrigger><TooltipContent side="top" sideOffset={6} className="max-w-64 leading-4">{children}</TooltipContent></Tooltip>;
}
