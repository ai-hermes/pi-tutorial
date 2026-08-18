import { Hono } from "hono";
import type { ConversationService } from "@server/conversations";

export function createSystemRoutes(service: ConversationService): Hono {
  return new Hono()
    .get("/health", (context) => context.json({ ok: true }))
    .get("/bootstrap", async (context) => context.json(await service.bootstrap()));
}
