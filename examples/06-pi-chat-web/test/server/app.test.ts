// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import type { ConversationSnapshot } from "@shared/types";
import { createApp } from "@server/app";
import type { ConversationService } from "@server/conversations";

describe("conversation import route", () => {
  it("accepts a multipart JSONL file and returns the imported snapshot", async () => {
    const snapshot = { conversation: { id: "imported-id" } } as ConversationSnapshot;
    const importConversation = vi.fn().mockResolvedValue(snapshot);
    const app = createApp({ importConversation } as unknown as ConversationService);
    const boundary = "pi-chat-import-boundary";
    const jsonl = `${JSON.stringify({ type: "session", version: 3, id: "source", timestamp: new Date().toISOString(), cwd: "/tmp/source" })}\n`;
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="history.jsonl"',
      "Content-Type: application/x-ndjson",
      "",
      jsonl,
      `--${boundary}--`,
      "",
    ].join("\r\n");

    const response = await app.request("/api/conversations/import", {
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body,
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(snapshot);
    expect(importConversation).toHaveBeenCalledOnce();
    expect(importConversation.mock.calls[0][0]).toMatchObject({ name: "history.jsonl", type: "application/x-ndjson" });
  });

  it("rejects a request without a file", async () => {
    const importConversation = vi.fn();
    const app = createApp({ importConversation } as unknown as ConversationService);
    const form = new FormData();

    const response = await app.request("/api/conversations/import", { method: "POST", body: form });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "请选择 Pi Session JSONL 文件。" });
    expect(importConversation).not.toHaveBeenCalled();
  });
});
