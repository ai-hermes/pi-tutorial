import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ConversationSnapshot } from "@shared/types";
import { HarnessSheet } from "@/components/HarnessSheet";

const snapshot: ConversationSnapshot = {
  conversation: { id: "c1", title: "Test", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", messageCount: 0, workspace: "/tmp/test", status: "ready" },
  messages: [],
  tools: [],
  thinking: [],
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
  it("shows activity and context tabs without a settings tab", () => {
    render(<HarnessSheet open onOpenChange={vi.fn()} snapshot={snapshot} onCompact={vi.fn()} />);
    expect(screen.getByRole("complementary", { name: "会话明细" })).toHaveClass("md:w-[32rem]");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("会话明细")).toBeInTheDocument();
    expect(screen.getByText("就绪")).toHaveClass("text-success");
    expect(screen.getByRole("region", { name: "模型信息" })).toHaveTextContent("openai/test");
    expect(screen.getByRole("region", { name: "模型信息" })).toHaveTextContent("思考强度 medium");
    expect(screen.getByRole("tab", { name: "活动" })).toHaveAttribute("data-state", "active");
    expect(screen.getByRole("tab", { name: "上下文" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "设置" })).not.toBeInTheDocument();
  });

  it("collapses its layout width when closed", () => {
    render(<HarnessSheet open={false} onOpenChange={vi.fn()} snapshot={snapshot} onCompact={vi.fn()} />);
    expect(screen.getByText("会话明细").closest("aside")).toHaveClass("w-0", "pointer-events-none");
  });

  it("opens the compaction dialog and submits instructions", async () => {
    const onCompact = vi.fn().mockResolvedValue(undefined);
    render(<HarnessSheet open onOpenChange={vi.fn()} snapshot={snapshot} onCompact={onCompact} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "上下文" }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole("button", { name: /压缩上下文/ }));
    fireEvent.change(screen.getByLabelText("自定义摘要指令"), { target: { value: "保留路径" } });
    fireEvent.click(screen.getByRole("button", { name: "开始压缩" }));
    await waitFor(() => expect(onCompact).toHaveBeenCalledWith("保留路径"));
  });

  it("copies the session ID without displaying it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<HarnessSheet open onOpenChange={vi.fn()} snapshot={snapshot} onCompact={vi.fn()} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "上下文" }), { button: 0, ctrlKey: false });
    expect(screen.queryByText(snapshot.stats.sessionId)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "复制 Session ID" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(snapshot.stats.sessionId));
  });
});
