import { ChevronRight, Columns3, Database, KeyRound, Table2 } from "lucide-react";
import type { DataCatalog } from "@warjiang/data-agent-core";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

export function CatalogPanel({ catalog }: { catalog: DataCatalog }) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-card" aria-label="数据目录">
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <div>
          <p className="text-xs text-muted-foreground">数据目录</p>
          <h2 className="text-sm font-semibold">{catalog.relations.length} 个关系</h2>
        </div>
        <Database className="size-4 text-primary" aria-hidden="true" />
      </header>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 p-2">
          {catalog.relations.map((relation, index) => (
            <Collapsible key={relation.name} defaultOpen={index === 0} className="group rounded-lg border bg-background">
              <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-muted/60">
                <ChevronRight className="size-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                <Table2 className="size-3.5 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{relation.name}</span>
                <Badge variant="secondary" className="font-mono text-[10px]">{relation.columns.length}</Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t px-3 py-1.5">
                {relation.columns.map((column) => (
                  <div className="flex items-center gap-2 py-1.5 text-xs" key={column.name}>
                    {column.primaryKey ? <KeyRound className="size-3 text-primary" /> : <Columns3 className="size-3 text-muted-foreground" />}
                    <span className="min-w-0 flex-1 truncate font-medium">{column.name}</span>
                    <code className="max-w-24 truncate text-[10px] text-muted-foreground">{column.declaredType || "ANY"}</code>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </section>
  );
}
