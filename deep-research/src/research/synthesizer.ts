import { createResearchSession, parseJsonObject, promptForText } from "./model-session.js";
import type { ResearchStore } from "./store.js";
import { PLATFORMS, type Insight, type Platform } from "./types.js";
import { id } from "./utils.js";

const CATEGORIES = ["need", "pain", "scenario", "decision", "trend", "difference", "limitation"] as const;
const CONFIDENCES = ["low", "medium", "high"] as const;

export async function synthesize(runId: string, store: ResearchStore): Promise<Insight[]> {
  const contents = store.listContents(runId).map((item) => ({
    ...item, body: item.body.slice(0, 800), visualSummary: item.visualSummary?.slice(0, 300),
  }));
  const comments = store.listComments(runId).slice(0, 120).map((item) => ({ ...item, text: item.text.slice(0, 180) }));
  const session = await createResearchSession(`
你是证据驱动的消费者与市场研究 Synthesizer。你只能分析输入的结构化记录，不能操作手机或补造来源。
提炼需求、痛点、使用场景、决策因素、趋势、跨平台差异与研究限制；主动寻找反例和意见分歧。
每个事实性洞见必须引用记录中真实存在的 evidenceIds；反例放入 counterEvidenceIds。
置信度 high 需要多个独立内容且最好跨平台支持；单一来源不得标 high。
所有数量仅代表本次样本，不得外推总体。只返回 JSON，不要 Markdown、代码围栏或解释：
{"insights":[{"category":"need|pain|scenario|decision|trend|difference|limitation","title":"...","finding":"...","platforms":["xiaohongshu|douyin|wechat"],"evidenceIds":["ev_..."],"counterEvidenceIds":[],"confidence":"low|medium|high"}]}
`.trim(), []);
  let raw: Record<string, unknown>;
  try {
    raw = parseJsonObject(await promptForText(session, JSON.stringify({ brief: store.getRun(runId).brief, contents, comments,
      errors: store.listErrors(runId), instruction: "基于证据综合，使用中文。" }), 120_000));
  } finally { session.dispose(); }
  if (!Array.isArray(raw.insights)) throw new Error("Synthesizer 缺少 insights 数组");
  const submitted: Insight[] = raw.insights.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`洞见 #${index + 1} 不是对象`);
    const item = value as Record<string, unknown>;
    if (typeof item.category !== "string" || !CATEGORIES.includes(item.category as (typeof CATEGORIES)[number])) throw new Error(`洞见 #${index + 1} category 无效`);
    if (typeof item.title !== "string" || typeof item.finding !== "string") throw new Error(`洞见 #${index + 1} 缺少标题或结论`);
    if (!Array.isArray(item.platforms) || item.platforms.some((p) => typeof p !== "string" || !PLATFORMS.includes(p as Platform))) throw new Error(`洞见 #${index + 1} platforms 无效`);
    if (!Array.isArray(item.evidenceIds) || item.evidenceIds.some((ev) => typeof ev !== "string")) throw new Error(`洞见 #${index + 1} evidenceIds 无效`);
    if (!Array.isArray(item.counterEvidenceIds) || item.counterEvidenceIds.some((ev) => typeof ev !== "string")) throw new Error(`洞见 #${index + 1} counterEvidenceIds 无效`);
    if (typeof item.confidence !== "string" || !CONFIDENCES.includes(item.confidence as (typeof CONFIDENCES)[number])) throw new Error(`洞见 #${index + 1} confidence 无效`);
    const evidenceIds = item.evidenceIds as string[];
    const counterEvidenceIds = item.counterEvidenceIds as string[];
    const missing = [...evidenceIds, ...counterEvidenceIds].filter((evidenceId) => !store.evidenceExists(runId, evidenceId));
    if (missing.length) throw new Error(`洞见引用了不存在的证据: ${missing.join(",")}`);
    if (item.category !== "limitation" && evidenceIds.length === 0) throw new Error(`洞见“${item.title}”没有支撑证据`);
    return { id: id("insight"), runId, category: item.category as Insight["category"], title: item.title,
      finding: item.finding, platforms: item.platforms as Platform[], evidenceIds, counterEvidenceIds,
      confidence: item.confidence as Insight["confidence"] };
  });
  if (!submitted.length) throw new Error("Synthesizer 未生成任何洞见");
  store.replaceInsights(runId, submitted);
  return submitted;
}
