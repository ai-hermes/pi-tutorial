/** @vitest-environment jsdom */
import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatPanel } from "./ChatPanel";

afterEach(cleanup);

describe("ChatPanel effects", () => {
  it("never returns the scrollIntoView result as an effect cleanup", () => {
    const scrollIntoView = vi.fn(() => Promise.resolve());
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    const view = render(
      <StrictMode>
        <ChatPanel
            messages={[]}
            tools={[]}
            status="ready"
            onSend={async () => undefined}
            onAbort={async () => undefined}
            onSelectEvidence={() => undefined}
          />
      </StrictMode>,
    );

    expect(scrollIntoView).toHaveBeenCalled();
    expect(() => view.unmount()).not.toThrow();
  });

  it("renders validated evidence citations as interactive controls", () => {
    Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    const onSelectEvidence = vi.fn();
    render(<ChatPanel
      messages={[{ id: "m1", role: "assistant", content: "销售额增长。[[evidence:query_1]]", createdAt: "now", evidenceRefs: [{ token: "[[evidence:query_1]]", artifactId: "query_1", kind: "query", valid: true }] }]}
      tools={[]} status="ready" onSend={async () => undefined} onAbort={async () => undefined} onSelectEvidence={onSelectEvidence}
    />);
    fireEvent.click(screen.getByRole("button", { name: "证据 query" }));
    expect(onSelectEvidence).toHaveBeenCalledWith("query_1");
  });
});
