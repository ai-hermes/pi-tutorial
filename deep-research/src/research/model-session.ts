import {
  createAgentSession, DefaultResourceLoader, getAgentDir, type AgentSession, type ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { createLocalModelRuntime } from "../android/model.js";

export async function createResearchSession(systemPrompt: string, customTools: ToolDefinition[]): Promise<AgentSession> {
  const localConfigured = Boolean(process.env.LOCAL_OPENAI_BASE_URL?.trim());
  if (!localConfigured && process.env.ANDROID_RESEARCH_ALLOW_CLOUD !== "1") {
    throw new Error(
      "研究模式默认禁止把内容发送到云端。请配置 LOCAL_OPENAI_BASE_URL，或显式设置 ANDROID_RESEARCH_ALLOW_CLOUD=1。",
    );
  }
  const loader = new DefaultResourceLoader({
    cwd: process.cwd(), agentDir: getAgentDir(), systemPromptOverride: () => systemPrompt,
  });
  await loader.reload();
  const local = await createLocalModelRuntime();
  const { session } = await createAgentSession({
    resourceLoader: loader,
    tools: customTools.map((tool) => tool.name),
    customTools,
    ...(local ? { modelRuntime: local.modelRuntime, model: local.model } : {}),
  });
  return session;
}

/** Run one model turn with a hard deadline and require a real textual response. */
export async function promptForText(session: AgentSession, prompt: string, timeoutMs: number): Promise<string> {
  let streamed = "";
  let timedOut = false;
  const unsubscribe = session.subscribe((event) => {
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      streamed += event.assistantMessageEvent.delta;
    }
  });
  const timer = setTimeout(() => {
    timedOut = true;
    session.abort().catch(() => undefined);
  }, timeoutMs);
  try {
    await session.prompt(prompt);
  } finally {
    clearTimeout(timer);
    unsubscribe();
  }
  if (timedOut) throw new Error(`模型响应超过 ${Math.round(timeoutMs / 1000)} 秒，已中止`);
  const assistant = [...session.messages].reverse().find(
    (message): message is Extract<typeof message, { role: "assistant" }> =>
      "role" in message && message.role === "assistant",
  );
  if (assistant?.errorMessage) throw new Error(`模型请求失败: ${assistant.errorMessage}`);
  if (!streamed.trim()) throw new Error("模型请求结束但没有返回文本内容");
  return streamed.trim();
}

export function parseJsonObject(value: string): Record<string, unknown> {
  const unfenced = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("模型没有返回 JSON 对象");
  const parsed: unknown = JSON.parse(unfenced.slice(start, end + 1));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("模型返回值不是 JSON 对象");
  return parsed as Record<string, unknown>;
}
