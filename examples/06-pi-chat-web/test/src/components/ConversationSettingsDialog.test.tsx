import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GlobalToolSettingsView } from "@shared/types";
import { ConversationSettingsDialog } from "@/components/ConversationSettingsDialog";
import { TooltipProvider } from "@/components/ui/tooltip";

const toolSettings: GlobalToolSettingsView = {
  defaultEnabled: true,
  tools: [{
    name: "web_search",
    description: "Search the web",
    source: { kind: "extension", label: "pi-web-access", path: "/node_modules/pi-web-access/index.ts" },
    enabled: true,
  }],
};

describe("ConversationSettingsDialog", () => {
  it("only exposes global tool configuration", async () => {
    const onGlobalTool = vi.fn().mockResolvedValue(undefined);
    render(<TooltipProvider><ConversationSettingsDialog
      open
      onOpenChange={vi.fn()}
      toolSettings={toolSettings}
      onGlobalTool={onGlobalTool}
    /></TooltipProvider>);

    expect(screen.getByRole("heading", { name: "全局设置" })).toBeInTheDocument();
    expect(screen.getByText("管理所有会话可用的工具。修改会立即应用到现有会话及后续新建的会话。")).toBeInTheDocument();
    expect(screen.getByText("pi-web-access")).toBeInTheDocument();
    expect(screen.getByText("web_search")).toBeInTheDocument();
    expect(screen.getByText("已启用")).toBeInTheDocument();
    expect(screen.queryByText("运行策略")).not.toBeInTheDocument();
    expect(screen.queryByText("当前会话")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "web_search 全局状态" }));
    await waitFor(() => expect(onGlobalTool).toHaveBeenCalledWith("web_search", false));
  });
});
