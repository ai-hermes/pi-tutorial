import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import type { ConversationSettings, QueueBehavior, ThinkingLevel } from "../shared/types";
import { ConversationError, ConversationService, downloadName } from "./conversations";

export function createApp(service: ConversationService): Hono {
  const app = new Hono();

  app.get("/api/health", (context) => context.json({ ok: true }));
  app.get("/api/bootstrap", async (context) => context.json(await service.bootstrap()));
  app.get("/api/conversations", async (context) => context.json(await service.list()));
  app.post("/api/conversations", async (context) => context.json(await service.createConversation(), 201));
  app.post("/api/conversations/import", async (context) => {
    const form = await context.req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string" || typeof file.text !== "function") throw new ConversationError("请选择 Pi Session JSONL 文件。");
    return context.json(await service.importConversation(file as File), 201);
  });

  app.get("/api/conversations/:id", async (context) => context.json(await service.snapshot(context.req.param("id"))));
  app.patch("/api/conversations/:id", async (context) => {
    const body = await jsonBody<{ title?: unknown }>(context.req.raw);
    if (typeof body.title !== "string") throw new ConversationError("缺少标题。");
    return context.json(await service.rename(context.req.param("id"), body.title));
  });
  app.delete("/api/conversations/:id", async (context) => {
    await service.delete(context.req.param("id"));
    return context.body(null, 204);
  });

  app.post("/api/conversations/:id/messages", async (context) => {
    const form = await context.req.formData();
    const text = String(form.get("text") ?? "");
    const behavior = form.get("behavior") === "steer" ? "steer" : "followUp";
    const files = [...form.getAll("files"), ...form.getAll("images")]
      .filter((item): item is File => item instanceof File);
    await service.sendFiles(context.req.param("id"), text, files, behavior as QueueBehavior);
    return context.json({ accepted: true }, 202);
  });

  app.post("/api/conversations/:id/abort", async (context) => {
    await service.abort(context.req.param("id"));
    return context.json({ aborted: true });
  });
  app.post("/api/conversations/:id/model", async (context) => {
    const body = await jsonBody<{ provider?: unknown; id?: unknown }>(context.req.raw);
    if (typeof body.provider !== "string" || typeof body.id !== "string") throw new ConversationError("模型参数无效。");
    await service.setModel(context.req.param("id"), body.provider, body.id);
    return context.json({ changed: true });
  });
  app.post("/api/conversations/:id/thinking", async (context) => {
    const body = await jsonBody<{ level?: unknown }>(context.req.raw);
    if (typeof body.level !== "string") throw new ConversationError("思考级别无效。");
    await service.setThinking(context.req.param("id"), body.level as ThinkingLevel);
    return context.json({ changed: true });
  });
  app.post("/api/conversations/:id/compact", async (context) => {
    const body = await jsonBody<{ instructions?: unknown }>(context.req.raw);
    await service.compact(context.req.param("id"), typeof body.instructions === "string" ? body.instructions : undefined);
    return context.json({ accepted: true }, 202);
  });
  app.patch("/api/conversations/:id/settings", async (context) => {
    const body = await jsonBody<Partial<ConversationSettings>>(context.req.raw);
    return context.json(await service.updateSettings(context.req.param("id"), body));
  });
  app.post("/api/conversations/:id/branches", async (context) => {
    const body = await jsonBody<{ entryId?: unknown; text?: unknown }>(context.req.raw);
    if (typeof body.entryId !== "string" || typeof body.text !== "string") throw new ConversationError("分支参数无效。");
    return context.json(await service.branch(context.req.param("id"), body.entryId, body.text), 201);
  });
  app.get("/api/conversations/:id/events", async (context) => {
    const after = Number(context.req.query("after") ?? 0);
    return service.eventStream(
      context.req.param("id"),
      context.req.query("streamId"),
      Number.isSafeInteger(after) && after >= 0 ? after : 0,
    );
  });
  app.get("/api/conversations/:id/export", async (context) => {
    const format = context.req.query("format") === "html" ? "html" : "jsonl";
    const result = await service.export(context.req.param("id"), format);
    return context.body(result.content, 200, {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${downloadName(result.path)}"`,
    });
  });

  const dist = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
  if (existsSync(dist)) {
    app.use("/assets/*", serveStatic({ root: dist }));
    app.get("*", serveStatic({ path: resolve(dist, "index.html") }));
  }

  app.onError((error, context) => {
    const status = error instanceof ConversationError ? error.status : 500;
    if (status === 500) console.error(error);
    const message = status === 500 ? "Unexpected server error." : error.message;
    if (status === 404) return context.json({ error: message }, 404);
    if (status === 409) return context.json({ error: message }, 409);
    if (status === 413) return context.json({ error: message }, 413);
    return context.json({ error: message }, status === 400 ? 400 : 500);
  });

  return app;
}

async function jsonBody<T>(request: Request): Promise<T> {
  try {
    return await request.json() as T;
  } catch {
    return {} as T;
  }
}
