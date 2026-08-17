import { randomUUID } from "node:crypto";
import type { ChartArtifact, ChartEncoding, ChartIntent, QueryArtifact } from "../shared/types";

const MARKS = new Set(["bar", "line", "area", "point"]);
const FIELD_TYPES = new Set(["quantitative", "temporal", "nominal", "ordinal"]);
const SORTS = new Set(["ascending", "descending"]);

function assertExactKeys(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) throw new Error(`${label} contains unsupported fields: ${unexpected.join(", ")}`);
}

function validateEncoding(value: unknown, columns: string[], label: string): ChartEncoding {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  const encoding = value as Record<string, unknown>;
  assertExactKeys(encoding, ["field", "type", "title", "sort"], label);
  if (typeof encoding.field !== "string" || !columns.includes(encoding.field)) {
    throw new Error(`${label}.field must reference a query result column.`);
  }
  if (typeof encoding.type !== "string" || !FIELD_TYPES.has(encoding.type)) {
    throw new Error(`${label}.type is unsupported.`);
  }
  if (encoding.title !== undefined && (typeof encoding.title !== "string" || encoding.title.length > 80)) {
    throw new Error(`${label}.title must be at most 80 characters.`);
  }
  if (encoding.sort !== undefined && (typeof encoding.sort !== "string" || !SORTS.has(encoding.sort))) {
    throw new Error(`${label}.sort is unsupported.`);
  }
  return encoding as unknown as ChartEncoding;
}

export function validateChartIntent(value: unknown, query: QueryArtifact): ChartIntent {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Chart intent must be an object.");
  const intent = value as Record<string, unknown>;
  assertExactKeys(intent, ["resultId", "title", "mark", "x", "y", "color"], "Chart intent");
  if (intent.resultId !== query.id) throw new Error("Chart resultId does not match the referenced query.");
  if (typeof intent.title !== "string" || intent.title.trim().length === 0 || intent.title.length > 120) {
    throw new Error("Chart title must contain 1 to 120 characters.");
  }
  if (typeof intent.mark !== "string" || !MARKS.has(intent.mark)) throw new Error("Chart mark is unsupported.");

  if (query.rows.length === 0) throw new Error("Chart result must contain at least one row.");

  const x = validateEncoding(intent.x, query.columns, "x");
  const y = validateEncoding(intent.y, query.columns, "y");
  if (y.type !== "quantitative") throw new Error("y.type must be quantitative.");
  for (const row of query.rows) {
    const value = row[y.field];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error("y.field must contain only finite numeric values.");
    }
  }
  const color = intent.color === undefined ? undefined : validateEncoding(intent.color, query.columns, "color");
  if (color) {
    const series = new Set(query.rows.map((row) => String(row[color.field] ?? "NULL")));
    if (series.size > 12) throw new Error("Chart color field may contain at most 12 series.");
  }

  return {
    resultId: query.id,
    title: intent.title.trim(),
    mark: intent.mark as ChartIntent["mark"],
    x,
    y,
    ...(color ? { color } : {}),
  };
}

export function createChartArtifact(value: unknown, query: QueryArtifact): ChartArtifact {
  const intent = validateChartIntent(value, query);
  return {
    id: `chart_${randomUUID()}`,
    resultId: query.id,
    title: intent.title,
    intent,
    createdAt: new Date().toISOString(),
  };
}
