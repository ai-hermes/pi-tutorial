import { lazy, Suspense } from "react";
import { BarChart3, Clock3, Code2, GitCompareArrows, Rows3, Table2 } from "lucide-react";
import type { AttributionArtifact, ChartArtifact, QueryArtifact } from "../../shared/types";
import { ResultTable } from "./ResultTable";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const ChartView = lazy(() => import("./ChartView").then((module) => ({ default: module.ChartView })));
const AttributionView = lazy(() => import("./AttributionView").then((module) => ({ default: module.AttributionView })));
const ArtifactLoading = () => <div className="space-y-2"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-72 w-full" /></div>;

export function EvidencePanel({ queries, charts, attributions, selectedId, onSelect }: {
  queries: QueryArtifact[]; charts: ChartArtifact[]; attributions: AttributionArtifact[]; selectedId?: string; onSelect: (id: string) => void;
}) {
  const directChart = charts.find((item) => item.id === selectedId);
  const directAttribution = attributions.find((item) => item.id === selectedId);
  const queryId = directChart?.resultId ?? directAttribution?.resultId ?? selectedId;
  const query = queries.find((item) => item.id === queryId) ?? queries.at(-1);
  const chart = directChart ?? (query ? [...charts].reverse().find((item) => item.resultId === query.id) : undefined);
  const attribution = directAttribution ?? (query ? [...attributions].reverse().find((item) => item.resultId === query.id) : undefined);
  const initialTab = directAttribution ? "attribution" : directChart ? "chart" : "table";

  return <section className="flex h-full min-h-0 flex-col bg-card" aria-label="证据检查器">
    <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
      <div><p className="text-xs text-muted-foreground">证据检查器</p><h2 className="text-sm font-semibold">{queries.length ? `${queries.length} 次查询` : "等待查询"}</h2></div>
      <BarChart3 className="size-4 text-primary" />
    </header>
    {!query ? <Empty className="flex-1"><EmptyHeader><EmptyMedia variant="icon"><Table2 /></EmptyMedia><EmptyTitle>暂无证据</EmptyTitle><EmptyDescription>查询完成后，结果、图表、归因和 SQL 会显示在这里。</EmptyDescription></EmptyHeader></Empty>
    : <ScrollArea className="min-h-0 flex-1"><div className="space-y-3 p-3">
      <Select value={query.id} onValueChange={onSelect}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{[...queries].reverse().map((item, index) => <SelectItem value={item.id} key={item.id}>查询 {queries.length - index} · {item.rowCount} 行</SelectItem>)}</SelectGroup></SelectContent></Select>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Rows3 className="size-3" />{query.rowCount} 行</span><span className="inline-flex items-center gap-1"><Clock3 className="size-3" />{query.elapsedMs} ms</span>{query.truncated && <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">结果已截断</Badge>}</div>
      <Tabs defaultValue={initialTab} key={`${query.id}:${selectedId ?? "latest"}`}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="table"><Table2 />表格</TabsTrigger>
          {chart && <TabsTrigger value="chart"><BarChart3 />图表</TabsTrigger>}
          {attribution && <TabsTrigger value="attribution"><GitCompareArrows />归因</TabsTrigger>}
          <TabsTrigger value="sql"><Code2 />SQL</TabsTrigger>
        </TabsList>
        <TabsContent value="table" className="mt-3"><ResultTable query={query} /></TabsContent>
        {chart && <TabsContent value="chart" className="mt-3 space-y-2"><h3 className="text-sm font-semibold">{chart.title}</h3><Suspense fallback={<ArtifactLoading />}><ChartView chart={chart} query={query} /></Suspense></TabsContent>}
        {attribution && <TabsContent value="attribution" className="mt-3 space-y-2"><h3 className="text-sm font-semibold">{attribution.title}</h3><Suspense fallback={<ArtifactLoading />}><AttributionView artifact={attribution} /></Suspense></TabsContent>}
        <TabsContent value="sql" className="mt-3 space-y-2"><pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-5"><code>{query.sql}</code></pre><p className="text-xs text-muted-foreground">数据源：{query.sourceName}</p></TabsContent>
      </Tabs>
    </div></ScrollArea>}
  </section>;
}
