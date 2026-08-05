import { createInterface } from "node:readline/promises";
import type { AndroidDriver } from "../android/driver.js";
import { EvidenceRepository } from "./evidence.js";
import { AgentPlatformAdapter } from "./navigator.js";
import type { NavigationOutcome } from "./platform.js";
import { writeReport } from "./report.js";
import { SaturationTracker, selectCandidates } from "./selection.js";
import type { ResearchStore } from "./store.js";
import { synthesize } from "./synthesizer.js";
import type { CandidateRecord, Checkpoint, Insight, Platform } from "./types.js";
import { id } from "./utils.js";

export class HumanInterventionRequired extends Error {
  constructor(readonly reason: string) { super(reason); this.name = "HumanInterventionRequired"; }
}

export class ResearchOrchestrator {
  constructor(
    private readonly runId: string,
    private readonly runDir: string,
    private readonly store: ResearchStore,
    private readonly driver: AndroidDriver,
  ) {}

  async execute(): Promise<string> {
    const run = this.store.getRun(this.runId);
    this.store.updateRun(this.runId, "running", "collection");
    for (const platform of run.brief.platforms) await this.collectPlatform(platform);
    this.store.updateRun(this.runId, "running", "synthesis");
    try {
      await synthesize(this.runId, this.store);
    } catch (error) {
      this.store.addError(this.runId, "synthesis", (error as Error).message);
      if (!this.store.listInsights(this.runId).length) {
        const fallback: Insight = { id: id("insight"), runId: this.runId, category: "limitation",
          title: "自动综合未完成", finding: `结构化采集结果已经保留，但自动综合失败：${(error as Error).message}`,
          platforms: [], evidenceIds: [], counterEvidenceIds: [], confidence: "low" };
        this.store.replaceInsights(this.runId, [fallback]);
      }
    }
    this.store.updateRun(this.runId, "running", "reporting");
    const reportPath = await writeReport(this.runId, this.runDir, this.store);
    this.store.updateRun(this.runId, "completed", "completed");
    return reportPath;
  }

  private async collectPlatform(platform: Platform): Promise<void> {
    const brief = this.store.getRun(this.runId).brief;
    const evidence = new EvidenceRepository(this.runId, this.runDir, this.store, this.driver);
    const adapter = new AgentPlatformAdapter({ runId: this.runId, runDir: this.runDir,
      platform, driver: this.driver, evidence, store: this.store });
    const queries = this.store.listQueries(this.runId, platform);
    const perQuery = Math.max(1, Math.ceil(brief.budget.candidateLimit / Math.max(queries.length, 1)));
    for (const query of queries) {
      const all = this.store.listCandidates(this.runId, platform);
      if (all.length >= brief.budget.candidateLimit) break;
      const existing = all.filter((item) => item.queryId === query.id).length;
      if (existing >= perQuery) continue;
      const checkpoint = this.checkpoint(platform, "search", query.id, undefined,
        `重新打开${platform}并搜索 ${query.text}`);
      try {
        await this.withHumanTakeover(adapter, () => adapter.search(query, perQuery - existing), checkpoint);
      } catch (error) {
        if (error instanceof HumanInterventionRequired) throw error;
        this.store.addError(this.runId, "search", `${query.text}: ${(error as Error).message}`, platform);
      }
      this.store.saveCheckpoint({ ...checkpoint, cursor: "query_completed", updatedAt: new Date().toISOString() });
    }

    const selected = selectCandidates(this.store.listCandidates(this.runId, platform), brief.budget.detailLimit);
    const saturation = new SaturationTracker();
    const existingContents = this.store.listContents(this.runId, platform);
    for (let i = 0; i < existingContents.length; i += 3) {
      saturation.addBatch(existingContents.slice(i, i + 3).map((item) => `${item.title}\n${item.body}\n${item.visualSummary ?? ""}`));
    }
    let batchTexts: string[] = [];
    let processed = existingContents.length;
    for (const candidate of selected) {
      let content = this.store.getContentByCandidate(candidate.id);
      if (!content) {
        const checkpoint = this.checkpoint(platform, "detail", candidate.queryId, candidate.id,
          `重新搜索并打开 ${candidate.title}`);
        try {
          await this.withHumanTakeover(adapter, () => adapter.collectDetail(candidate), checkpoint);
          content = this.store.getContentByCandidate(candidate.id);
        } catch (error) {
          if (error instanceof HumanInterventionRequired) throw error;
          this.store.addError(this.runId, "detail", `${candidate.title}: ${(error as Error).message}`, platform);
          continue;
        }
        if (!content) {
          this.store.addError(this.runId, "detail", `${candidate.title}: Navigator 未提交详情`, platform);
          continue;
        }
        processed++;
        batchTexts.push(`${content.title}\n${content.body}\n${content.visualSummary ?? ""}`);
      }

      const currentComments = this.store.listComments(this.runId, platform).filter((item) => item.contentId === content.id).length;
      const totalComments = this.store.countComments(this.runId, platform);
      const perContent = Math.max(1, Math.ceil(brief.budget.commentLimit / Math.max(brief.budget.detailLimit, 1)));
      const remaining = Math.max(0, brief.budget.commentLimit - totalComments);
      const commentTarget = Math.min(perContent - currentComments, remaining);
      if (commentTarget > 0) {
        const checkpoint = this.checkpoint(platform, "comments", candidate.queryId, candidate.id,
          `重新定位 ${candidate.title} 并打开公开评论`);
        try {
          await this.withHumanTakeover(adapter, () => adapter.collectComments(content!, commentTarget), checkpoint);
        } catch (error) {
          if (error instanceof HumanInterventionRequired) throw error;
          this.store.addError(this.runId, "comments", `${candidate.title}: ${(error as Error).message}`, platform);
        }
      }
      this.store.saveCheckpoint(this.checkpoint(platform, "item_completed", candidate.queryId, candidate.id, "继续下一个候选"));
      if (batchTexts.length >= 3) {
        const result = saturation.addBatch(batchTexts);
        batchTexts = [];
        if (result.saturated && processed >= Math.min(6, brief.budget.detailLimit)) break;
      }
    }
    this.store.saveCheckpoint(this.checkpoint(platform, "platform_completed", undefined, undefined, "无需恢复"));
  }

  private checkpoint(platform: Platform, stage: string, queryId: string | undefined,
    candidateId: string | undefined, recoveryAction: string): Checkpoint {
    return { runId: this.runId, platform, stage, queryId, candidateId, recoveryAction,
      updatedAt: new Date().toISOString() };
  }

  private async withHumanTakeover(
    adapter: AgentPlatformAdapter,
    action: () => Promise<NavigationOutcome>,
    checkpoint: Checkpoint,
  ): Promise<NavigationOutcome> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const outcome = await action();
      if (!outcome.needsHuman) return outcome;
      this.store.saveCheckpoint({ ...checkpoint, recoveryAction: outcome.needsHuman, updatedAt: new Date().toISOString() });
      this.store.updateRun(this.runId, "needs_input", checkpoint.stage, outcome.needsHuman);
      await this.waitForHuman(outcome.needsHuman);
      this.store.updateRun(this.runId, "running", checkpoint.stage);
      const recovered = await adapter.recover();
      if (recovered.needsHuman) {
        await this.waitForHuman(recovered.needsHuman);
      }
    }
    throw new HumanInterventionRequired("连续三次人工接管后仍无法恢复，请稍后使用 --resume 重试。");
  }

  private async waitForHuman(reason: string): Promise<void> {
    if (!process.stdin.isTTY) throw new HumanInterventionRequired(reason);
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try { await rl.question(`\n需要人工接管：${reason}\n请在手机上处理完成后按 Enter 继续，或 Ctrl-C 退出后使用 --resume。\n`); }
    finally { rl.close(); }
  }
}
