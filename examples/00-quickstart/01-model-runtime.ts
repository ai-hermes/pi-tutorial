/**
 * 模块 0 / Ep0.2
 * 使用 ModelRuntime 选择模型，并支持通过 PI_MODEL 覆盖默认模型。
 * PI_MODEL=kimi-coding/kimi-for-coding-highspeed bun run examples/00-quickstart/01-model-runtime.ts 
 */

import { createAgentSession, ModelRuntime } from "@earendil-works/pi-coding-agent";
import { pickModelFromEnvOrAvailable } from "../shared/model-selector.js";
import { attachTextStream } from "../shared/stream-text.js";

const modelRuntime = await ModelRuntime.create();
const model = await pickModelFromEnvOrAvailable(modelRuntime);

process.stdout.write(`Using model: ${model.provider}/${model.id}\n`);

const { session } = await createAgentSession({
  modelRuntime,
  model,
});

try {
  const unsubscribe = attachTextStream(session);
  await session.prompt("Say hello in one sentence, then list one thing you can help with.");
  unsubscribe();
  process.stdout.write("\n");
} finally {
  session.dispose();
}
