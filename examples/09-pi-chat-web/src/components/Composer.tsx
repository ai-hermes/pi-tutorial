import { useEffect, useRef, useState } from "react";
import { ArrowUpIcon, ChevronDownIcon, CircleIcon, FileIcon, LoaderCircleIcon, OctagonIcon, PlusIcon, RouteIcon, ShieldAlertIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuPortal,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSub, DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ModelOption, QueueBehavior, RuntimeStatus, ThinkingLevel } from "../../shared/types";

interface Props {
  status: RuntimeStatus;
  imageInput: boolean;
  models: ModelOption[];
  model: { provider: string; id: string };
  thinkingLevel: ThinkingLevel;
  thinkingLevels: ThinkingLevel[];
  queued?: number;
  onSend(text: string, files: File[], behavior: QueueBehavior): Promise<void>;
  onAbort(): Promise<void>;
  onModelChange(provider: string, id: string): Promise<void>;
  onThinkingChange(level: ThinkingLevel): Promise<void>;
}

export function Composer({
  status, imageInput, models, model, thinkingLevel, thinkingLevels, queued = 0,
  onSend, onAbort, onModelChange, onThinkingChange,
}: Props) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [behavior, setBehavior] = useState<QueueBehavior>("followUp");
  const [submitting, setSubmitting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const busy = status === "running" || status === "stopping" || status === "compacting";
  const queueing = status === "running";
  const blocked = status === "stopping" || status === "compacting";

  const submit = async () => {
    if ((!text.trim() && files.length === 0) || submitting || blocked) return;
    setSubmitting(true);
    try {
      await onSend(text, files, behavior);
      setText("");
      setFiles([]);
      if (fileInput.current) fileInput.current.value = "";
    } catch {
      // The parent reports the request error. Keep the draft so it can be retried.
    } finally { setSubmitting(false); }
  };

  const addFiles = (nextFiles: FileList | null) => {
    if (!nextFiles) return;
    setFiles((current) => [...current, ...[...nextFiles]].slice(0, 5));
  };

  return <div data-slot="composer-shell" className="shrink-0 border-t bg-card/95 px-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:px-4 md:pb-3">
    <div className="mx-auto w-full max-w-[60rem]">
      {queueing && <div className="mb-1.5 flex min-h-7 items-center justify-between gap-3 rounded-md border border-emerald-500/15 bg-emerald-500/[0.055] px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-300"><span className="flex items-center gap-2"><CircleIcon className="size-2.5 fill-current" />Pi 正在运行，可插入方向或排队下一步</span>{queued > 0 && <span className="font-mono">Queue {queued}</span>}</div>}
      <Field>
      <InputGroup data-testid="composer-input" className="composer-input h-auto rounded-xl border bg-background shadow-[0_12px_30px_-24px_rgba(18,28,21,0.6)] has-disabled:bg-background has-disabled:opacity-100">
        {files.length > 0 && <div data-testid="attachment-tray" className="flex w-full flex-wrap gap-2 px-3 pt-3">
          {files.map((file, index) => <AttachmentPreview
            key={`${file.name}-${file.lastModified}-${index}`}
            file={file}
            imageInput={imageInput}
            onRemove={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
          />)}
        </div>}
        <InputGroupTextarea
          aria-label="向 Pi Chat 提问"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); }
          }}
          placeholder={queueing ? "输入一条 steer 或 follow-up 消息…" : status === "compacting" ? "正在压缩上下文…" : status === "stopping" ? "正在停止…" : "向 Pi Chat 提问…"}
          disabled={blocked}
          rows={1}
          className="max-h-40 min-h-11 px-3.5 pt-2.5 text-sm leading-6"
        />
        <InputGroupAddon align="block-end" className="min-h-8 justify-between px-2.5 pb-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <input ref={fileInput} type="file" aria-label="选择附件" multiple className="sr-only" onChange={(event) => addFiles(event.target.files)} />
            <InputGroupButton size="icon-sm" aria-label="添加附件" disabled={files.length >= 5} onClick={() => fileInput.current?.click()}><PlusIcon /></InputGroupButton>
            <PermissionMenu />
            {queueing && <ToggleGroup type="single" value={behavior} onValueChange={(value) => { if (value) setBehavior(value as QueueBehavior); }} variant="outline" size="sm">
              <ToggleGroupItem value="steer" aria-label="Steer 当前运行"><RouteIcon />Steer</ToggleGroupItem>
              <ToggleGroupItem value="followUp" aria-label="运行后继续"><ArrowUpIcon />排队</ToggleGroupItem>
            </ToggleGroup>}
            {queued > 0 && !queueing && <Badge variant="outline" className="font-mono text-xs font-normal">Queue {queued}</Badge>}
          </div>
          <div className="flex items-center gap-1.5">
            {busy && <Button variant="outline" size="xs" onClick={() => void onAbort()} disabled={status === "stopping"}>{status === "stopping" ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : <OctagonIcon data-icon="inline-start" />}停止</Button>}
            <ModelThinkingMenu
              disabled={busy}
              models={models}
              model={model}
              thinkingLevel={thinkingLevel}
              thinkingLevels={thinkingLevels}
              onModelChange={onModelChange}
              onThinkingChange={onThinkingChange}
            />
            <Button size="icon-sm" aria-label="发送消息" disabled={(!text.trim() && files.length === 0) || submitting || blocked} onClick={() => void submit()}><ArrowUpIcon /></Button>
          </div>
        </InputGroupAddon>
      </InputGroup>
      </Field>
    </div>
  </div>;
}

export function PermissionMenu() {
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <InputGroupButton className="text-warning" aria-label="权限：本机完整权限">
        <ShieldAlertIcon />
        <span className="hidden sm:inline">完整权限</span>
        <ChevronDownIcon className="hidden sm:block" />
      </InputGroupButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent side="top" align="start" className="w-72">
      <DropdownMenuLabel>权限模式</DropdownMenuLabel>
      <DropdownMenuRadioGroup value="full">
        <DropdownMenuRadioItem value="full" className="items-start py-2">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium">本机完整权限</span>
            <span className="text-xs leading-4 text-muted-foreground">可读写文件并运行命令，当前没有系统级沙箱隔离</span>
          </span>
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}

function ModelThinkingMenu({
  disabled, models, model, thinkingLevel, thinkingLevels, onModelChange, onThinkingChange,
}: {
  disabled: boolean;
  models: ModelOption[];
  model: { provider: string; id: string };
  thinkingLevel: ThinkingLevel;
  thinkingLevels: ThinkingLevel[];
  onModelChange(provider: string, id: string): Promise<void>;
  onThinkingChange(level: ThinkingLevel): Promise<void>;
}) {
  const modelValue = `${model.provider}/${model.id}`;
  const modelName = models.find((option) => option.provider === model.provider && option.id === model.id)?.name ?? model.id;
  const compactName = compactModelName(modelName);
  const providers = [...new Set(models.map((option) => option.provider))].sort((left, right) => {
    if (left === model.provider) return -1;
    if (right === model.provider) return 1;
    return left.localeCompare(right);
  });
  const sortedModels = [...models].sort((left, right) => {
    const leftSelected = left.provider === model.provider && left.id === model.id;
    const rightSelected = right.provider === model.provider && right.id === model.id;
    if (leftSelected !== rightSelected) return leftSelected ? -1 : 1;
    return right.id.localeCompare(left.id, undefined, { numeric: true, sensitivity: "base" });
  });

  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <InputGroupButton disabled={disabled} className="max-w-52 gap-1.5 border-transparent text-muted-foreground focus-visible:border-transparent focus-visible:ring-0" aria-label={`模型 ${modelName}，思考深度 ${thinkingLabel(thinkingLevel)}`}>
        <span className="max-w-24 truncate sm:max-w-32">{compactName}</span>
        <span>{thinkingLabel(thinkingLevel)}</span>
        <ChevronDownIcon />
      </InputGroupButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent side="top" align="end" className="w-56 p-1">
      <DropdownMenuGroup>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="min-h-11 px-2 sm:min-h-8" aria-label={`选择模型，当前 ${modelName}`}>
            <span className="font-medium">模型</span>
            <span className="ml-auto max-w-32 truncate text-muted-foreground">{compactName}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent sideOffset={4} className="max-h-[min(26rem,calc(100vh-2rem))] w-64 max-w-[calc(100vw-1rem)] overflow-y-auto p-1">
              <DropdownMenuRadioGroup value={modelValue} onValueChange={(value) => {
                const separator = value.indexOf("/");
                void onModelChange(value.slice(0, separator), value.slice(separator + 1));
              }}>
                {providers.map((provider) => <DropdownMenuGroup key={provider}>
                  {providers.length > 1 && <DropdownMenuLabel className="px-2 pb-0.5 pt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] first:pt-1">{provider}</DropdownMenuLabel>}
                  {sortedModels.filter((option) => option.provider === provider).map((option) => <DropdownMenuRadioItem
                    key={`${option.provider}/${option.id}`}
                    value={`${option.provider}/${option.id}`}
                    className="min-h-11 px-2 pr-8 sm:min-h-8"
                    title={option.name}
                  >
                    <span className="min-w-0 flex-1 truncate">{compactModelName(option.name)}</span>
                  </DropdownMenuRadioItem>)}
                </DropdownMenuGroup>)}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="min-h-11 px-2 sm:min-h-8" aria-label={`选择思考深度，当前 ${thinkingLabel(thinkingLevel)}`}>
            <span className="font-medium">思考深度</span>
            <span className="ml-auto text-muted-foreground">{thinkingLabel(thinkingLevel)}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent sideOffset={4} className="w-56 max-w-[calc(100vw-1rem)] p-1">
              <DropdownMenuLabel className="px-2 py-1 text-xs">思考深度</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={thinkingLevel} onValueChange={(value) => void onThinkingChange(value as ThinkingLevel)}>
                <DropdownMenuGroup>
                  {thinkingLevels.map((level) => <DropdownMenuRadioItem key={level} value={level} className="min-h-11 items-start px-2 py-1.5 pr-8 sm:min-h-8">
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span>{thinkingLabel(level)}</span>
                      {thinkingDescription(level) && <span className="text-xs leading-4 text-muted-foreground">{thinkingDescription(level)}</span>}
                    </span>
                  </DropdownMenuRadioItem>)}
                </DropdownMenuGroup>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}

function thinkingLabel(level: ThinkingLevel): string {
  return ({ off: "Off", minimal: "Minimal", low: "Light", medium: "Medium", high: "High", xhigh: "Extra High", max: "Ultra" })[level];
}

function thinkingDescription(level: ThinkingLevel): string | undefined {
  if (level === "max") return "使用更多时间与额度";
  if (level === "xhigh") return "适合更复杂的推理任务";
  return undefined;
}

function compactModelName(name: string): string {
  return name.replace(/^GPT[- ]/i, "");
}

function AttachmentPreview({ file, imageInput, onRemove }: { file: File; imageInput: boolean; onRemove(): void }) {
  const [url, setUrl] = useState("");
  const isImage = file.type.startsWith("image/");
  useEffect(() => {
    if (!isImage) return undefined;
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file, isImage]);

  if (isImage) return <div data-attachment-preview="image" className="group relative size-24 overflow-hidden rounded-lg border bg-muted shadow-sm sm:size-28" title={imageInput ? file.name : `${file.name}（作为文件分析）`}>
    {url && <img src={url} alt={file.name} className="size-full object-contain" />}
    {!imageInput && <span className="absolute inset-x-1.5 bottom-1.5 truncate rounded bg-background/90 px-1.5 py-1 text-[10px] text-muted-foreground backdrop-blur">作为文件分析</span>}
    <Button variant="secondary" size="icon-sm" className="absolute right-1.5 top-1.5 size-8 rounded-full border-0 bg-foreground text-background opacity-95 shadow-md hover:bg-foreground/80 hover:text-background" aria-label={`移除 ${file.name}`} onClick={onRemove}><XIcon className="size-4" /></Button>
  </div>;

  return <div data-attachment-preview="file" className="relative flex h-16 w-full max-w-56 items-center gap-2.5 rounded-lg border bg-muted/35 p-2.5 pr-9 shadow-sm sm:w-56">
    <span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background"><FileIcon className="size-4 text-muted-foreground" /></span>
    <span className="min-w-0">
      <span className="block truncate text-sm font-medium" title={file.name}>{file.name}</span>
      <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">{fileLabel(file)}</span>
    </span>
    <Button variant="ghost" size="icon" className="absolute right-1.5 top-1.5 size-7 rounded-full" aria-label={`移除 ${file.name}`} onClick={onRemove}><XIcon className="size-4" /></Button>
  </div>;
}

function fileLabel(file: File): string {
  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toUpperCase() : "FILE";
  const size = file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`;
  return `${extension || "FILE"} · ${size}`;
}
