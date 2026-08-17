import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ConversationSnapshot } from "../../shared/types";
import { HarnessSheet } from "./HarnessSheet";

const snapshot: ConversationSnapshot = {
  conversation: { id: "c1", title: "Test", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", messageCount: 0, workspace: "/tmp/test", status: "ready" },
  messages: [],
  tools: [],
  model: { provider: "openai", id: "test" },
  thinkingLevel: "medium",
  availableThinkingLevels: ["off", "medium"],
  status: "ready",
  queue: { steering: [], followUp: [] },
  settings: { autoCompaction: true, autoRetry: true, steeringMode: "all", followUpMode: "all" },
  stats: { sessionId: "c1", userMessages: 0, assistantMessages: 0, toolCalls: 0, toolResults: 0, totalMessages: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }, cost: 0, contextUsage: { tokens: 0, contextWindow: 100, percent: 0 } },
  stream: { id: "s1", lastEventId: 0 },
  activity: [],
  diagnostics: [],
};

describe("HarnessSheet", () => {
  it("shows an explicit selected state for each inspector tab", () => {
    render(<HarnessSheet open onOpenChange={vi.fn()} snapshot={snapshot} warning="not a sandbox" onCompact={vi.fn()} onSettings={vi.fn()} />);
    const activity = screen.getByRole("tab", { name: "活动" });
    expect(activity).toHaveAttribute("data-state", "active");
    expect(activity).toHaveClass("data-[state=active]:bg-primary", "data-[state=active]:text-primary-foreground", "dark:data-[state=active]:text-primary-foreground");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "设置" }), { button: 0, ctrlKey: false });
    expect(screen.getByRole("tab", { name: "设置" })).toHaveAttribute("data-state", "active");
  });

  it("opens the compaction dialog and submits instructions", async () => {
    const onCompact = vi.fn().mockResolvedValue(undefined);
    render(<HarnessSheet open onOpenChange={vi.fn()} snapshot={snapshot} warning="not a sandbox" onCompact={onCompact} onSettings={vi.fn()} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "上下文" }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole("button", { name: /压缩上下文/ }));
    fireEvent.change(screen.getByLabelText("自定义摘要指令"), { target: { value: "保留路径" } });
    fireEvent.click(screen.getByRole("button", { name: "开始压缩" }));
    await waitFor(() => expect(onCompact).toHaveBeenCalledWith("保留路径"));
  });

  it("updates queue consumption modes", () => {
    const onSettings = vi.fn().mockResolvedValue(undefined);
    render(<HarnessSheet open onOpenChange={vi.fn()} snapshot={snapshot} warning="not a sandbox" onCompact={vi.fn()} onSettings={onSettings} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "设置" }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getAllByRole("radio", { name: "逐条" })[0]);
    expect(onSettings).toHaveBeenCalledWith({ steeringMode: "one-at-a-time" });
  });
});
