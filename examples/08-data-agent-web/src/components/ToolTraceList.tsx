import { BarChart3, CheckCircle2, ChevronRight, Database, GitCompareArrows, LoaderCircle, XCircle } from "lucide-react";
import type { ToolTrace } from "../../shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const LABELS: Record<string, string> = {
  data_catalog: "读取数据目录", data_profile: "分析字段分布", data_query: "执行只读查询",
  data_visualize: "生成证据图表", data_attribute: "计算指标贡献",
};

function ToolIcon({ trace }: { trace: ToolTrace }) {
  if (trace.status === "running") return <LoaderCircle className="size-4 animate-spin text-primary" />;
  if (trace.status === "error") return <XCircle className="size-4 text-destructive" />;
  return <CheckCircle2 className="size-4 text-primary" />;
}

export function ToolTraceList({ tools, onSelectEvidence }: { tools: ToolTrace[]; onSelectEvidence: (id: string) => void }) {
  if (!tools.length) return null;
  return (
    <Collapsible defaultOpen className="group rounded-lg border bg-card">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-muted/50">
        <ChevronRight className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
        <Database className="size-3.5" /> 执行轨迹 <Badge variant="secondary">{tools.length}</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="divide-y border-t">
        {tools.map((trace) => {
          const evidenceId = trace.attributionId ?? trace.chartId ?? trace.resultId;
          return (
            <div className="flex items-start gap-2 px-3 py-2" key={trace.id}>
              <ToolIcon trace={trace} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">{LABELS[trace.name] ?? trace.name}</p>
                {trace.name === "data_query" && typeof trace.args.sql === "string" && <code className="mt-1 block truncate text-[10px] text-muted-foreground">{trace.args.sql}</code>}
              </div>
              {evidenceId && <Button variant="ghost" size="xs" onClick={() => onSelectEvidence(evidenceId)}>
                {trace.attributionId ? <GitCompareArrows data-icon="inline-start" /> : <BarChart3 data-icon="inline-start" />}查看证据
              </Button>}
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
