import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("web API without an active workspace", () => {
  const app = createApp();

  it("returns health and an empty snapshot", async () => {
    const health = await app.request("/api/health");
    expect(await health.json()).toEqual({ ok: true });
    const workspace = await app.request("/api/workspace");
    expect(await workspace.json()).toMatchObject({ workspace: null, status: "empty" });
  });

  it("maps missing workspace and bad uploads to API errors", async () => {
    const message = await app.request("/api/workspace/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hello" }),
    });
    expect(message.status).toBe(404);

    const form = new FormData();
    form.set("file", new File(["hello"], "notes.txt"));
    const upload = await app.request("/api/workspace", { method: "POST", body: form });
    expect(upload.status).toBe(400);
  });
});
