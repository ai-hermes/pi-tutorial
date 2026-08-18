import { useState } from "react";
import {
  ActivityIcon, ArchiveIcon, BotIcon, CircleIcon, CoinsIcon, DownloadIcon, FolderIcon, GaugeIcon,
  ListRestartIcon, Settings2Icon, SparklesIcon, TimerResetIcon, WrenchIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { ActivityItem, ConversationSettings, ConversationSnapshot } from "../../shared/types";

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
  snapshot: ConversationSnapshot;
  warning: string;
  onCompact(instructions: string): Promise<void>;
  onSettings(patch: Partial<ConversationSettings>): Promise<void>;
}

export function HarnessSheet({ open, onOpenChange, snapshot, onCompact, onSettings }: Props) {
  const [compactOpen, setCompactOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const usage = snapshot.stats.contextUsage;
  const base = `/api/conversations/${snapshot.conversation.id}`;
  const queueCount = snapshot.queue.steering.length + snapshot.queue.followUp.length;

  return <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 bg-background p-0 data-[side=right]:w-full sm:data-[side=right]:w-3/4 sm:max-w-md">
        <SheetHeader className="gap-2.5 border-b bg-background px-3.5 py-3 sm:px-4">
          <div className="flex items-start gap-2.5">
            <ActivityIcon className="mt-0.5 size-4.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-sm">Harness 检查器</SheetTitle>
              <SheetDescription className="mt-0.5 text-xs leading-4">查看 Pi session、工具执行和上下文状态。</SheetDescription>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2 border-t pt-2 text-[var(--type-meta)] leading-[var(--leading-meta)] text-muted-foreground">
            <Badge variant="outline" className="shrink-0 gap-1.5 bg-background font-normal">
              <CircleIcon className={snapshot.status === "running" ? "fill-success text-success" : "fill-muted-foreground text-muted-foreground"} />
              {statusLabel(snapshot.status)}
            </Badge>
            <span className="min-w-0 truncate font-mono">{snapshot.model.provider}/{snapshot.model.id}</span>
            <span className="ml-auto shrink-0">Thinking <span className="font-mono">{snapshot.thinkingLevel}</span></span>
          </div>
        </SheetHeader>
        <Tabs defaultValue="activity" className="min-h-0 flex-1 flex-col gap-0 overflow-hidden">
          <div className="shrink-0 border-b bg-background px-3.5 sm:px-4">
            <TabsList variant="line" className="grid h-10 w-full grid-cols-3">
              <HarnessTab value="activity" icon={ActivityIcon}>活动</HarnessTab>
              <HarnessTab value="context" icon={GaugeIcon}>上下文</HarnessTab>
              <HarnessTab value="settings" icon={Settings2Icon}>设置</HarnessTab>
            </TabsList>
          </div>
          <ScrollArea className="min-h-0 w-full flex-1 overflow-hidden">
            <TabsContent value="activity" className="mt-0 flex flex-col gap-4 p-3.5 sm:p-4">
              {queueCount > 0 && <section className="flex flex-col gap-2.5">
                <SectionHeading title="消息队列" value={String(queueCount)} />
                <QueueList label="Steer" items={snapshot.queue.steering} />
                <QueueList label="Follow-up" items={snapshot.queue.followUp} />
              </section>}
              {queueCount > 0 && <Separator />}
              <section className="flex flex-col gap-2.5">
                <SectionHeading title="运行时间线" value={snapshot.activity.length ? `${snapshot.activity.length} 条` : undefined} />
                {snapshot.activity.length === 0
                  ? <Empty className="min-h-40 rounded-lg border border-dashed bg-card py-6"><EmptyHeader><EmptyMedia variant="icon"><ActivityIcon /></EmptyMedia><EmptyTitle>尚无运行事件</EmptyTitle><EmptyDescription>模型响应、工具调用和设置变化会实时出现在这里。</EmptyDescription></EmptyHeader></Empty>
                  : <div data-slot="activity-list" className="overflow-hidden rounded-md border bg-card">{snapshot.activity.map((item, index) => <ActivityRow key={`${item.id}-${item.type}`} item={item} active={snapshot.status === "running" && index === 0} last={index === snapshot.activity.length - 1} />)}</div>}
              </section>
            </TabsContent>
            <TabsContent value="context" className="mt-0 flex flex-col gap-4 p-3.5 sm:p-4">
              <section className="flex flex-col gap-2.5 border-b pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-sm font-medium">上下文用量</p><p className="mt-1 text-xs text-muted-foreground">当前会话占模型窗口的比例</p></div>
                  <span className="font-mono text-lg font-semibold tabular-nums">{usage ? `${usage.percent.toFixed(1)}%` : "—"}</span>
                </div>
                <Progress value={usage?.percent ?? 0} className="h-2" />
                <p className="font-mono text-[var(--type-meta)] leading-[var(--leading-meta)] text-muted-foreground">{usage ? `${usage.tokens.toLocaleString()} / ${usage.contextWindow.toLocaleString()} tokens` : "完成一次模型调用后显示。"}</p>
              </section>
              <section className="text-sm">
                <SectionHeading title="会话统计" />
                <div className="mt-2.5 overflow-hidden rounded-md border bg-card">
                  <Metric icon={SparklesIcon} label="输入 tokens" value={snapshot.stats.tokens.input.toLocaleString()} />
                  <Metric icon={BotIcon} label="输出 tokens" value={snapshot.stats.tokens.output.toLocaleString()} />
                  <Metric icon={TimerResetIcon} label="缓存读取" value={snapshot.stats.tokens.cacheRead.toLocaleString()} />
                  <Metric icon={WrenchIcon} label="工具调用" value={String(snapshot.stats.toolCalls)} />
                  <Metric icon={CoinsIcon} label="估算费用" value={`$${snapshot.stats.cost.toFixed(4)}`} last />
                </div>
              </section>
              <div className="grid grid-cols-2 gap-2"><Button className="col-span-2" size="sm" onClick={() => setCompactOpen(true)}><ArchiveIcon data-icon="inline-start" />压缩上下文</Button><Button variant="outline" size="sm" asChild><a href={`${base}/export?format=jsonl`}><DownloadIcon data-icon="inline-start" />导出 JSONL</a></Button><Button variant="outline" size="sm" asChild><a href={`${base}/export?format=html`}><DownloadIcon data-icon="inline-start" />导出 HTML</a></Button></div>
              <section className="border-t pt-3.5">
                <p className="flex items-center gap-2 text-xs font-medium"><FolderIcon className="size-4 text-muted-foreground" />Workspace</p>
                <code className="mt-2 block break-all rounded-md bg-muted px-2.5 py-2 text-xs leading-4 text-foreground/80">{snapshot.conversation.workspace}</code>
                <p className="mt-2 text-[var(--type-meta)] leading-[var(--leading-meta)] text-muted-foreground">Session <span className="font-mono">{snapshot.stats.sessionId}</span></p>
              </section>
              {snapshot.diagnostics.length > 0 && <Alert><AlertTitle>Runtime diagnostics</AlertTitle><AlertDescription className="whitespace-pre-wrap">{snapshot.diagnostics.join("\n")}</AlertDescription></Alert>}
            </TabsContent>
            <TabsContent value="settings" className="mt-0 flex flex-col gap-4 p-3.5 sm:p-4">
              <SettingSection icon={ListRestartIcon} title="自动化" description="控制上下文维护和失败恢复。">
                <FieldGroup className="gap-0 divide-y">
                  <SettingField label="自动压缩" description="接近上下文窗口时由 Pi 自动生成摘要。" checked={snapshot.settings.autoCompaction} onCheckedChange={(checked) => { onSettings({ autoCompaction: checked }).catch(() => undefined); }} />
                  <SettingField label="自动重试" description="对限流和临时服务错误自动重试。" checked={snapshot.settings.autoRetry} onCheckedChange={(checked) => { onSettings({ autoRetry: checked }).catch(() => undefined); }} />
                </FieldGroup>
              </SettingSection>
              <SettingSection icon={Settings2Icon} title="队列消费" description="决定运行中插入的消息如何被消费。">
                <FieldGroup className="gap-0 divide-y">
                  <QueueModeField label="Steer 消费" description="控制每轮处理一条还是全部 steer 消息。" value={snapshot.settings.steeringMode} onValueChange={(steeringMode) => { onSettings({ steeringMode }).catch(() => undefined); }} />
                  <QueueModeField label="Follow-up 消费" description="控制每轮处理一条还是全部 follow-up 消息。" value={snapshot.settings.followUpMode} onValueChange={(followUpMode) => { onSettings({ followUpMode }).catch(() => undefined); }} />
                </FieldGroup>
              </SettingSection>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>

    <Dialog open={compactOpen} onOpenChange={setCompactOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>压缩上下文</DialogTitle><DialogDescription>Pi 会把较早内容汇总为可恢复的 compaction entry。指令可留空。</DialogDescription></DialogHeader>
        <FieldGroup><Field><FieldLabel htmlFor="compact-instructions">自定义摘要指令</FieldLabel><Textarea id="compact-instructions" value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={5} placeholder="例如：保留所有文件路径和未完成事项" /></Field></FieldGroup>
        <DialogFooter><Button variant="outline" onClick={() => setCompactOpen(false)}>取消</Button><Button onClick={() => { onCompact(instructions).then(() => setCompactOpen(false)).catch(() => undefined); }}>开始压缩</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

function HarnessTab({ value, icon: Icon, children }: { value: string; icon: typeof ActivityIcon; children: string }) {
  return <TabsTrigger value={value} className="h-full gap-2 rounded-none text-xs font-medium"><Icon />{children}</TabsTrigger>;
}

function ActivityRow({ item, active, last }: { item: ActivityItem; active: boolean; last: boolean }) {
  return <div data-slot="activity-row" className={cn("flex items-center gap-2.5 px-3 py-2.5", !last && "border-b")}>
    <CircleIcon className={cn("size-2.5 shrink-0 text-muted-foreground", active && "fill-success text-success")} />
    <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{activityLabel(item)}</p><p className="mt-0.5 truncate text-[var(--type-meta)] leading-[var(--leading-meta)] text-muted-foreground">{item.summary}</p></div>
    <time className="shrink-0 font-mono text-[var(--type-meta)] leading-[var(--leading-meta)] tabular-nums text-muted-foreground">{new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
  </div>;
}

function QueueList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return <div className="border-l-2 bg-surface-subtle px-3 py-2"><p className="text-[var(--type-meta)] font-medium leading-[var(--leading-meta)] text-muted-foreground">{label}</p>{items.map((item, index) => <p key={`${label}-${index}`} className="mt-1 truncate text-xs">{item}</p>)}</div>;
}

function Metric({ icon: Icon, label, value, last = false }: { icon: typeof ActivityIcon; label: string; value: string; last?: boolean }) {
  return <div className={cn("flex items-center gap-2.5 px-3 py-2", !last && "border-b")}><Icon className="size-3.5 shrink-0 text-muted-foreground" /><span className="text-muted-foreground">{label}</span><span className="ml-auto font-mono text-xs font-medium tabular-nums">{value}</span></div>;
}

function SectionHeading({ title, value }: { title: string; value?: string }) {
  return <div className="flex items-center justify-between gap-3"><h3 className="text-xs font-medium">{title}</h3>{value && <span className="font-mono text-[var(--type-meta)] leading-[var(--leading-meta)] text-muted-foreground">{value}</span>}</div>;
}

function SettingSection({ icon: Icon, title, description, children }: { icon: typeof ActivityIcon; title: string; description: string; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-md border bg-card"><div className="flex items-center gap-2.5 border-b bg-surface-subtle px-3.5 py-2.5"><Icon className="size-3.5 shrink-0 text-muted-foreground" /><div><h3 className="text-sm font-medium">{title}</h3><p className="mt-0.5 text-[var(--type-meta)] leading-[var(--leading-meta)] text-muted-foreground">{description}</p></div></div><div className="px-3.5">{children}</div></section>;
}

function statusLabel(status: ConversationSnapshot["status"]): string {
  return ({ ready: "就绪", running: "运行中", stopping: "停止中", compacting: "压缩中", error: "错误", cold: "已释放" })[status];
}

function activityLabel(item: ActivityItem): string {
  return ({
    "message.started": "开始生成回复", "message.completed": "回复生成完成", "message.added": "消息已加入会话",
    "tool.started": "工具开始执行", "tool.updated": "工具输出更新", "tool.completed": "工具执行完成",
    "queue.updated": "消息队列已更新", "runtime.status": "运行状态已变化", "runtime.error": "运行时错误",
    "model.changed": "模型已切换", "thinking.changed": "Thinking 已切换", "settings.changed": "设置已更新",
    "compaction.started": "开始压缩上下文", "compaction.completed": "上下文压缩完成", "retry.started": "正在自动重试",
  } as Record<string, string>)[item.type] ?? item.summary;
}

function SettingField({ label, description, checked, onCheckedChange }: { label: string; description: string; checked: boolean; onCheckedChange(checked: boolean): void }) {
  const id = label === "自动压缩" ? "auto-compaction" : "auto-retry";
  return <Field orientation="horizontal" className="py-3">
    <FieldContent><FieldLabel htmlFor={id}>{label}</FieldLabel><FieldDescription>{description}</FieldDescription></FieldContent>
    <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
  </Field>;
}

function QueueModeField({ label, description, value, onValueChange }: { label: string; description: string; value: "all" | "one-at-a-time"; onValueChange(value: "all" | "one-at-a-time"): void }) {
  return <Field className="py-3">
    <FieldContent><FieldLabel>{label}</FieldLabel><FieldDescription>{description}</FieldDescription></FieldContent>
    <ToggleGroup type="single" variant="outline" size="sm" className="grid w-full grid-cols-2" value={value} onValueChange={(next) => { if (next) onValueChange(next as "all" | "one-at-a-time"); }}>
      <ToggleGroupItem value="all">全部</ToggleGroupItem>
      <ToggleGroupItem value="one-at-a-time">逐条</ToggleGroupItem>
    </ToggleGroup>
  </Field>;
}
