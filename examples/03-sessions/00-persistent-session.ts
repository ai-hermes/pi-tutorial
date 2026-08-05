/**
 * 模块 3 / Ep3.1
 * 使用持久化 SessionManager，支持恢复会话。
 */

import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";
import { attachTextStream } from "../shared/stream-text.js";

const sessionManager = SessionManager.create(process.cwd());
const { session } = await createAgentSession({
  sessionManager,
});

try {
  process.stdout.write(`Session file: ${session.sessionFile ?? "(in-memory)"}\n`);
  const unsubscribe = attachTextStream(session);
  await session.prompt("Say one sentence and include the word 'checkpoint'.");
  unsubscribe();
  process.stdout.write("\n");
} finally {
  session.dispose();
}
