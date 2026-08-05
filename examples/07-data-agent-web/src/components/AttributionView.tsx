import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { AttributionArtifact } from "../../shared/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info } from "lucide-react";

const format = (value: number) => new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(value);
const percent = (value: number | null) => value == null ? "—" : new Intl.NumberFormat("zh-CN", { style: "percent", maximumFractionDigits: 1 }).format(value);

export function AttributionView({ artifact }: { artifact: AttributionArtifact }) {
  const config = { delta: { label: "贡献变化", color: "var(--chart-1)" } } satisfies ChartConfig;
  const rows = artifact.contributions.map((item) => ({ ...item, dimensionLabel: String(item.dimension ?? "NULL") }));
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      {[["基期", format(artifact.baselineTotal)], ["当期", format(artifact.currentTotal)], ["变化", format(artifact.delta)], ["变化率", percent(artifact.changeRate)]].map(([label, value]) => <Card key={label}><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 font-mono text-lg font-semibold tabular-nums">{value}</p></CardContent></Card>)}
    </div>
    <ChartContainer config={config} className="h-[280px] w-full aspect-auto">
      <BarChart accessibilityLayer data={rows} layout="vertical" margin={{ left: 12 }}>
        <CartesianGrid horizontal={false} /><XAxis type="number" tickLine={false} axisLine={false} /><YAxis dataKey="dimensionLabel" type="category" tickLine={false} axisLine={false} width={80} tick={{ fontSize: 11 }} />
        <ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="delta" fill="var(--color-delta)" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ChartContainer>
    <div className="max-h-64 overflow-auto rounded-md border"><Table className="text-xs"><TableHeader><TableRow><TableHead>{artifact.dimensionField}</TableHead><TableHead className="text-right">基期</TableHead><TableHead className="text-right">当期</TableHead><TableHead className="text-right">变化</TableHead><TableHead className="text-right">贡献</TableHead></TableRow></TableHeader><TableBody>{artifact.contributions.map((item, index) => <TableRow key={`${String(item.dimension)}-${index}`}><TableCell>{String(item.dimension ?? "NULL")}</TableCell><TableCell className="text-right font-mono">{format(item.baseline)}</TableCell><TableCell className="text-right font-mono">{format(item.current)}</TableCell><TableCell className="text-right font-mono">{format(item.delta)}</TableCell><TableCell className="text-right font-mono">{percent(item.contributionShare)}</TableCell></TableRow>)}</TableBody></Table></div>
    {artifact.caveats.map((caveat) => <Alert key={caveat}><Info /><AlertDescription>{caveat}</AlertDescription></Alert>)}
  </div>;
}
