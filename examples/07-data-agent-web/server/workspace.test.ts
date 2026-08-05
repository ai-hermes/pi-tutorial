import { describe, expect, it } from "vitest";
import { EventBuffer } from "./workspace";

describe("SSE event replay", () => {
  it("replays events after a cursor", () => {
    const buffer = new EventBuffer();
    buffer.publish("run.started", {});
    buffer.publish("run.completed", {});
    expect(buffer.replay(1)).toMatchObject({ stale: false, events: [{ id: 2, type: "run.completed" }] });
  });

  it("requires a snapshot after the 1000-event buffer rolls over", () => {
    const buffer = new EventBuffer();
    for (let index = 0; index < 1_002; index += 1) buffer.publish("message.delta", { delta: String(index) });
    expect(buffer.replay(1).stale).toBe(true);
    expect(buffer.replay(1_001)).toMatchObject({ stale: false, events: [{ id: 1_002 }] });
  });
});
