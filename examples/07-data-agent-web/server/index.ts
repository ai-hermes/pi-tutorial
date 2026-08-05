import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { WorkspaceManager } from "./workspace";

const manager = new WorkspaceManager();
const app = createApp(manager);
const port = Number(process.env.DATA_AGENT_WEB_PORT ?? 4318);

const server = serve({
  fetch: app.fetch,
  hostname: "127.0.0.1",
  port,
}, (info) => {
  process.stdout.write(`DataAgent Web API listening at http://${info.address}:${info.port}\n`);
});

let shuttingDown = false;
async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  await manager.delete().catch((error) => console.error(error));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
