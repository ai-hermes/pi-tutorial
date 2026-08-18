import { useState, type ComponentType } from "react";
import {
  CheckIcon, ChevronRightIcon, CircleCheckIcon, CircleXIcon, CopyIcon, FilePenLineIcon, FileSearchIcon,
  FileTextIcon, FilesIcon, FolderOpenIcon, LoaderCircleIcon, SearchIcon, TerminalSquareIcon, WrenchIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ToolRun } from "../../shared/types";

type Details = { patch?: string; diff?: string; truncated?: boolean; path?: string };

export function ToolCallCard({ tool }: { tool: ToolRun }) {
  const details = tool.details as Details | undefined;
  const output = details?.patch || details?.diff || tool.result || (tool.details ? JSON.stringify(tool.details, null, 2) : "");
  const exitCode = tool.name === "bash" ? bashExitCode(tool) : undefined;
  const duration = tool.endedAt ? formatDuration(tool.endedAt - tool.startedAt) : undefined;
  const summary = toolSummary(tool);
  const ToolIcon = toolIcon(tool.name);
  const StatusIcon = tool.status === "running" ? LoaderCircleIcon : tool.status === "error" ? CircleXIcon : CircleCheckIcon;

  return <Collapsible data-slot="tool-call-row" className="group/tool min-w-0 bg-card">
    <CollapsibleTrigger className="flex min-h-10 w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-3.5">
      <ToolIcon className={cn("size-3.5 shrink-0 text-muted-foreground", tool.status === "error" && "text-destructive")} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 font-mono text-xs font-medium">{tool.name}</span>
          <span className="truncate text-xs text-muted-foreground">{summary}</span>
        </span>
      </span>
      {duration && <span className="hidden font-mono text-xs tabular-nums text-muted-foreground sm:inline">{duration}</span>}
      <Badge variant="ghost" className={cn("shrink-0 font-normal", tool.status === "error" ? "text-destructive" : tool.status === "success" ? "text-success" : "text-foreground")}>
        <StatusIcon data-icon="inline-start" className={cn(tool.status === "running" && "animate-spin")} />
        {tool.status === "running" ? "运行中" : tool.status === "error" ? "失败" : "完成"}
      </Badge>
      <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/tool:rotate-90" />
    </CollapsibleTrigger>
    <CollapsibleContent>
      <Separator />
      <div className="flex flex-col gap-2 bg-surface-subtle px-3 py-2.5 text-xs sm:px-3.5 sm:pl-9">
        {tool.name === "bash" && <BashSummary tool={tool} exitCode={exitCode} />}
        {(details?.patch || details?.diff) && output
          ? <OutputSection title="变更" output={output} diff />
          : output && <OutputSection title={tool.status === "error" ? "错误输出" : "输出"} output={output} />}
        <details className="group/args">
          <summary className="cursor-pointer select-none font-mono text-xs text-muted-foreground hover:text-foreground">查看完整参数</summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-md border bg-background p-2.5 font-mono text-xs leading-5 whitespace-pre-wrap">{JSON.stringify(tool.args, null, 2)}</pre>
        </details>
        {details?.truncated && <p className="text-muted-foreground">输出已由 Pi 截断。</p>}
      </div>
    </CollapsibleContent>
  </Collapsible>;
}

function BashSummary({ tool, exitCode }: { tool: ToolRun; exitCode?: number }) {
  const command = stringArg(tool.args, "command") || stringArg(tool.args, "cmd");
  if (!command && exitCode === undefined) return null;
  return <section className="overflow-hidden rounded-md border bg-card">
    <div className="flex min-h-9 items-center gap-2 px-2.5 py-1.5">
      <TerminalSquareIcon className="size-3.5 text-muted-foreground" />
      <code className="min-w-0 flex-1 truncate font-mono text-xs">{command ? `$ ${command}` : "Shell command"}</code>
      {exitCode !== undefined && <Badge variant={exitCode === 0 ? "outline" : "destructive"} className={cn("font-mono font-normal", exitCode === 0 && "text-success")}>exit {exitCode}</Badge>}
    </div>
  </section>;
}

function OutputSection({ title, output, diff = false }: { title: string; output: string; diff?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  const stats = diff ? diffStats(output) : undefined;

  return <section className="overflow-hidden rounded-md border bg-card">
    <div className="flex h-8 items-center gap-2 px-2.5">
      <span className="font-mono text-xs font-medium">{title}</span>
      {stats && <span className="font-mono text-xs text-muted-foreground">+{stats.added} -{stats.removed}</span>}
      <Button variant="ghost" size="icon-xs" className="ml-auto" aria-label={`复制${title}`} onClick={() => { copy().catch(() => undefined); }}>{copied ? <CheckIcon /> : <CopyIcon />}</Button>
    </div>
    <Separator />
    {diff ? <DiffView value={output} /> : <pre className="max-h-80 overflow-auto p-2.5 font-mono text-xs leading-5 whitespace-pre-wrap">{output}</pre>}
  </section>;
}

function DiffView({ value }: { value: string }) {
  return <pre className="max-h-96 overflow-auto py-2 font-mono leading-5">{value.split("\n").map((line, index) => <span key={`${index}-${line}`} className={cn(
    "block min-w-max px-3",
    line.startsWith("+") && !line.startsWith("+++") && "bg-success/8 text-success",
    line.startsWith("-") && !line.startsWith("---") && "bg-destructive/8 text-destructive",
    line.startsWith("@@") && "text-muted-foreground",
  )}>{line || " "}</span>)}</pre>;
}

function toolSummary(tool: ToolRun): string {
  const path = stringArg(tool.args, "path") || stringArg(tool.args, "file_path") || stringArg(tool.args, "directory");
  switch (tool.name) {
    case "bash": return stringArg(tool.args, "command") ? `$ ${stringArg(tool.args, "command")}` : stringArg(tool.args, "cmd") ? `$ ${stringArg(tool.args, "cmd")}` : "执行命令";
    case "edit": return path ? `修改 ${path}` : "修改文件";
    case "write": return path ? `写入 ${path}` : "写入文件";
    case "read": return path ? `读取 ${path}` : "读取文件";
    case "grep": return [stringArg(tool.args, "pattern"), path].filter(Boolean).join(" / ") || "搜索内容";
    case "find": return [stringArg(tool.args, "pattern"), path].filter(Boolean).join(" / ") || "查找文件";
    case "ls": return path || ".";
    default: return path || "工具调用";
  }
}

function toolIcon(name: string): ComponentType<{ className?: string }> {
  return ({ bash: TerminalSquareIcon, edit: FilePenLineIcon, write: FilesIcon, read: FileTextIcon, grep: SearchIcon, find: FileSearchIcon, ls: FolderOpenIcon } as Record<string, ComponentType<{ className?: string }>>)[name] ?? WrenchIcon;
}

function stringArg(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  return typeof value === "string" ? value : "";
}

function diffStats(value: string): { added: number; removed: number } {
  return value.split("\n").reduce((stats, line) => {
    if (line.startsWith("+") && !line.startsWith("+++")) stats.added += 1;
    if (line.startsWith("-") && !line.startsWith("---")) stats.removed += 1;
    return stats;
  }, { added: 0, removed: 0 });
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1_000) return `${Math.max(0, milliseconds)} ms`;
  return `${(milliseconds / 1_000).toFixed(milliseconds < 10_000 ? 1 : 0)} s`;
}

function bashExitCode(tool: ToolRun): number | undefined {
  if (tool.status === "success") return 0;
  const match = tool.result?.match(/(?:command exited with code|exit code:)\s*(-?\d+)/i);
  return match ? Number(match[1]) : undefined;
}
