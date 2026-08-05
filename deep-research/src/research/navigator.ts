import { defineTool, type ToolDefinition } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { describeGrid } from "../android/grid.js";
import {
  isWeChatPublicComponent, isWeChatPublicSearchComponent, type AndroidObservation,
} from "../android/driver.js";
import { createResearchSession } from "./model-session.js";
import type { NavigationOutcome, PlatformAdapter, PlatformContext } from "./platform.js";
import { assertSafeTap, assertSearchInput, detectHumanBlocker, READ_ONLY_POLICY, type TapIntent } from "./safety.js";
import type { CandidateRecord, ContentRecord, Platform, ResearchQuery } from "./types.js";
import { clamp, id } from "./utils.js";

const PACKAGES: Record<Platform, string> = {
  xiaohongshu: "com.xingin.xhs",
  douyin: "com.ss.android.ugc.aweme",
  wechat: "com.tencent.mm",
};

const LABELS: Record<Platform, string> = { xiaohongshu: "小红书", douyin: "抖音", wechat: "微信" };
const tapIntentSchema = Type.Union(["search", "result", "expand", "comments", "article", "navigation", "playback"]
  .map((v) => Type.Literal(v)));
const confidenceSchema = Type.Union(["low", "medium", "high"].map((v) => Type.Literal(v)));
const stanceSchema = Type.Union(["support", "oppose", "mixed", "question", "neutral"].map((v) => Type.Literal(v)));
const engagementSchema = Type.Optional(Type.Record(Type.String(), Type.Union([Type.Number(), Type.String()])));

interface NavigationState {
  lastObservation?: AndroidObservation;
  evidenceIds: string[];
  submitted: number;
  needsHuman?: string;
  lastTapIntent?: TapIntent;
  publicSurfaceReady?: boolean;
  frameEvidenceIds: string[];
  observations: number;
  taps: number;
  swipes: number;
  frames: number;
  exhausted?: string;
}

interface NavigationBudget {
  observations: number;
  taps: number;
  swipes: number;
  frames: number;
}

const BUDGETS: Record<"search" | "detail" | "comments" | "recover", NavigationBudget> = {
  search: { observations: 8, taps: 8, swipes: 5, frames: 0 },
  detail: { observations: 10, taps: 8, swipes: 5, frames: 3 },
  comments: { observations: 10, taps: 6, swipes: 6, frames: 0 },
  recover: { observations: 4, taps: 4, swipes: 2, frames: 0 },
};

export class AgentPlatformAdapter implements PlatformAdapter {
  readonly platform: Platform;
  private wechatPublicSessionReady = false;
  constructor(private readonly context: PlatformContext) { this.platform = context.platform; }

  search(query: ResearchQuery, limit: number): Promise<NavigationOutcome> {
    const tools = this.baseTools("search");
    tools.tools.push(this.candidateSubmitTool(tools.state, query, limit));
    return this.run(tools, `
在${LABELS[this.platform]}中搜索 ${JSON.stringify(query.text)}，扫描公开搜索结果并提交最多 ${limit} 个不同候选。
每屏先 observe，再从当前可见结果提取标题、作者、摘要、排名和互动数；每个候选都要引用本屏 evidence ID。
需要滚动时使用 research_swipe。达到数量、结果耗尽或连续两屏无新候选后结束。
${this.platformInstructions("search")}
`);
  }

  collectDetail(candidate: CandidateRecord): Promise<NavigationOutcome> {
    const tools = this.baseTools("detail");
    tools.tools.push(this.contentSubmitTool(tools.state, candidate));
    return this.run(tools, `
定位并打开这个公开内容，然后采集详情：${JSON.stringify({ title: candidate.title, author: candidate.author, locator: candidate.locator })}。
如果当前不在对应页面，重新搜索定位；不要依赖旧坐标。展开被折叠的正文，滚动查看必要页面，并用 observe 留证。
只提交一次完整 ContentRecord。无法可靠找到时调用 research_needs_human 说明原因。
${this.platformInstructions("detail")}
`);
  }

  collectComments(content: ContentRecord, limit: number): Promise<NavigationOutcome> {
    const tools = this.baseTools("comments");
    tools.tools.push(this.commentSubmitTool(tools.state, content, limit));
    return this.run(tools, `
当前目标是公开内容 ${JSON.stringify(content.title)}。打开它的公开评论区，采集最多 ${limit} 条信息量高且观点多样的评论。
优先保留表达需求、痛点、场景、购买原因、反对意见或疑问的评论；跳过纯表情和无意义短句。
每屏先 observe，每条评论引用当前 evidence ID。禁止点赞、回复或打开评论者主页。
${this.platformInstructions("comments")}
`);
  }

  async recover(): Promise<NavigationOutcome> {
    const tools = this.baseTools("recover");
    return this.run(tools, `重新 observe 当前页面，关闭普通弹窗并回到${LABELS[this.platform]}的公开搜索入口。不要触碰互动控件。`);
  }

  private baseTools(stage: keyof typeof BUDGETS): { state: NavigationState; tools: ToolDefinition[] } {
    const budget = BUDGETS[stage];
    const state: NavigationState = { evidenceIds: [], frameEvidenceIds: [], submitted: 0,
      observations: 0, taps: 0, swipes: 0, frames: 0,
      publicSurfaceReady: this.platform === "wechat" ? this.wechatPublicSessionReady : undefined };
    const guard = () => {
      if (state.needsHuman) throw new Error(`任务正等待人工处理: ${state.needsHuman}`);
      if (state.exhausted) throw new Error(`${state.exhausted}。禁止继续导航；必须提交已有结构化结果或结束本轮。`);
    };
    const observe = defineTool({
      name: "research_observe", label: "Observe and Save Evidence",
      description: "观察当前屏幕，同时把原始截图与UI dump保存为证据。所有读取和点击前都应调用。",
      parameters: Type.Object({ note: Type.String() }),
      execute: async (_id, { note }) => {
        guard();
        if (state.observations >= budget.observations) {
          state.exhausted = `${stage} 阶段已达到 ${budget.observations} 次观察上限`;
          return textResult(`NAVIGATION_BUDGET_EXHAUSTED: ${state.exhausted}。立即使用已有 evidenceIds 提交记录；不要再调用观察、点击或滑动。`);
        }
        if (await this.context.driver.isLocked()) {
          state.needsHuman = "手机仍处于系统锁屏，请手动解锁并保持屏幕亮起；锁屏画面不会截图或发送给模型";
          return textResult(`BLOCKED: ${state.needsHuman}`);
        }
        if (this.platform === "wechat") {
          const component = await this.context.driver.foregroundComponent();
          const allowed = state.publicSurfaceReady
            ? isWeChatPublicComponent(component)
            : isWeChatPublicSearchComponent(component);
          if (!allowed) {
            state.needsHuman = "为保护私域数据，请先手动进入微信“发现 → 搜一搜”；当前页面不会截图或发送给模型";
            return textResult(`BLOCKED: ${state.needsHuman}`);
          }
          state.publicSurfaceReady = true;
          this.wechatPublicSessionReady = true;
        }
        const captured = await this.context.evidence.capture(this.platform, note);
        state.observations++;
        state.lastObservation = captured.observation;
        state.evidenceIds = [captured.screenshotId, captured.dumpId];
        const blocker = detectHumanBlocker(captured.observation.formatted);
        if (blocker) state.needsHuman = `检测到需要人工处理的页面: ${blocker}`;
        return { content: [
          { type: "text" as const, text: `evidenceIds=${state.evidenceIds.join(",")}\npackage=${captured.observation.packageName ?? "?"}\n${captured.observation.formatted}\n${describeGrid(captured.width, captured.height, captured.gridStep)}${state.needsHuman ? `\nBLOCKED: ${state.needsHuman}` : ""}` },
          { type: "image" as const, mimeType: "image/png", data: captured.modelImage.toString("base64") },
        ], details: { evidenceIds: state.evidenceIds } };
      },
    });
    const launch = defineTool({
      name: "research_launch_platform", label: "Launch Research Platform",
      description: `启动${LABELS[this.platform]}，仅用于公开内容研究。`, parameters: Type.Object({}),
      execute: async () => { guard();
        if (this.platform === "wechat") {
          try {
            await this.context.driver.launchWeChatPublicSearch();
            state.publicSurfaceReady = true;
            this.wechatPublicSessionReady = true;
          }
          catch (error) { state.needsHuman = (error as Error).message; return textResult(`BLOCKED: ${state.needsHuman}`); }
        } else await this.context.driver.launchPackage(PACKAGES[this.platform]);
        return textResult(`已启动${LABELS[this.platform]}，请立即 observe。`); },
    });
    const tap = defineTool({
      name: "research_tap", label: "Safe Read-only Tap",
      description: "只读导航单击。必须声明导航意图；安全策略会阻止疑似互动控件。",
      parameters: Type.Object({ x: Type.Number(), y: Type.Number(), intent: tapIntentSchema }),
      execute: async (_id, args) => { guard(); assertSafeTap(state.lastObservation, args.x, args.y, args.intent as TapIntent);
        if (state.taps >= budget.taps) {
          state.exhausted = `${stage} 阶段已达到 ${budget.taps} 次点击上限`;
          return textResult(`NAVIGATION_BUDGET_EXHAUSTED: ${state.exhausted}。立即提交已有结果或结束。`);
        }
        await this.context.driver.tap(args.x, args.y); state.lastTapIntent = args.intent as TapIntent;
        state.taps++;
        return textResult("已单击，请重新 observe。 "); },
    });
    const swipe = defineTool({
      name: "research_swipe", label: "Read-only Swipe", description: "滚动当前公开列表或正文。",
      parameters: Type.Object({ x1: Type.Number(), y1: Type.Number(), x2: Type.Number(), y2: Type.Number(),
        durationMs: Type.Optional(Type.Number()) }),
      execute: async (_id, a) => { guard(); if (!state.lastObservation) throw new Error("滑动前必须 observe");
        if (state.swipes >= budget.swipes) {
          state.exhausted = `${stage} 阶段已达到 ${budget.swipes} 次滑动上限`;
          return textResult(`NAVIGATION_BUDGET_EXHAUSTED: ${state.exhausted}。立即提交已有结果或结束。`);
        }
        await this.context.driver.swipe(a.x1, a.y1, a.x2, a.y2, clamp(a.durationMs ?? 300, 100, 1500));
        state.swipes++;
        return textResult("已滑动，请重新 observe。"); },
    });
    const input = defineTool({
      name: "research_input_search", label: "Input Search Query",
      description: "仅向已聚焦的搜索框输入查询词。不得用于评论、私信或聊天输入框。",
      parameters: Type.Object({ text: Type.String() }),
      execute: async (_id, { text }) => { guard(); assertSearchInput(state.lastObservation);
        if (!state.lastObservation?.nodes.length && state.lastTapIntent !== "search") {
          throw new Error("视觉页面必须先以 search 意图点击搜索框，才能输入搜索词");
        }
        await this.context.driver.inputText(text); return textResult("已输入搜索词，请 observe 确认，不要输入其他位置。"); },
    });
    const back = defineTool({
      name: "research_back", label: "Android Back", description: "返回上一页。",
      parameters: Type.Object({}), execute: async () => { await this.context.driver.key("KEYCODE_BACK"); return textResult("已返回，请 observe。"); },
    });
    const frame = defineTool({
      name: "research_capture_frame", label: "Capture Video Frame",
      description: "等待短暂时间后采集字幕/场景关键帧。仅用于抖音和图文页面。",
      parameters: Type.Object({ waitMs: Type.Optional(Type.Number()), note: Type.String() }),
      execute: async (_id, { waitMs, note }) => { guard();
        if (budget.frames === 0 || state.frames >= budget.frames) {
          state.exhausted = `${stage} 阶段已达到 ${budget.frames} 个关键帧上限`;
          return textResult(`FRAME_BUDGET_EXHAUSTED: ${state.exhausted}。立即提交已有结果或结束。`);
        }
        await new Promise((resolve) => setTimeout(resolve, clamp(waitMs ?? 0, 0, 5000)));
        const captured = await this.context.evidence.capture(this.platform, note, "frame");
        state.lastObservation = captured.observation; state.evidenceIds.push(captured.screenshotId, captured.dumpId);
        state.frameEvidenceIds.push(captured.screenshotId);
        state.frames++;
        return { content: [{ type: "text" as const, text: `关键帧 evidenceIds=${captured.screenshotId},${captured.dumpId}` },
          { type: "image" as const, mimeType: "image/png", data: captured.modelImage.toString("base64") }], details: {} };
      },
    });
    const needsHuman = defineTool({
      name: "research_needs_human", label: "Pause for Human",
      description: "遇到登录、验证码、风控、隐私边界或无法可靠识别页面时暂停。",
      parameters: Type.Object({ reason: Type.String() }), execute: async (_id, { reason }) => {
        state.needsHuman = reason; return textResult(`任务已暂停等待人工: ${reason}`);
      },
    });
    return { state, tools: [observe, launch, tap, swipe, input, back, frame, needsHuman] };
  }

  private candidateSubmitTool(state: NavigationState, query: ResearchQuery, limit: number): ToolDefinition {
    return defineTool({ name: "submit_candidate", label: "Submit Candidate",
      description: "提交一个当前屏幕中可见的公开内容候选。",
      parameters: Type.Object({ title: Type.String(), author: Type.Optional(Type.String()), snippet: Type.Optional(Type.String()),
        publishedAt: Type.Optional(Type.String()), engagement: engagementSchema, rank: Type.Number(), relevance: Type.Number(),
        novelty: Type.Number(), locator: Type.String(), evidenceIds: Type.Array(Type.String()) }),
      execute: async (_id, a) => {
        if (state.submitted >= limit) return textResult(`已达到本查询 ${limit} 条候选上限，停止提交。`);
        this.assertEvidence(a.evidenceIds);
        const result = this.context.store.addCandidate({ id: id("cand"), runId: this.context.runId,
          queryId: query.id, platform: this.platform, title: a.title, author: a.author, snippet: a.snippet,
          publishedAt: a.publishedAt, engagement: a.engagement, rank: Math.max(1, Math.round(a.rank)),
          relevance: clamp(a.relevance, 0, 1), novelty: clamp(a.novelty, 0, 1), locator: a.locator,
          evidenceIds: a.evidenceIds });
        if (result.inserted) state.submitted++;
        if (state.submitted >= limit) state.exhausted = `本查询已提交 ${limit} 条候选`;
        return textResult(result.inserted
          ? `候选已保存: ${result.id}${state.exhausted ? "。已达到上限，立即结束本轮。" : ""}`
          : `重复候选，已跳过: ${result.id}`);
      } });
  }

  private contentSubmitTool(state: NavigationState, candidate: CandidateRecord): ToolDefinition {
    return defineTool({ name: "submit_content", label: "Submit Content Detail",
      description: "提交目标公开内容的完整详情，事实必须来自引用的证据。",
      parameters: Type.Object({ title: Type.String(), body: Type.String(), author: Type.Optional(Type.String()),
        publishedAt: Type.Optional(Type.String()), engagement: engagementSchema, visualSummary: Type.Optional(Type.String()),
        canonicalUrl: Type.Optional(Type.String()), locator: Type.String(), confidence: confidenceSchema,
        evidenceIds: Type.Array(Type.String()) }),
      execute: async (_id, a) => {
        if (this.platform === "douyin" && state.frameEvidenceIds.length < 3) {
          throw new Error("抖音详情必须先采集至少3个字幕/场景关键帧");
        }
        const missingFrames = state.frameEvidenceIds.filter((evidenceId) => !a.evidenceIds.includes(evidenceId));
        if (this.platform === "douyin" && missingFrames.length) {
          throw new Error(`抖音详情必须引用全部关键帧证据: ${missingFrames.join(",")}`);
        }
        this.assertEvidence(a.evidenceIds);
        const result = this.context.store.addContent({ id: id("content"), runId: this.context.runId,
          candidateId: candidate.id, platform: this.platform, title: a.title, body: a.body, author: a.author,
          publishedAt: a.publishedAt, engagement: a.engagement, visualSummary: a.visualSummary,
          canonicalUrl: a.canonicalUrl, locator: a.locator, confidence: a.confidence, evidenceIds: a.evidenceIds });
        if (result.inserted) state.submitted++;
        state.exhausted = "目标详情已提交";
        return textResult(result.inserted ? `详情已保存: ${result.id}。立即结束本轮。` : `详情已存在: ${result.id}。立即结束本轮。`); } });
  }

  private commentSubmitTool(state: NavigationState, content: ContentRecord, limit: number): ToolDefinition {
    return defineTool({ name: "submit_comment", label: "Submit Public Comment",
      description: "提交一条公开评论，不得进入作者主页或收集联系方式。",
      parameters: Type.Object({ text: Type.String(), author: Type.Optional(Type.String()), engagement: engagementSchema,
        stance: Type.Optional(stanceSchema), evidenceIds: Type.Array(Type.String()) }),
      execute: async (_id, a) => {
        if (state.submitted >= limit) return textResult(`已达到本次 ${limit} 条评论上限，停止提交。`);
        this.assertEvidence(a.evidenceIds);
        const result = this.context.store.addComment({ id: id("comment"), runId: this.context.runId,
          contentId: content.id, platform: this.platform, text: a.text, author: a.author,
          engagement: a.engagement, stance: a.stance, evidenceIds: a.evidenceIds });
        if (result.inserted) state.submitted++;
        if (state.submitted >= limit) state.exhausted = `已提交 ${limit} 条评论`;
        return textResult(result.inserted
          ? `评论已保存${state.exhausted ? "。已达到上限，立即结束本轮。" : ""}`
          : "重复评论，已跳过"); } });
  }

  private assertEvidence(evidenceIds: string[]): void {
    if (!evidenceIds.length) throw new Error("提交记录必须至少引用一个 evidence ID");
    const missing = evidenceIds.filter((evidenceId) => !this.context.store.evidenceExists(this.context.runId, evidenceId));
    if (missing.length) throw new Error(`不存在的 evidence ID: ${missing.join(",")}`);
  }

  private async run(bundle: { state: NavigationState; tools: ToolDefinition[] }, task: string): Promise<NavigationOutcome> {
    const session = await createResearchSession(`
你是${LABELS[this.platform]}公开内容研究 Navigator/Extractor。你只能使用提供的研究工具。
${READ_ONLY_POLICY}
记录只能来自当前实际观察，不得根据常识补写；每条提交必须引用 research_observe 返回的 evidence ID。
视觉截图带坐标网格，坐标优先使用 UI dump 的 center；只有控件树不可用时才依据网格定位。
${this.platformInstructions("global")}
完成后停止，不要输出未经结构化提交的研究数据。
每个阶段有严格的观察/点击/滑动预算。收到 NAVIGATION_BUDGET_EXHAUSTED 后，禁止再导航；应立即用已有证据提交可验证的结果，信息不完整则降低 confidence，无法提交则结束本轮。
`.trim(), bundle.tools);
    try { await session.prompt(task); } finally { session.dispose(); }
    return { submitted: bundle.state.submitted, needsHuman: bundle.state.needsHuman };
  }

  private platformInstructions(stage: string): string {
    if (this.platform === "wechat") return `
微信严格只允许从“发现 → 搜一搜”进入公开搜索，并只打开标记为公众号、文章的公开结果。
禁止使用微信顶部全局搜索，禁止查看聊天、群聊、联系人、朋友圈、收藏和订阅号消息列表。
${stage === "detail" ? "文章正文可逐屏滚动采集；不要点击文末点赞、在看、赞赏、写留言或分享。" : ""}`.trim();
    if (this.platform === "douyin") return `
只读取搜索结果、视频公开信息和公开评论。单击播放区域仅可用于播放/暂停，严禁双击。
${stage === "detail" ? "在约0秒、3秒、6秒各调用一次 research_capture_frame，结合字幕和画面形成 visualSummary；不推断未听清的语音。" : ""}`.trim();
    return `
只读取小红书公开搜索结果、笔记正文/图片文字和公开评论。禁止点赞、收藏、关注、评论、私信、分享和进入用户主页。
${stage === "detail" ? "图文笔记可采集最多3个有信息量的页面关键帧，引用对应证据。" : ""}`.trim();
  }
}

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }], details: {} };
}
