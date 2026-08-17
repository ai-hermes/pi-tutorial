/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import type { AttributionArtifact, ChartArtifact, ChartMark, QueryArtifact } from "../../shared/types";
import { AttributionView } from "./AttributionView";
import { ChartView } from "./ChartView";

afterEach(cleanup);

const query: QueryArtifact = {
  id: "query_1", sql: "SELECT region, total FROM sales", sourceName: "sales.csv",
  columns: ["region", "total"], rows: [{ region: "华东", total: 120 }, { region: "华北", total: 85 }],
  rowCount: 2, truncated: false, elapsedMs: 1, createdAt: "now",
};

function chart(mark: ChartMark): ChartArtifact {
  return { id: `chart_${mark}`, resultId: query.id, title: `${mark} chart`, createdAt: "now", intent: { resultId: query.id, title: `${mark} chart`, mark, x: { field: "region", type: "nominal" }, y: { field: "total", type: "quantitative" } } };
}

describe("artifact visualizations", () => {
  it.each(["bar", "line", "area", "point"] as const)("renders the %s chart through Recharts", (mark) => {
    const { container } = render(<ChartView chart={chart(mark)} query={query} />);
    expect(container.querySelector(".recharts-responsive-container")).toBeInTheDocument();
    expect(container.querySelector("svg.recharts-surface")).toBeInTheDocument();
  });

  it("renders attribution totals, contribution table, and caveat", () => {
    const artifact: AttributionArtifact = {
      id: "attribution_1", resultId: query.id, title: "区域贡献", sourceName: "sales.csv", sql: query.sql,
      dimensionField: "region", baselineField: "baseline", currentField: "current", metric: "销售额",
      baselineTotal: 180, currentTotal: 210, delta: 30, changeRate: 1 / 6,
      contributions: [{ dimension: "华东", baseline: 100, current: 140, delta: 40, contributionShare: 4 / 3 }],
      method: "period-over-period-contribution", caveats: ["这是描述性贡献分解，不能用于证明因果关系。"], createdAt: "now",
    };
    render(<AttributionView artifact={artifact} />);
    expect(screen.getAllByText("华东").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("这是描述性贡献分解，不能用于证明因果关系。")).toBeInTheDocument();
    expect(screen.getByText("16.7%")).toBeInTheDocument();
  });
});
