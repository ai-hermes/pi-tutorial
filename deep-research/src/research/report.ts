import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ResearchStore } from "./store.js";
import type { Insight, Platform } from "./types.js";

const PLATFORM_NAME: Record<Platform, string> = { xiaohongshu: "小红书", douyin: "抖音", wechat: "微信" };
const CATEGORY_NAME: Record<Insight["category"], string> = {
  need: "消费需求", pain: "核心痛点", scenario: "使用场景", decision: "决策因素",
  trend: "趋势信号", difference: "跨平台差异", limitation: "信息缺口与限制",
};

export async function writeReport(runId: string, runDir: string, store: ResearchStore): Promise<string> {
  const run = store.getRun(runId);
  const contents = store.listContents(runId);
  const comments = store.listComments(runId);
  const candidates = store.listCandidates(runId);
  const evidence = store.listEvidence(runId);
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  const insights = store.listInsights(runId);
  const errors = store.listErrors(runId);
  const counts = run.brief.platforms.map((platform) => ({ platform,
    candidates: candidates.filter((item) => item.platform === platform).length,
    contents: contents.filter((item) => item.platform === platform).length,
    comments: comments.filter((item) => item.platform === platform).length }));
  const cite = (ids: string[]) => ids.map((evidenceId) => {
    const item = evidenceById.get(evidenceId);
    return item ? `[${evidenceId}](${item.path})` : `~~${evidenceId}~~`;
  }).join("、");
  const renderInsight = (item: Insight) => [
    `### ${item.title}`,
    "",
    `${item.finding}`,
    "",
    `- 平台：${item.platforms.map((p) => PLATFORM_NAME[p]).join("、") || "未指定"}`,
    `- 置信度：${item.confidence}`,
    `- 支撑证据：${cite(item.evidenceIds) || "无"}`,
    ...(item.counterEvidenceIds.length ? [`- 反例证据：${cite(item.counterEvidenceIds)}`] : []),
  ].join("\n");
  const groups = Object.keys(CATEGORY_NAME) as Insight["category"][];
  const categoryName: Record<Insight["category"], string> = {
    ...CATEGORY_NAME,
    difference: run.brief.platforms.length > 1 ? "跨平台差异" : "方案路径差异",
  };
  const lines = [
    `# ${run.brief.question}`,
    "", `> 任务 ID：${run.id}  `, `> 生成时间：${new Date().toISOString()}  `,
    `> 研究范围：${run.brief.scope}`, "",
    "## 执行摘要", "",
    insights.length ? insights.slice(0, 5).map((item) => `- **${item.title}**：${item.finding}（${cite(item.evidenceIds)}）`).join("\n")
      : "本次任务没有形成可验证洞见。请查看信息缺口和执行错误。",
    "", "## 核心洞见", "",
    ...groups.flatMap((category) => {
      const items = insights.filter((item) => item.category === category);
      return [`### ${categoryName[category]}`, "", items.length ? items.map(renderInsight).join("\n\n") : "暂无足够证据。", ""];
    }),
    "## 样本与方法", "",
    "本报告基于登录账号在客户端中可正常浏览的公开内容。数字只描述本次有界样本，不代表平台总体。",
    "", "| 平台 | 候选 | 深挖内容 | 评论 |", "|---|---:|---:|---:|",
    ...counts.map((item) => `| ${PLATFORM_NAME[item.platform]} | ${item.candidates} | ${item.contents} | ${item.comments} |`),
    "", `时间条件：${run.brief.since ?? "未指定"}  `,
    `目标受众：${run.brief.audience}  `,
    `采集预算：候选 ${run.brief.budget.candidateLimit}/平台，深挖 ${run.brief.budget.detailLimit}/平台，评论 ${run.brief.budget.commentLimit}/平台。`,
    "", "## 执行失败与限制", "",
    errors.length ? errors.map((item) => `- ${item.platform ? PLATFORM_NAME[item.platform] : "全局"} / ${item.stage}：${item.message}`).join("\n")
      : "- 未记录执行错误。",
    ...(run.brief.platforms.includes("douyin")
      ? ["- 抖音仅解析可见字幕和关键帧，不保证覆盖无字幕语音。"]
      : []),
    "- 排序、推荐和可见内容受到账号、时间和平台算法影响。",
    "", "## 来源附录", "",
    ...contents.flatMap((item, index) => [
      `### ${index + 1}. [${PLATFORM_NAME[item.platform]}] ${item.title}`,
      "", `- 作者：${item.author ?? "未记录"}`,
      `- 发布时间：${item.publishedAt ?? "未记录"}`,
      `- 来源：${item.canonicalUrl ? `[链接](${item.canonicalUrl})` : item.locator}`,
      `- 证据：${cite(item.evidenceIds)}`, "",
    ]),
  ];
  const reportPath = join(runDir, "report.md");
  await writeFile(reportPath, lines.join("\n"), "utf8");
  const exportRows = [
    ...candidates.map((value) => ({ type: "candidate", value })),
    ...contents.map((value) => ({ type: "content", value })),
    ...comments.map((value) => ({ type: "comment", value })),
    ...insights.map((value) => ({ type: "insight", value })),
    ...evidence.map((value) => ({ type: "evidence", value })),
  ];
  await writeFile(join(runDir, "export.jsonl"), exportRows.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");
  return reportPath;
}
