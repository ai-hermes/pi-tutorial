/**
 * 模块 1 / Ep1.2
 * 用 defineTool 增加一个结构化自定义工具。
 */

import { Type } from "typebox";
import { createAgentSession, defineTool } from "@earendil-works/pi-coding-agent";
import { attachTextStream } from "../shared/stream-text.js";

const utcTimeTool = defineTool({
  name: "utc_time",
  label: "UTC Time",
  description: "Return the current UTC ISO timestamp.",
  parameters: Type.Object({}),
  execute: async () => ({
    content: [{ type: "text", text: new Date().toISOString() }],
    details: {},
  }),
});

const { session } = await createAgentSession({
  tools: ["read", "utc_time"],
  customTools: [utcTimeTool],
});

try {
  const unsubscribe = attachTextStream(session);
  await session.prompt("Call utc_time and explain what timezone it uses.");
  unsubscribe();
  process.stdout.write("\n");
} finally {
  session.dispose();
}
