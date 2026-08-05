/**
 * 模块 0 / Ep0.3
 * 演示如何加载 models.json 里的自定义 provider/model（不在代码中写死密钥）。
 */

import { createAgentSession, ModelRuntime } from "@earendil-works/pi-coding-agent";
import { attachTextStream } from "../shared/stream-text.js";

// PI_CUSTOM_PROVIDER=kimi-coding PI_CUSTOM_MODEL=kimi-for-coding-highspeed bun run examples/00-quickstart/01-model-runtime.ts 
const provider = process.env.PI_CUSTOM_PROVIDER?.trim();
const modelId = process.env.PI_CUSTOM_MODEL?.trim();

if (!provider || !modelId) {
  throw new Error("Set PI_CUSTOM_PROVIDER and PI_CUSTOM_MODEL to use this example.");
}

const modelRuntime = await ModelRuntime.create();
const model = modelRuntime.getModel(provider, modelId);
if (!model) {
  throw new Error(`Custom model not found: ${provider}/${modelId}. Check your models.json.`);
}

process.stdout.write(`Using custom model: ${model.provider}/${model.id}\n`);

const { session } = await createAgentSession({
  modelRuntime,
  model,
});

try {
  const unsubscribe = attachTextStream(session);
  await session.prompt("Briefly introduce yourself as a data analysis assistant.");
  unsubscribe();
  process.stdout.write("\n");
} finally {
  session.dispose();
}
