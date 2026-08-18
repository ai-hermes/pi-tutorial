import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatTimeline } from "@/components/ChatTimeline";

describe("ChatTimeline", () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it("renders streaming assistant text and copies fenced code", async () => {
    const { rerender } = render(<ChatTimeline messages={[{ id: "a", role: "assistant", text: "working", images: [], timestamp: 1, streaming: true }]} tools={[]} onBranch={vi.fn()} />);
    expect(screen.getByLabelText("生成中")).toBeInTheDocument();

    rerender(<ChatTimeline messages={[{ id: "a", role: "assistant", text: "```ts\nconst answer = 42\n```", images: [], timestamp: 1 }]} tools={[]} onBranch={vi.fn()} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "复制代码块" })); });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("const answer = 42");
  });

  it("edits a user message into a branch", async () => {
    const onBranch = vi.fn().mockResolvedValue(undefined);
    render(<ChatTimeline messages={[{ id: "u1", role: "user", text: "original", images: [], timestamp: 1 }]} tools={[]} onBranch={onBranch} />);
    fireEvent.click(screen.getByRole("button", { name: "编辑并创建分支" }));
    fireEvent.change(screen.getByLabelText("消息"), { target: { value: "edited" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /创建分支/ })); });
    expect(onBranch).toHaveBeenCalledWith("u1", "edited");
  });

  it("offers a jump control when the reader scrolls away from live output", () => {
    const { container } = render(<ChatTimeline conversationId="c1" messages={[{ id: "a", role: "assistant", text: "long output", images: [], timestamp: 1 }]} tools={[]} onBranch={vi.fn()} />);
    const viewport = container.querySelector<HTMLElement>("[data-slot='scroll-area-viewport']");
    expect(viewport).not.toBeNull();
    Object.defineProperties(viewport!, {
      scrollHeight: { configurable: true, value: 1_000 },
      clientHeight: { configurable: true, value: 400 },
      scrollTop: { configurable: true, value: 100, writable: true },
    });
    fireEvent.scroll(viewport!);
    const jump = screen.getByRole("button", { name: "回到最新" });
    expect(jump).toBeInTheDocument();
    expect(jump.parentElement).toHaveAttribute("data-slot", "jump-latest");
    expect(viewport).not.toContainElement(jump);
  });

  it("uses matching message bubbles with actions outside their borders", () => {
    render(<ChatTimeline messages={[
      { id: "u", role: "user", text: "Question", images: [], timestamp: 1 },
      { id: "a", role: "assistant", text: "Answer", images: [], timestamp: 2 },
    ]} tools={[]} onBranch={vi.fn()} />);

    const articles = screen.getAllByRole("article");
    for (const article of articles) {
      expect(article).toHaveClass("py-2");
      expect(article.querySelector('[data-slot="message-bubble"]')).toHaveClass("text-sm", "px-3.5", "py-2.5");
      const actions = article.querySelector('[data-slot="message-actions"]');
      expect(actions).toBeInTheDocument();
      expect(actions?.closest('[data-slot="message-bubble"]')).toBeNull();
    }
    expect(screen.queryByText("Pi")).not.toBeInTheDocument();
  });

  it("renders the optimistic user input before an assistant stream", () => {
    render(<ChatTimeline conversationId="c1" messages={[
      { id: "optimistic_1", role: "user", text: "Question", images: [], timestamp: 10, pending: true },
      { id: "stream_1", role: "assistant", text: "Answer", images: [], timestamp: 11, streaming: true },
    ]} tools={[]} onBranch={vi.fn()} />);
    const articles = screen.getAllByRole("article");
    expect(articles[0]).toHaveTextContent("Question");
    expect(articles[0]).toHaveTextContent("发送中");
    expect(articles[1]).toHaveTextContent("Answer");
  });

  it("groups consecutive tool calls into one run with a status summary", () => {
    const { container } = render(<ChatTimeline conversationId="c1" messages={[
      { id: "u1", role: "user", text: "Build it", images: [], timestamp: 1 },
      { id: "a1", role: "assistant", text: "Working", images: [], timestamp: 2 },
    ]} tools={[
      { id: "t1", name: "write", args: { path: "a.ts" }, status: "success", startedAt: 3, endedAt: 4 },
      { id: "t2", name: "edit", args: { path: "a.ts" }, status: "success", startedAt: 5, endedAt: 6 },
      { id: "t3", name: "bash", args: { command: "test" }, status: "error", result: "exit code: 1", startedAt: 7, endedAt: 8 },
    ]} onBranch={vi.fn()} />);

    expect(screen.getByText("RUN 01 · 执行记录")).toBeInTheDocument();
    expect(screen.getByText("3 个步骤 · 含失败步骤")).toBeInTheDocument();
    expect(screen.getByText("2 成功")).toBeInTheDocument();
    expect(screen.getByText("1 失败")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="run-steps"]')).toHaveClass("divide-y");
    expect(container.querySelectorAll('[data-slot="tool-call-row"]')).toHaveLength(3);
    expect(container.querySelector('[data-slot="tool-call-row"]')).not.toHaveClass("rounded-lg", "border");
    expect(container.querySelector('[data-slot="run-group"]')).not.toHaveClass("border");
    expect(container.querySelector('[data-slot="run-group-row"]')).not.toHaveClass("md:pl-10");
    expect(container.querySelector('[data-slot="run-group"] > button')).toHaveClass("min-h-11");
    expect(container.querySelector('[data-slot="tool-call-row"] > button')).toHaveClass("min-h-10");
  });
});
