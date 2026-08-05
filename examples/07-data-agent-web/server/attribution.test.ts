import { describe, expect, it } from "vitest";
import type { QueryArtifact } from "../shared/types";
import { createAttributionArtifact } from "./attribution";

const query: QueryArtifact = {
  id: "query_1", sourceName: "sales.csv", sql: "SELECT channel, baseline, current FROM changes",
  columns: ["channel", "baseline", "current"],
  rows: [{ channel: "线上", baseline: 100, current: 140 }, { channel: "门店", baseline: 80, current: 70 }],
  rowCount: 2, truncated: false, elapsedMs: 2, createdAt: "2026-08-01T00:00:00.000Z",
};
const intent = { resultId: "query_1", title: "渠道销售变化归因", dimensionField: "channel", baselineField: "baseline", currentField: "current", metric: "销售额" };

describe("descriptive attribution", () => {
  it("computes totals, change rate, and signed contributions deterministically", () => {
    const artifact = createAttributionArtifact(intent, query);
    expect(artifact).toMatchObject({ baselineTotal: 180, currentTotal: 210, delta: 30, changeRate: 1 / 6, method: "period-over-period-contribution", sourceName: "sales.csv" });
    expect(artifact.contributions).toEqual([
      expect.objectContaining({ dimension: "线上", delta: 40, contributionShare: 4 / 3 }),
      expect.objectContaining({ dimension: "门店", delta: -10, contributionShare: -1 / 3 }),
    ]);
  });

  it("returns null shares when total change is zero", () => {
    const artifact = createAttributionArtifact(intent, { ...query, rows: [{ channel: "线上", baseline: 100, current: 110 }, { channel: "门店", baseline: 80, current: 70 }] });
    expect(artifact.delta).toBe(0);
    expect(artifact.contributions.every((item) => item.contributionShare === null)).toBe(true);
    expect(artifact.caveats).toContain("总体变化为零，因此各维度贡献比例不适用。");
  });

  it("rejects truncated, duplicate, unknown, and nonnumeric inputs", () => {
    expect(() => createAttributionArtifact(intent, { ...query, truncated: true })).toThrow(/truncated/);
    expect(() => createAttributionArtifact(intent, { ...query, rows: [query.rows[0]!, query.rows[0]!] })).toThrow(/unique/);
    expect(() => createAttributionArtifact({ ...intent, currentField: "missing" }, query)).toThrow(/query result column/);
    expect(() => createAttributionArtifact(intent, { ...query, rows: [{ channel: "线上", baseline: 1, current: "bad" }] })).toThrow(/finite numeric/);
  });
});
