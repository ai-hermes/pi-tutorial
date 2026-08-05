import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { ConversationService } from "./conversations";

const service = await ConversationService.create();
const app = createApp(service);
const port = Number(process.env.PI_CHAT_PORT ?? 4328);
const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port }, (info) => {
  process.stdout.write(`Pi Chat API listening on http://127.0.0.1:${info.port}\n`);
});

let closing = false;
async function shutdown(): Promise<void> {
  if (closing) return;
  closing = true;
  await service.shutdown();
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
