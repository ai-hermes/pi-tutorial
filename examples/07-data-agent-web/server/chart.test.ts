import { describe, expect, it } from "vitest";
import type { QueryArtifact } from "../shared/types";
import { createChartArtifact, validateChartIntent } from "./chart";

const query: QueryArtifact = {
  id: "query_1",
  sql: "SELECT region, SUM(amount) AS total FROM data GROUP BY region",
  sourceName: "sales.csv",
  columns: ["region", "total"],
  rows: [{ region: "华东", total: 120 }, { region: "华北", total: 85 }],
  rowCount: 2,
  truncated: false,
  elapsedMs: 1.2,
  createdAt: "2026-07-31T00:00:00.000Z",
};

describe("restricted chart protocol", () => {
  it("creates a restricted chart artifact bound to query rows", () => {
    const artifact = createChartArtifact({
      resultId: "query_1",
      title: "区域销售额",
      mark: "bar",
      x: { field: "region", type: "nominal" },
      y: { field: "total", type: "quantitative", sort: "descending" },
    }, query);
    expect(artifact.resultId).toBe(query.id);
    expect(artifact.intent).toMatchObject({ resultId: query.id, mark: "bar" });
    expect(artifact).not.toHaveProperty("spec");
  });

  it("rejects unknown query fields", () => {
    expect(() => validateChartIntent({
      resultId: "query_1",
      title: "错误图表",
      mark: "bar",
      x: { field: "missing", type: "nominal" },
      y: { field: "total", type: "quantitative" },
    }, query)).toThrow(/query result column/);
  });

  it("rejects arbitrary Vega-Lite properties", () => {
    expect(() => validateChartIntent({
      resultId: "query_1",
      title: "不安全图表",
      mark: "bar",
      x: { field: "region", type: "nominal" },
      y: { field: "total", type: "quantitative" },
      transform: [{ calculate: "datum.total * 2", as: "unsafe" }],
    }, query)).toThrow(/unsupported fields/);
  });

  it("rejects non-numeric y fields and excessive color series", () => {
    expect(() => validateChartIntent({
      resultId: "query_1", title: "错误类型", mark: "bar",
      x: { field: "total", type: "quantitative" }, y: { field: "region", type: "quantitative" },
    }, query)).toThrow(/finite numeric/);
    const colorful = { ...query, columns: ["region", "total", "series"], rows: Array.from({ length: 13 }, (_, index) => ({ region: `r${index}`, total: index, series: `s${index}` })) };
    expect(() => validateChartIntent({
      resultId: "query_1", title: "过多系列", mark: "line",
      x: { field: "region", type: "nominal" }, y: { field: "total", type: "quantitative" }, color: { field: "series", type: "nominal" },
    }, colorful)).toThrow(/at most 12 series/);
  });
});
