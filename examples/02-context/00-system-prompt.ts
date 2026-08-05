/**
 * 模块 2 / Ep2.1
 * 用 ResourceLoader 覆盖 system prompt。
 */

import { createAgentSession, DefaultResourceLoader, getAgentDir } from "@earendil-works/pi-coding-agent";
import { attachTextStream } from "../shared/stream-text.js";

const loader = new DefaultResourceLoader({
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  systemPromptOverride: (base) => `${base}\n\nAlways answer in concise Chinese.`,
});
await loader.reload();

const { session } = await createAgentSession({
  resourceLoader: loader,
});

try {
  const unsubscribe = attachTextStream(session);
  await session.prompt("Introduce yourself in two short bullet points.");
  unsubscribe();
  process.stdout.write("\n");
} finally {
  session.dispose();
}
