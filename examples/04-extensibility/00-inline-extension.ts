/**
 * 模块 4 / Ep4.1
 * 注册内联 extension，并在 agent 启动时输出日志。
 */

import { createAgentSession, DefaultResourceLoader, getAgentDir } from "@earendil-works/pi-coding-agent";
import { attachTextStream } from "../shared/stream-text.js";

const loader = new DefaultResourceLoader({
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  extensionFactories: [
    (pi) => {
      pi.on("agent_start", () => {
        process.stdout.write("[demo-logger] agent_start\n");
      });
    },
  ],
});
await loader.reload();

const { session } = await createAgentSession({
  resourceLoader: loader,
});

try {
  const unsubscribe = attachTextStream(session);
  await session.prompt("Explain in one sentence what an extension can do.");
  unsubscribe();
  process.stdout.write("\n");
} finally {
  session.dispose();
}
