import { CheckCircle2Icon, ChevronDownIcon, CircleXIcon, LoaderCircleIcon, PlayIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ToolRun } from "../../shared/types";
import { ToolCallCard } from "./ToolCallCard";

export function RunGroup({ tools, index }: { tools: ToolRun[]; index: number }) {
  const running = tools.filter((tool) => tool.status === "running").length;
  const failed = tools.filter((tool) => tool.status === "error").length;
  const completed = tools.length - running - failed;
  const StatusIcon = running > 0 ? LoaderCircleIcon : failed > 0 ? CircleXIcon : CheckCircle2Icon;
  const statusText = running > 0 ? "运行中" : failed > 0 ? "含失败步骤" : "全部完成";

  return <Collapsible defaultOpen data-slot="run-group" className="run-group-shell group/run min-w-0 overflow-hidden rounded-md border bg-card">
    <CollapsibleTrigger className="flex min-h-11 w-full items-center gap-2.5 bg-surface-subtle px-3 py-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-3.5">
      <PlayIcon className="size-3.5 shrink-0 fill-current text-foreground" />
      <span className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-2">
        <span className="block shrink-0 text-xs font-medium text-foreground">执行记录 <span className="font-mono">{String(index).padStart(2, "0")}</span></span>
        <span className="mt-0.5 block truncate text-[var(--type-meta)] leading-[var(--leading-meta)] text-muted-foreground sm:mt-0">{tools.length} 个步骤 · {statusText}</span>
      </span>
      <span className="hidden items-center gap-1.5 sm:flex">
        {running > 0 && <Badge variant="outline" className="font-normal"><LoaderCircleIcon data-icon="inline-start" className="animate-spin" />{running} 运行中</Badge>}
        {completed > 0 && <Badge variant="outline" className="font-normal text-success"><CheckCircle2Icon data-icon="inline-start" />{completed} 成功</Badge>}
        {failed > 0 && <Badge variant="outline" className="font-normal text-destructive"><CircleXIcon data-icon="inline-start" />{failed} 失败</Badge>}
      </span>
      <StatusIcon className={cn("size-4 shrink-0 sm:hidden", running > 0 ? "animate-spin text-foreground" : failed > 0 ? "text-destructive" : "text-success")} />
      <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/run:rotate-180" />
    </CollapsibleTrigger>
    <CollapsibleContent>
      <Separator />
      <div data-slot="run-steps" className="divide-y divide-border bg-card">
        {tools.map((tool) => <ToolCallCard key={tool.id} tool={tool} />)}
      </div>
    </CollapsibleContent>
  </Collapsible>;
}
