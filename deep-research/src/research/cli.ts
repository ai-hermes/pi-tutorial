import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { ensureDevice } from "../android/adb.js";
import { androidDriver } from "../android/driver.js";
import { ResearchOrchestrator, HumanInterventionRequired } from "./orchestrator.js";
import { planResearch } from "./planner.js";
import { ResearchStore } from "./store.js";
import { PLATFORMS, type Platform, type ResearchBudget, type ResearchBrief } from "./types.js";
import { runId as makeRunId } from "./utils.js";

interface CliOptions {
  question?: string;
  resume?: string;
  since?: string;
  context?: string;
  yes: boolean;
  budget: ResearchBudget;
  platforms: Platform[];
}

const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
process.chdir(packageRoot);
const researchRoot = join(packageRoot, ".deep-research", "runs");
const options = parseArgs(process.argv.slice(2));
if (!options.question && !options.resume) usage("必须提供 --question 或 --resume");
if (options.question && options.resume) usage("--question 与 --resume 不能同时使用");

let store: ResearchStore | undefined;
let activeRunId = options.resume;
let interrupted = false;
const onSigint = () => {
  if (interrupted) return;
  interrupted = true;
  if (store && activeRunId) {
    try { store.updateRun(activeRunId, "needs_input", "interrupted", "用户中断，可使用 --resume 继续"); } catch {}
    try { store.close(); } catch {}
  }
  process.stdout.write("\n任务已保存，可使用 --resume 继续。\n");
  process.exit(130);
};
process.on("SIGINT", onSigint);

try {
  let runDir: string;
  if (options.resume) {
    runDir = join(researchRoot, options.resume);
    const dbPath = join(runDir, "research.sqlite");
    if (!existsSync(dbPath)) throw new Error(`找不到任务 ${options.resume}: ${dbPath}`);
    store = new ResearchStore(dbPath);
    const run = store.getRun(options.resume);
    process.stdout.write(`恢复任务 ${run.id}: ${run.brief.question}\n阶段: ${run.stage}，状态: ${run.status}\n`);
  } else {
    const brief = await planResearch({ question: options.question!, context: options.context,
      since: options.since, budget: options.budget, platforms: options.platforms });
    printPlan(brief);
    if (!options.yes && !(await confirmPlan())) {
      process.stdout.write("已取消，未创建研究任务。\n");
      process.exit(0);
    }
    activeRunId = makeRunId();
    runDir = join(researchRoot, activeRunId);
    mkdirSync(runDir, { recursive: true });
    store = new ResearchStore(join(runDir, "research.sqlite"));
    store.createRun(activeRunId, brief);
    process.stdout.write(`研究任务已创建: ${activeRunId}\n`);
  }
  const device = await ensureDevice();
  process.stdout.write(`已连接设备: ${device.serial}\n`);
  const orchestrator = new ResearchOrchestrator(activeRunId!, runDir, store, androidDriver);
  const reportPath = await orchestrator.execute();
  process.stdout.write(`\n研究完成。报告: ${reportPath}\n数据目录: ${runDir}\n`);
} catch (error) {
  if (store && activeRunId) {
    if (error instanceof HumanInterventionRequired || /没有在线的安卓设备|不在线/.test((error as Error).message)) {
      store.updateRun(activeRunId, "needs_input", "waiting", (error as Error).message);
    } else {
      store.updateRun(activeRunId, "failed", "failed", (error as Error).message);
    }
  }
  process.stderr.write(`研究任务未完成: ${(error as Error).message}\n`);
  process.exitCode = error instanceof HumanInterventionRequired ? 2 : 1;
} finally {
  process.off("SIGINT", onSigint);
  if (!interrupted) store?.close();
}

function parseArgs(args: string[]): CliOptions {
  const values = new Map<string, string>();
  let yes = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--") continue;
    if (arg === "--yes") { yes = true; continue; }
    if (!arg.startsWith("--")) usage(`无法识别的参数: ${arg}`);
    const equal = arg.indexOf("=");
    if (equal > 0) values.set(arg.slice(2, equal), arg.slice(equal + 1));
    else {
      const value = args[++i];
      if (!value || value.startsWith("--")) usage(`${arg} 缺少值`);
      values.set(arg.slice(2), value);
    }
  }
  const number = (name: string, fallback: number) => {
    const value = values.has(name) ? Number(values.get(name)) : fallback;
    if (!Number.isInteger(value) || value <= 0 || value > 1000) usage(`--${name} 必须是1到1000之间的整数`);
    return value;
  };
  const rawPlatforms = values.get("platform")?.split(",").map((value) => value.trim()).filter(Boolean);
  const platforms = (rawPlatforms?.length ? rawPlatforms : [...PLATFORMS]) as Platform[];
  const invalid = platforms.filter((platform) => !PLATFORMS.includes(platform));
  if (invalid.length) usage(`--platform 包含无效值: ${invalid.join(", ")}`);
  return { question: values.get("question"), resume: values.get("resume"), since: values.get("since"),
    context: values.get("context"), yes, platforms,
    budget: { candidateLimit: number("candidate-limit", 40), detailLimit: number("detail-limit", 12),
      commentLimit: number("comment-limit", 80) } };
}

function printPlan(brief: ResearchBrief): void {
  process.stdout.write(`\n研究问题：${brief.question}\n范围：${brief.scope}\n受众：${brief.audience}\n`);
  process.stdout.write(`预算：每平台候选 ${brief.budget.candidateLimit}，深挖 ${brief.budget.detailLimit}，评论 ${brief.budget.commentLimit}\n`);
  for (const platform of brief.platforms) {
    process.stdout.write(`\n${platform}:\n`);
    for (const query of brief.queries.filter((item) => item.platform === platform)) {
      process.stdout.write(`  - [${query.intent}] ${query.text}\n`);
    }
  }
}

async function confirmPlan(): Promise<boolean> {
  if (!process.stdin.isTTY) throw new Error("非交互环境需要添加 --yes 才能执行计划");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try { return /^(y|yes|是)$/i.test((await rl.question("\n确认开始操作手机？[y/N] ")).trim()); }
  finally { rl.close(); }
}

function usage(message: string): never {
  process.stderr.write(`${message}\n\n用法:\n  pnpm research -- --question "研究问题" [--platform xiaohongshu[,douyin,wechat]] [--since YYYY-MM-DD] [--context "背景"] [--candidate-limit 40] [--detail-limit 12] [--comment-limit 80] [--yes]\n  pnpm research -- --resume <run-id>\n`);
  process.exit(1);
}
