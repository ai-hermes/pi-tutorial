import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "./App";
import { PermissionMenu } from "./components/Composer";

describe("PermissionMenu", () => {
  it("exposes the single persistent local-permission warning", () => {
    render(<TooltipProvider><PermissionMenu /></TooltipProvider>);
    expect(screen.getByRole("button", { name: "权限：本机完整权限" })).toBeInTheDocument();
  });
});

describe("ThemeToggle", () => {
  it("switches directly between light and dark without opening a menu", () => {
    const onThemeChange = vi.fn();
    render(<TooltipProvider><ThemeToggle resolvedTheme="light" onThemeChange={onThemeChange} /></TooltipProvider>);
    fireEvent.click(screen.getByRole("button", { name: "切换到深色模式" }));
    expect(onThemeChange).toHaveBeenCalledWith("dark");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
