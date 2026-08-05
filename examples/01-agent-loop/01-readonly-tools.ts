/**
 * 模块 1 / Ep1.2
 * 只启用只读工具，演示工具边界。
 */

import { createAgentSession } from "@earendil-works/pi-coding-agent";
import { attachTextStream } from "../shared/stream-text.js";

const { session } = await createAgentSession({
  tools: ["read", "grep", "find", "ls"],
});

try {
  const unsubscribe = attachTextStream(session);
  await session.prompt("Read package.json and summarize scripts in Chinese.");
  unsubscribe();
  process.stdout.write("\n");
} finally {
  session.dispose();
}
