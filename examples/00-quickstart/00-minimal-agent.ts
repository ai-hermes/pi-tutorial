/**
 * 模块 0 / Ep0.1
 * 最小化 AgentSession：跑通第一次对话和流式输出。
 */

import { createAgentSession } from "@earendil-works/pi-coding-agent";
import { attachTextStream } from "../shared/stream-text.js";

const { session } = await createAgentSession();

try {
  const unsubscribe = attachTextStream(session);
  await session.prompt("What files are in the current directory?");
  unsubscribe();
  process.stdout.write("\n");
} finally {
  session.dispose();
}
