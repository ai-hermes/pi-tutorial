import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, Scatter, ScatterChart, XAxis, YAxis } from "recharts";
import type { Scalar } from "@warjiang/data-agent-core";
import type { ChartArtifact, QueryArtifact } from "../../shared/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { TriangleAlert } from "lucide-react";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const scalarKey = (value: Scalar | undefined) => JSON.stringify(value ?? null);

export function ChartView({ chart, query }: { chart: ChartArtifact; query: QueryArtifact }) {
  const model = useMemo(() => {
    const { x, y, color } = chart.intent;
    const source = [...query.rows];
    const sort = x.sort ? { field: x.field, direction: x.sort } : y.sort ? { field: y.field, direction: y.sort } : undefined;
    if (sort) source.sort((a, b) => {
      const left = a[sort.field]; const right = b[sort.field];
      const compared = typeof left === "number" && typeof right === "number" ? left - right : String(left ?? "").localeCompare(String(right ?? ""));
      return sort.direction === "descending" ? -compared : compared;
    });
    const seriesValues = color ? [...new Map(source.map((row) => [scalarKey(row[color.field]), row[color.field]])).values()] : [y.title ?? y.field];
    const config: ChartConfig = Object.fromEntries(seriesValues.map((value, index) => [`series_${index}`, { label: String(value ?? "NULL"), color: COLORS[index % COLORS.length] }]));
    if (!color) return { data: source.map((row) => ({ x: row[x.field], series_0: row[y.field] })), seriesValues, config };
    const byX = new Map<string, Record<string, Scalar>>();
    for (const row of source) {
      const key = scalarKey(row[x.field]);
      const point = byX.get(key) ?? { x: row[x.field] };
      const seriesIndex = seriesValues.findIndex((value) => scalarKey(value) === scalarKey(row[color.field]));
      point[`series_${seriesIndex}`] = row[y.field];
      byX.set(key, point);
    }
    return { data: [...byX.values()], seriesValues, config };
  }, [chart, query]);

  if (!query.rows.length) return <Alert variant="destructive"><TriangleAlert /><AlertTitle>无法绘图</AlertTitle><AlertDescription>查询结果为空。</AlertDescription></Alert>;
  const axis = <><CartesianGrid vertical={false} /><XAxis dataKey="x" tickLine={false} axisLine={false} minTickGap={24} /><YAxis tickLine={false} axisLine={false} width={48} /><ChartTooltip content={<ChartTooltipContent />} /></>;
  const series = model.seriesValues.map((_, index) => ({ key: `series_${index}`, color: `var(--color-series_${index})` }));

  return (
    <ChartContainer config={model.config} className="h-[320px] w-full aspect-auto">
      {chart.intent.mark === "bar" ? <BarChart accessibilityLayer data={model.data}>{axis}{series.map((item) => <Bar key={item.key} dataKey={item.key} fill={item.color} radius={[3, 3, 0, 0]} />)}{series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}</BarChart>
      : chart.intent.mark === "line" ? <LineChart accessibilityLayer data={model.data}>{axis}{series.map((item) => <Line key={item.key} type="monotone" dataKey={item.key} stroke={item.color} strokeWidth={2} dot={false} />)}{series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}</LineChart>
      : chart.intent.mark === "area" ? <AreaChart accessibilityLayer data={model.data}>{axis}{series.map((item) => <Area key={item.key} type="monotone" dataKey={item.key} stroke={item.color} fill={item.color} fillOpacity={0.18} />)}{series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}</AreaChart>
      : <ScatterChart accessibilityLayer><CartesianGrid /><XAxis dataKey="x" type={chart.intent.x.type === "quantitative" ? "number" : "category"} tickLine={false} axisLine={false} /><YAxis dataKey="y" type="number" tickLine={false} axisLine={false} width={48} /><ChartTooltip content={<ChartTooltipContent />} />{series.map((item) => <Scatter key={item.key} name={String(model.config[item.key]?.label)} data={model.data.filter((row) => (row as Record<string, Scalar>)[item.key] !== undefined).map((row) => ({ x: row.x, y: (row as Record<string, Scalar>)[item.key] }))} fill={item.color} />)}{series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}</ScatterChart>}
    </ChartContainer>
  );
}
