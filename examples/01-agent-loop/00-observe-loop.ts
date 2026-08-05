/**
 * 模块 1 / Ep1.1
 * 观察 agent loop 的关键事件。
 */

import { createAgentSession } from "@earendil-works/pi-coding-agent";
import { attachTextStream } from "../shared/stream-text.js";

const { session } = await createAgentSession();

try {
  const unsubscribeText = attachTextStream(session);
  const unsubscribeEvents = session.subscribe((event) => {
    switch (event.type) {
      case "agent_start":
      case "agent_end":
      case "turn_start":
      case "turn_end":
      case "tool_execution_start":
      case "tool_execution_end":
        process.stdout.write(`\n[event] ${event.type}\n`);
        break;
      default:
        break;
    }
  });

  await session.prompt("List the first 5 files in this directory and explain your plan briefly.");
  unsubscribeEvents();
  unsubscribeText();
  process.stdout.write("\n");
} finally {
  session.dispose();
}
