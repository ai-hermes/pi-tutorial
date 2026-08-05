import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import type { Scalar } from "@warjiang/data-agent-core";
import type { QueryArtifact } from "../../shared/types";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function displayValue(value: Scalar | undefined): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function ResultTable({ query }: { query: QueryArtifact }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useMemo<ColumnDef<Record<string, Scalar>>[]>(() => query.columns.map((column) => ({
    id: column, accessorFn: (row) => row[column], header: column,
    cell: (context) => { const value = context.getValue() as Scalar | undefined; return <span className={value == null ? "italic text-muted-foreground" : ""}>{displayValue(value)}</span>; },
  })), [query.columns]);
  const table = useReactTable({ data: query.rows, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });

  if (!query.columns.length) return <Empty><EmptyHeader><EmptyTitle>没有返回列</EmptyTitle><EmptyDescription>请调整查询后重试。</EmptyDescription></EmptyHeader></Empty>;
  return (
    <div className="max-h-[52vh] overflow-auto rounded-md border" tabIndex={0} aria-label="查询结果表格">
      <Table className="text-xs">
        <TableHeader className="sticky top-0 z-10 bg-muted">
          {table.getHeaderGroups().map((group) => <TableRow key={group.id}>{group.headers.map((header) => {
            const sorted = header.column.getIsSorted();
            return <TableHead key={header.id} className="h-9 whitespace-nowrap px-2">
              <Button variant="ghost" size="xs" className="-ml-2 font-semibold" onClick={header.column.getToggleSortingHandler()}>
                {flexRender(header.column.columnDef.header, header.getContext())}
                {sorted === "asc" ? <ArrowUp /> : sorted === "desc" ? <ArrowDown /> : <ChevronsUpDown />}
              </Button>
            </TableHead>;
          })}</TableRow>)}
        </TableHeader>
        <TableBody>{table.getRowModel().rows.map((row) => <TableRow key={row.id}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id} className="whitespace-nowrap px-2 py-1.5 font-mono">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)}</TableBody>
      </Table>
    </div>
  );
}
