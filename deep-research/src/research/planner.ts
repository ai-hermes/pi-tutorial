import { createResearchSession, parseJsonObject, promptForText } from "./model-session.js";
import { PLATFORMS, type Platform, type ResearchBrief, type ResearchBudget } from "./types.js";
import { id } from "./utils.js";

const INTENTS = ["core", "scenario", "pain", "counter", "trend"] as const;

export interface PlannerInput {
  question: string;
  context?: string;
  since?: string;
  budget: ResearchBudget;
  platforms?: Platform[];
}

export async function planResearch(input: PlannerInput): Promise<ResearchBrief> {
  const platforms = input.platforms?.length ? input.platforms : [...PLATFORMS];
  const session = await createResearchSession(`
你是消费者与市场研究 Planner。你只能制定计划，不能操作手机。
把用户问题拆成明确研究范围、目标受众，并为小红书、抖音、微信分别生成3到5个中文搜索查询。
查询应覆盖核心概念、使用场景、痛点和至少一个反向/争议视角，避免只有品牌宣传词。
微信查询用于搜一搜和公众号公开文章。不要包含私聊、群聊、联系人或任何非公开数据。
只返回一个 JSON 对象，不要 Markdown、代码围栏或解释。格式：
{"audience":"...","scope":"...","queries":[{"platform":"xiaohongshu|douyin|wechat","text":"...","intent":"core|scenario|pain|counter|trend"}]}
`.trim(), []);
  let raw: Record<string, unknown>;
  try {
    raw = parseJsonObject(await promptForText(session, JSON.stringify({
      question: input.question, context: input.context ?? null, since: input.since ?? null,
      requiredPlatforms: platforms, perPlatformQueries: "3-5",
    }), 60_000));
  } finally { session.dispose(); }
  if (typeof raw.audience !== "string" || !raw.audience.trim()) throw new Error("Planner 缺少 audience");
  if (typeof raw.scope !== "string" || !raw.scope.trim()) throw new Error("Planner 缺少 scope");
  if (!Array.isArray(raw.queries)) throw new Error("Planner 缺少 queries 数组");
  const queries = raw.queries.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`Planner 查询 #${index + 1} 不是对象`);
    const query = item as Record<string, unknown>;
    if (typeof query.platform !== "string" || !platforms.includes(query.platform as Platform)) {
      throw new Error(`Planner 查询 #${index + 1} 平台无效`);
    }
    if (typeof query.text !== "string" || !query.text.trim()) throw new Error(`Planner 查询 #${index + 1} 缺少 text`);
    if (typeof query.intent !== "string" || !INTENTS.includes(query.intent as (typeof INTENTS)[number])) {
      throw new Error(`Planner 查询 #${index + 1} intent 无效`);
    }
    return { id: id("q"), platform: query.platform as Platform, text: query.text.trim(),
      intent: query.intent as ResearchBrief["queries"][number]["intent"] };
  });
  for (const platform of platforms) {
    const platformQueries = queries.filter((query) => query.platform === platform);
    if (platformQueries.length < 3 || platformQueries.length > 5) throw new Error(`Planner 为 ${platform} 生成了 ${platformQueries.length} 个查询，应为3到5个`);
    if (!platformQueries.some((query) => query.intent === "counter")) throw new Error(`Planner 缺少 ${platform} 的反向/争议查询`);
  }
  return {
    question: input.question, context: input.context, since: input.since,
    audience: raw.audience.trim(), scope: raw.scope.trim(), queries,
    budget: input.budget, platforms,
  };
}
