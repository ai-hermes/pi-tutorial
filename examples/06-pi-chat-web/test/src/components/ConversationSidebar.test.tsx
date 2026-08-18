import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConversationSidebar } from "@/components/ConversationSidebar";

const conversation = { id: "c1", title: "History item", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", messageCount: 0, workspace: "/tmp/test", status: "cold" as const };
const desktopWidth = window.innerWidth;

afterEach(() => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: desktopWidth });
});

describe("ConversationSidebar", () => {
  it("uses compact history rows", () => {
    render(<TooltipProvider><SidebarProvider><ConversationSidebar conversations={[conversation]} selectedId="c1" loading={false} onSelect={vi.fn()} onNew={vi.fn()} onImport={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} /></SidebarProvider></TooltipProvider>);
    expect(screen.getByRole("button", { name: /History item/ })).toHaveClass("min-h-11", "py-1.5");
  });

  it("renames a history item", async () => {
    const onRename = vi.fn().mockResolvedValue(undefined);
    render(<TooltipProvider><SidebarProvider><ConversationSidebar conversations={[conversation]} selectedId="c1" loading={false} onSelect={vi.fn()} onNew={vi.fn()} onImport={vi.fn()} onRename={onRename} onDelete={vi.fn()} /></SidebarProvider></TooltipProvider>);
    fireEvent.pointerDown(screen.getByRole("button", { name: "对话操作" }), { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(screen.getByRole("menuitem", { name: "重命名" }));
    fireEvent.change(screen.getByLabelText("标题"), { target: { value: "Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(onRename).toHaveBeenCalledWith("c1", "Renamed"));
  });

  it("confirms deletion of a history item", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<TooltipProvider><SidebarProvider><ConversationSidebar conversations={[conversation]} selectedId="c1" loading={false} onSelect={vi.fn()} onNew={vi.fn()} onImport={vi.fn()} onRename={vi.fn()} onDelete={onDelete} /></SidebarProvider></TooltipProvider>);
    fireEvent.pointerDown(screen.getByRole("button", { name: "对话操作" }), { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(screen.getByRole("menuitem", { name: "删除" }));
    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("c1"));
  });

  it("opens conversation history in a mobile sheet", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    render(<TooltipProvider><SidebarProvider><SidebarTrigger /><ConversationSidebar conversations={[conversation]} selectedId="c1" loading={false} onSelect={vi.fn()} onNew={vi.fn()} onImport={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} /></SidebarProvider></TooltipProvider>);

    await waitFor(() => expect(screen.queryByText("History item")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));

    await waitFor(() => expect(screen.getByText("History item")).toBeVisible());
    expect(document.querySelector('[data-mobile="true"]')).toBeInTheDocument();
  });

  it("imports a selected JSONL session", async () => {
    const onImport = vi.fn().mockResolvedValue(undefined);
    render(<TooltipProvider><SidebarProvider><ConversationSidebar conversations={[conversation]} selectedId="c1" loading={false} onSelect={vi.fn()} onNew={vi.fn()} onImport={onImport} onRename={vi.fn()} onDelete={vi.fn()} /></SidebarProvider></TooltipProvider>);
    const file = new File(["session"], "history.jsonl", { type: "application/x-ndjson" });
    fireEvent.change(screen.getByLabelText("选择 JSONL 会话文件"), { target: { files: [file] } });
    await waitFor(() => expect(onImport).toHaveBeenCalledWith(file));
  });

  it("offers JSONL and HTML exports from each conversation menu", () => {
    render(<TooltipProvider><SidebarProvider><ConversationSidebar conversations={[conversation]} selectedId="c1" loading={false} onSelect={vi.fn()} onNew={vi.fn()} onImport={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} /></SidebarProvider></TooltipProvider>);
    fireEvent.pointerDown(screen.getByRole("button", { name: "对话操作" }), { button: 0, ctrlKey: false, pointerType: "mouse" });
    expect(screen.getByRole("menuitem", { name: "导出 JSONL" })).toHaveAttribute("href", "/api/conversations/c1/export?format=jsonl");
    expect(screen.getByRole("menuitem", { name: "导出 HTML" })).toHaveAttribute("href", "/api/conversations/c1/export?format=html");
  });
});
