import assert from "node:assert/strict";
import test from "node:test";
import { SaturationTracker, selectCandidates } from "./selection.js";
import type { CandidateRecord } from "./types.js";

const candidate = (id: string, queryId: string, relevance: number): CandidateRecord => ({
  id, runId: "run", queryId, platform: "xiaohongshu", title: `标题${id}`, rank: 1,
  relevance, novelty: 0.5, locator: id, evidenceIds: ["ev"],
});

test("candidate selection preserves query diversity", () => {
  const result = selectCandidates([
    candidate("a", "q1", 1), candidate("b", "q1", 0.9), candidate("c", "q2", 0.4),
  ], 2);
  assert.deepEqual(new Set(result.map((item) => item.queryId)), new Set(["q1", "q2"]));
});

test("saturation requires two consecutive stale batches", () => {
  const tracker = new SaturationTracker();
  assert.equal(tracker.addBatch(["消费者反复提到续航不足和充电麻烦"]).saturated, false);
  assert.equal(tracker.addBatch(["消费者反复提到续航不足和充电麻烦"]).saturated, false);
  assert.equal(tracker.addBatch(["消费者反复提到续航不足和充电麻烦"]).saturated, true);
});
