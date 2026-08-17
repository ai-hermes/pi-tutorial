/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { UploadScreen } from "./UploadScreen";

describe("upload screen", () => {
  it("passes the selected file to the upload handler", () => {
    const onUpload = vi.fn();
    const { container } = render(<UploadScreen onUpload={onUpload} uploading={false} />);
    const input = container.querySelector("input[type=file]") as HTMLInputElement;
    const file = new File(["region,amount\n华东,1"], "sales.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it("shows an accessible error and disables selection while uploading", () => {
    render(<UploadScreen onUpload={() => undefined} uploading error="文件过大" />);
    expect(screen.getByRole("alert")).toHaveTextContent("文件过大");
    expect(screen.getByRole("button", { name: "正在连接" })).toBeDisabled();
  });
});
