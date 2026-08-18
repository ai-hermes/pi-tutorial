import { InfoIcon, ListRestartIcon, Settings2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ConversationSettings, ConversationSnapshot } from "../../shared/types";

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
  snapshot?: ConversationSnapshot;
  onSettings(patch: Partial<ConversationSettings>): Promise<void>;
}

export function ConversationSettingsDialog({ open, onOpenChange, snapshot, onSettings }: Props) {
  if (!snapshot) return null;
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="gap-3 sm:max-w-lg">
      <DialogHeader className="gap-1">
        <DialogTitle>会话设置</DialogTitle>
        <DialogDescription className="text-xs">调整当前会话的运行策略。</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-3">
        <SettingSection icon={ListRestartIcon} title="自动化" tip="控制上下文维护和失败恢复。">
          <FieldGroup className="gap-0 divide-y">
            <SettingField label="自动压缩" tip="接近上下文窗口时由 Pi 自动生成摘要。" checked={snapshot.settings.autoCompaction} onCheckedChange={(checked) => { onSettings({ autoCompaction: checked }).catch(() => undefined); }} />
            <SettingField label="自动重试" tip="对限流和临时服务错误自动重试。" checked={snapshot.settings.autoRetry} onCheckedChange={(checked) => { onSettings({ autoRetry: checked }).catch(() => undefined); }} />
          </FieldGroup>
        </SettingSection>
        <SettingSection icon={Settings2Icon} title="消息队列" tip="决定运行中插入的消息如何被消费。">
          <FieldGroup className="gap-0 divide-y">
            <QueueModeField label="Steer 消费" tip="向当前正在生成的回复追加方向，适合纠偏、补充约束或临时修改任务。" value={snapshot.settings.steeringMode} onValueChange={(steeringMode) => { onSettings({ steeringMode }).catch(() => undefined); }} />
            <QueueModeField label="Follow-up 消费" tip="等待当前回复完成后再继续处理，适合追加独立的问题或下一步任务。" value={snapshot.settings.followUpMode} onValueChange={(followUpMode) => { onSettings({ followUpMode }).catch(() => undefined); }} />
          </FieldGroup>
        </SettingSection>
      </div>
    </DialogContent>
  </Dialog>;
}

function SettingSection({ icon: Icon, title, tip, children }: { icon: typeof Settings2Icon; title: string; tip: string; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-md border"><div className="flex h-10 items-center gap-2 border-b bg-surface-subtle px-3"><Icon className="size-3.5 shrink-0 text-muted-foreground" /><h3 className="text-xs font-medium">{title}</h3><InfoTip label={`${title}说明`}>{tip}</InfoTip></div><div className="px-3">{children}</div></section>;
}

function SettingField({ label, tip, checked, onCheckedChange }: { label: string; tip: string; checked: boolean; onCheckedChange(checked: boolean): void }) {
  const id = label === "自动压缩" ? "auto-compaction" : "auto-retry";
  return <Field orientation="horizontal" className="min-h-11 py-2">
    <FieldContent className="flex-row items-center gap-1.5"><FieldLabel htmlFor={id}>{label}</FieldLabel><InfoTip label={`${label}说明`}>{tip}</InfoTip></FieldContent>
    <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
  </Field>;
}

function QueueModeField({ label, tip, value, onValueChange }: { label: string; tip: string; value: "all" | "one-at-a-time"; onValueChange(value: "all" | "one-at-a-time"): void }) {
  const id = label === "Steer 消费" ? "steering-mode" : "follow-up-mode";
  return <Field orientation="horizontal" className="min-h-11 py-2">
    <FieldContent className="flex-row items-center gap-1.5"><FieldLabel>{label}</FieldLabel><InfoTip label={`${label}说明`}>{tip}</InfoTip></FieldContent>
    <RadioGroup aria-label={label} className="flex items-center gap-3.5" value={value} onValueChange={(next) => onValueChange(next as "all" | "one-at-a-time")}>
      <label className="flex cursor-pointer items-center gap-1.5 text-xs">
        <RadioGroupItem id={`${id}-all`} value="all" />
        全部
      </label>
      <label className="flex cursor-pointer items-center gap-1.5 text-xs">
        <RadioGroupItem id={`${id}-one-at-a-time`} value="one-at-a-time" />
        逐条
      </label>
    </RadioGroup>
  </Field>;
}

function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  return <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-xs" className="size-4 rounded-full text-muted-foreground hover:text-foreground" aria-label={label}><InfoIcon className="size-3" /></Button></TooltipTrigger><TooltipContent side="top" sideOffset={6} className="max-w-64 leading-4">{children}</TooltipContent></Tooltip>;
}
