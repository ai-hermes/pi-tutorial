import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { writeReport } from "./report.js";
import { ResearchStore } from "./store.js";
import type { ResearchBrief } from "./types.js";

const brief: ResearchBrief = {
  question: "测试研究", audience: "消费者", scope: "公开内容", platforms: ["xiaohongshu", "douyin", "wechat"],
  budget: { candidateLimit: 40, detailLimit: 12, commentLimit: 80 },
  queries: [{ id: "q1", platform: "xiaohongshu", text: "测试", intent: "counter" }],
};

test("store deduplicates records, restores checkpoints and report keeps citations", async () => {
  const dir = await mkdtemp(join(tmpdir(), "android-research-store-"));
  const store = new ResearchStore(join(dir, "research.sqlite"));
  try {
    store.createRun("run1", brief);
    store.addEvidence({ id: "ev1", runId: "run1", platform: "xiaohongshu", kind: "screenshot",
      path: "evidence/ev1.png", capturedAt: new Date().toISOString(), sha256: "hash" });
    const base = { id: "c1", runId: "run1", queryId: "q1", platform: "xiaohongshu" as const,
      title: "续航体验", author: "公开作者", rank: 1, relevance: 0.9, novelty: 0.8,
      locator: "query=测试,rank=1", evidenceIds: ["ev1"] };
    assert.equal(store.addCandidate(base).inserted, true);
    assert.equal(store.addCandidate({ ...base, id: "c2" }).inserted, false);
    store.addContent({ id: "content1", runId: "run1", candidateId: "c1", platform: "xiaohongshu",
      title: "续航体验", body: "续航不足是主要痛点", author: "公开作者", locator: base.locator,
      confidence: "high", evidenceIds: ["ev1"] });
    store.replaceInsights("run1", [{ id: "i1", runId: "run1", category: "pain", title: "续航痛点",
      finding: "样本中出现续航不足反馈", platforms: ["xiaohongshu"], evidenceIds: ["ev1"],
      counterEvidenceIds: [], confidence: "medium" }]);
    store.saveCheckpoint({ runId: "run1", platform: "xiaohongshu", stage: "detail", candidateId: "c1",
      recoveryAction: "重新搜索", updatedAt: new Date().toISOString() });
    assert.equal(store.getCheckpoint("run1", "xiaohongshu")?.candidateId, "c1");
    const report = await writeReport("run1", dir, store);
    const markdown = await readFile(report, "utf8");
    assert.match(markdown, /\[ev1\]\(evidence\/ev1\.png\)/);
    assert.match(markdown, /数字只描述本次有界样本/);
    assert.match(await readFile(join(dir, "export.jsonl"), "utf8"), /"type":"content"/);
  } finally { store.close(); }
});
