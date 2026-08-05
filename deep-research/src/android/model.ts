/**
 * 本地 OpenAI-compatible 服务接入：
 * 读取 LOCAL_OPENAI_BASE_URL / LOCAL_OPENAI_API_KEY，启动时向 <baseUrl>/models 拉取模型列表，
 * 生成 pi 的 models.json 并创建 ModelRuntime。模型选择：
 *   PI_MODEL=local/<model-id>（或 LOCAL_OPENAI_MODEL=<model-id>），否则取列表第一个。
 */

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ModelRuntime } from "@earendil-works/pi-coding-agent";

export interface LocalModelSelection {
  modelRuntime: ModelRuntime;
  model: NonNullable<ReturnType<ModelRuntime["getModel"]>>;
}

const PROVIDER_ID = "local";

async function fetchModelIds(baseUrl: string, apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: Array<{ id?: string }> };
    return (body.data ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
  } catch {
    return [];
  }
}

/** 未配置 LOCAL_OPENAI_BASE_URL 时返回 undefined，走 pi 默认 provider。 */
export async function createLocalModelRuntime(): Promise<LocalModelSelection | undefined> {
  const baseUrl = process.env.LOCAL_OPENAI_BASE_URL?.trim();
  if (!baseUrl) return undefined;
  const apiKey = process.env.LOCAL_OPENAI_API_KEY?.trim() || "dummy";
  process.env.LOCAL_OPENAI_API_KEY = apiKey;

  const discovered = await fetchModelIds(baseUrl, apiKey);
  const preferred =
    process.env.PI_MODEL?.trim().startsWith(`${PROVIDER_ID}/`)
      ? process.env.PI_MODEL.trim().slice(PROVIDER_ID.length + 1)
      : process.env.LOCAL_OPENAI_MODEL?.trim();
  const ids = [...new Set([...(preferred ? [preferred] : []), ...discovered])];
  if (ids.length === 0) {
    throw new Error(
      `本地服务 ${baseUrl}/models 未返回任何模型。请在 .env 中用 LOCAL_OPENAI_MODEL=<model-id> 手动指定模型。`,
    );
  }

  const modelsConfig = {
    providers: {
      [PROVIDER_ID]: {
        baseUrl,
        api: "openai-completions",
        apiKey: "$LOCAL_OPENAI_API_KEY",
        compat: { supportsDeveloperRole: false },
        models: ids.map((id) => ({
          id,
          input: ["text", "image"],
          contextWindow: 128_000,
          maxTokens: 16_000,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        })),
      },
    },
  };
  const dir = await mkdtemp(join(tmpdir(), "deep-research-models-"));
  const modelsPath = join(dir, "models.json");
  await writeFile(modelsPath, JSON.stringify(modelsConfig, null, 2));

  const modelRuntime = await ModelRuntime.create({ modelsPath });
  const modelId = preferred ?? ids[0];
  const model = modelRuntime.getModel(PROVIDER_ID, modelId);
  if (!model) {
    throw new Error(`模型 ${PROVIDER_ID}/${modelId} 不可用。已发现的模型: ${ids.join(", ") || "无"}`);
  }
  return { modelRuntime, model };
}
