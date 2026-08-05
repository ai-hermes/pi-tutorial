import { describe, expect, it } from "vitest";
import type { StreamEvent } from "../shared/types";
import { EMPTY_SNAPSHOT, workspaceReducer } from "./state";

function event(id: number, type: StreamEvent["type"], payload: unknown): StreamEvent {
  return { id, type, payload, timestamp: "2026-07-31T00:00:00.000Z" };
}

describe("workspace event reducer", () => {
  it("merges streaming assistant deltas without duplicating messages", () => {
    const message = { id: "m1", role: "assistant" as const, content: "", createdAt: "now", streaming: true };
    let state = workspaceReducer(EMPTY_SNAPSHOT, { type: "event", event: event(1, "message.added", { message }) });
    state = workspaceReducer(state, { type: "event", event: event(2, "message.delta", { messageId: "m1", delta: "结论" }) });
    state = workspaceReducer(state, { type: "event", event: event(3, "message.delta", { messageId: "m1", delta: "如下" }) });
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]?.content).toBe("结论如下");
    expect(state.lastEventId).toBe(3);
  });

  it("tracks run and evidence state", () => {
    const running = workspaceReducer(EMPTY_SNAPSHOT, { type: "event", event: event(1, "run.started", {}) });
    expect(running.status).toBe("running");
    const query = { id: "q1", rows: [], columns: [], rowCount: 0 };
    const withQuery = workspaceReducer(running, { type: "event", event: event(2, "query.created", { artifact: query }) });
    expect(withQuery.queries[0]?.id).toBe("q1");
    const attribution = { id: "a1", resultId: "q1" };
    const withAttribution = workspaceReducer(withQuery, { type: "event", event: event(3, "attribution.created", { artifact: attribution }) });
    expect(withAttribution.attributions[0]?.id).toBe("a1");
    const ready = workspaceReducer(withAttribution, { type: "event", event: event(4, "run.completed", {}) });
    expect(ready.status).toBe("ready");
  });

  it("replaces a completed message with validated evidence references", () => {
    const message = { id: "m1", role: "assistant" as const, content: "结论", createdAt: "now", streaming: true };
    const started = workspaceReducer(EMPTY_SNAPSHOT, { type: "event", event: event(1, "message.added", { message }) });
    const completed = { ...message, streaming: false, evidenceRefs: [{ artifactId: "q1", token: "x", kind: "query", valid: true }] };
    const state = workspaceReducer(started, { type: "event", event: event(2, "message.completed", { message: completed }) });
    expect(state.messages[0]).toEqual(completed);
  });
});
