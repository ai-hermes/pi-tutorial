import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConversationSidebar } from "@/components/ConversationSidebar";

const conversation = { id: "c1", title: "History item", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", messageCount: 0, workspace: "/tmp/test", status: "cold" as const };
const desktopWidth = window.innerWidth;

beforeEach(() => window.localStorage.clear());

afterEach(() => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: desktopWidth });
});

describe("ConversationSidebar", () => {
  it("uses compact history rows", () => {
    render(<TooltipProvider><SidebarProvider><ConversationSidebar conversations={[conversation]} selectedId="c1" loading={false} onSelect={vi.fn()} onNew={vi.fn()} onImport={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} /></SidebarProvider></TooltipProvider>);
    expect(screen.getByRole("button", { name: /History item/ })).toHaveClass("min-h-11", "py-1.5");
    expect(screen.queryByPlaceholderText("搜索会话")).not.toBeInTheDocument();
  });

  it("opens keyboard search and selects the active result", async () => {
    const onSelect = vi.fn();
    render(<TooltipProvider><SidebarProvider><ConversationSidebar conversations={[conversation]} selectedId="c1" loading={false} onSelect={onSelect} onNew={vi.fn()} onImport={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} /></SidebarProvider></TooltipProvider>);

    fireEvent.keyDown(window, { key: "k", metaKey: true });
    const search = await screen.findByRole("combobox", { name: "搜索会话" });
    fireEvent.change(search, { target: { value: "History" } });
    fireEvent.keyDown(search, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith("c1");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("creates a new conversation from the keyboard shortcut", () => {
    const onNew = vi.fn().mockResolvedValue(undefined);
    render(<TooltipProvider><SidebarProvider><ConversationSidebar conversations={[conversation]} selectedId="c1" loading={false} onSelect={vi.fn()} onNew={onNew} onImport={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} /></SidebarProvider></TooltipProvider>);

    fireEvent.keyDown(window, { key: "n", ctrlKey: true });

    expect(onNew).toHaveBeenCalledOnce();
  });

  it("resizes the desktop conversation list with the visible separator", () => {
    render(<TooltipProvider><SidebarProvider><ConversationSidebar conversations={[conversation]} selectedId="c1" loading={false} onSelect={vi.fn()} onNew={vi.fn()} onImport={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} /></SidebarProvider></TooltipProvider>);
    const separator = screen.getByRole("separator", { name: "调整会话列表宽度" });
    const wrapper = document.querySelector<HTMLElement>('[data-slot="sidebar-wrapper"]');

    expect(separator).toHaveAttribute("aria-valuenow", "224");
    fireEvent.keyDown(separator, { key: "ArrowRight" });

    expect(separator).toHaveAttribute("aria-valuenow", "240");
    expect(wrapper?.style.getPropertyValue("--sidebar-width")).toBe("240px");
  });

  it("toggles the desktop sidebar with the keyboard shortcut", () => {
    render(<TooltipProvider><SidebarProvider><ConversationSidebar conversations={[conversation]} selectedId="c1" loading={false} onSelect={vi.fn()} onNew={vi.fn()} onImport={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} /></SidebarProvider></TooltipProvider>);
    const sidebar = document.querySelector<HTMLElement>('[data-slot="sidebar"][data-state]');

    expect(sidebar).toHaveAttribute("data-state", "expanded");
    fireEvent.keyDown(window, { key: "b", metaKey: true });
    expect(sidebar).toHaveAttribute("data-state", "collapsed");
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
