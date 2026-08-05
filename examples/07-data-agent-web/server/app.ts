import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { WorkspaceConflictError, WorkspaceManager, WorkspaceNotFoundError } from "./workspace";
import { MAX_UPLOAD_BYTES, persistUpload, UploadError } from "./uploads";

type ApiStatus = 400 | 404 | 409 | 413 | 500;

class ApiError extends Error {
  constructor(message: string, readonly status: ApiStatus) {
    super(message);
  }
}

function statusFor(error: unknown): ApiStatus {
  if (error instanceof UploadError || error instanceof WorkspaceConflictError || error instanceof WorkspaceNotFoundError || error instanceof ApiError) {
    return error.status;
  }
  return 500;
}

export function createApp(manager = new WorkspaceManager()): Hono {
  const app = new Hono();

  app.get("/api/health", (context) => context.json({ ok: true }));
  app.get("/api/workspace", (context) => context.json(manager.snapshot()));

  app.post("/api/workspace", async (context) => {
    const contentLength = Number(context.req.header("content-length") ?? 0);
    if (contentLength > MAX_UPLOAD_BYTES + 1024 * 1024) throw new UploadError("The uploaded file exceeds the 25 MB limit.", 413);
    const body = await context.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) throw new UploadError("Choose a data file to upload.");
    const upload = await persistUpload(file);
    const snapshot = await manager.replace(upload);
    return context.json(snapshot, 201);
  });

  app.delete("/api/workspace", async (context) => {
    await manager.delete();
    return context.body(null, 204);
  });

  app.post("/api/workspace/messages", async (context) => {
    const body = await context.req.json().catch(() => undefined) as { text?: unknown } | undefined;
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) throw new ApiError("Question text is required.", 400);
    if (text.length > 10_000) throw new ApiError("Question text must be at most 10,000 characters.", 400);
    manager.prompt(text);
    return context.json({ accepted: true }, 202);
  });

  app.post("/api/workspace/abort", async (context) => {
    await manager.abort();
    return context.json({ aborted: true });
  });

  app.get("/api/workspace/events", (context) => {
    const afterHeader = context.req.header("last-event-id");
    const afterQuery = context.req.query("after");
    const after = Number(afterHeader ?? afterQuery ?? 0);
    return manager.stream(Number.isSafeInteger(after) && after >= 0 ? after : 0);
  });

  const dist = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
  if (existsSync(dist)) {
    app.use("/assets/*", serveStatic({ root: dist }));
    app.get("*", serveStatic({ path: resolve(dist, "index.html") }));
  }

  app.onError((error, context) => {
    const status = statusFor(error);
    const message = status === 500 ? "Unexpected server error." : error.message;
    if (status === 400) return context.json({ error: message }, 400);
    if (status === 404) return context.json({ error: message }, 404);
    if (status === 409) return context.json({ error: message }, 409);
    if (status === 413) return context.json({ error: message }, 413);
    console.error(error);
    return context.json({ error: message }, 500);
  });

  return app;
}
