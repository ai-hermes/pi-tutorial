import { randomUUID } from "node:crypto";
import type { Scalar } from "@warjiang/data-agent-core";
import type { AttributionArtifact, AttributionIntent, QueryArtifact } from "../shared/types";

const INTENT_KEYS = ["resultId", "title", "dimensionField", "baselineField", "currentField", "metric"] as const;

function finiteNumber(value: Scalar | undefined, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${field} must contain only finite numeric values.`);
  }
  return value;
}

export function validateAttributionIntent(value: unknown, query: QueryArtifact): AttributionIntent {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Attribution intent must be an object.");
  const input = value as Record<string, unknown>;
  const unexpected = Object.keys(input).filter((key) => !INTENT_KEYS.includes(key as typeof INTENT_KEYS[number]));
  if (unexpected.length) throw new Error(`Attribution intent contains unsupported fields: ${unexpected.join(", ")}`);
  if (input.resultId !== query.id) throw new Error("Attribution resultId does not match the referenced query.");
  if (query.truncated) throw new Error("Attribution cannot use a truncated query result.");
  if (query.rows.length === 0) throw new Error("Attribution result must contain at least one row.");
  if (typeof input.title !== "string" || !input.title.trim() || input.title.length > 120) {
    throw new Error("Attribution title must contain 1 to 120 characters.");
  }
  const fields = ["dimensionField", "baselineField", "currentField"] as const;
  for (const key of fields) {
    if (typeof input[key] !== "string" || !query.columns.includes(input[key] as string)) {
      throw new Error(`${key} must reference a query result column.`);
    }
  }
  if (input.metric !== undefined && (typeof input.metric !== "string" || input.metric.length > 80)) {
    throw new Error("metric must be at most 80 characters.");
  }
  return {
    resultId: query.id,
    title: input.title.trim(),
    dimensionField: input.dimensionField as string,
    baselineField: input.baselineField as string,
    currentField: input.currentField as string,
    ...(input.metric ? { metric: (input.metric as string).trim() } : {}),
  };
}

export function createAttributionArtifact(value: unknown, query: QueryArtifact): AttributionArtifact {
  const intent = validateAttributionIntent(value, query);
  const dimensions = new Set<string>();
  const raw = query.rows.map((row) => {
    const dimension = row[intent.dimensionField];
    const key = JSON.stringify(dimension);
    if (dimensions.has(key)) throw new Error("dimensionField values must be unique; aggregate them in SQL first.");
    dimensions.add(key);
    const baseline = finiteNumber(row[intent.baselineField], intent.baselineField);
    const current = finiteNumber(row[intent.currentField], intent.currentField);
    return { dimension, baseline, current, delta: current - baseline };
  });
  const baselineTotal = raw.reduce((sum, item) => sum + item.baseline, 0);
  const currentTotal = raw.reduce((sum, item) => sum + item.current, 0);
  const delta = currentTotal - baselineTotal;
  const caveats = ["这是描述性贡献分解，不能用于证明因果关系。"];
  if (delta === 0) caveats.push("总体变化为零，因此各维度贡献比例不适用。");

  return {
    id: `attribution_${randomUUID()}`,
    resultId: query.id,
    title: intent.title,
    sourceName: query.sourceName,
    sql: query.sql,
    dimensionField: intent.dimensionField,
    baselineField: intent.baselineField,
    currentField: intent.currentField,
    ...(intent.metric ? { metric: intent.metric } : {}),
    baselineTotal,
    currentTotal,
    delta,
    changeRate: baselineTotal === 0 ? null : delta / baselineTotal,
    contributions: raw
      .map((item) => ({ ...item, contributionShare: delta === 0 ? null : item.delta / delta }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    method: "period-over-period-contribution",
    caveats,
    createdAt: new Date().toISOString(),
  };
}
