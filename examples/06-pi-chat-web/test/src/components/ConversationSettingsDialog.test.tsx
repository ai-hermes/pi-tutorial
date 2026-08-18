import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ConversationSnapshot } from "@shared/types";
import { ConversationSettingsDialog } from "@/components/ConversationSettingsDialog";
import { TooltipProvider } from "@/components/ui/tooltip";

const snapshot: ConversationSnapshot = {
  conversation: { id: "c1", title: "Test", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", messageCount: 0, workspace: "/tmp/test", status: "ready" },
  messages: [], tools: [], thinking: [],
  model: { provider: "openai", id: "test" }, thinkingLevel: "medium", availableThinkingLevels: ["off", "medium"], status: "ready",
  queue: { steering: [], followUp: [] },
  settings: { autoCompaction: true, autoRetry: true, steeringMode: "all", followUpMode: "all" },
  stats: { sessionId: "c1", userMessages: 0, assistantMessages: 0, toolCalls: 0, toolResults: 0, totalMessages: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }, cost: 0, contextUsage: { tokens: 0, contextWindow: 100, percent: 0 } },
  stream: { id: "s1", lastEventId: 0 }, activity: [], diagnostics: [],
};

describe("ConversationSettingsDialog", () => {
  it("updates queue consumption mode", () => {
    const onSettings = vi.fn().mockResolvedValue(undefined);
    render(<TooltipProvider><ConversationSettingsDialog open onOpenChange={vi.fn()} snapshot={snapshot} onSettings={onSettings} /></TooltipProvider>);
    fireEvent.click(screen.getAllByRole("radio", { name: "逐条" })[0]);
    expect(onSettings).toHaveBeenCalledWith({ steeringMode: "one-at-a-time" });
    expect(screen.getAllByRole("radio", { name: "全部" })[0]).toBeChecked();
  });

  it("provides hover help for the two runtime message behaviors", () => {
    render(<TooltipProvider><ConversationSettingsDialog open onOpenChange={vi.fn()} snapshot={snapshot} onSettings={vi.fn()} /></TooltipProvider>);
    expect(screen.getByRole("button", { name: "Steer 消费说明" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Follow-up 消费说明" })).toBeInTheDocument();
  });
});
