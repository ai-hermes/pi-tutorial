import { access } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, persistUpload, removeUpload, validateUpload } from "./uploads";

describe("upload lifecycle", () => {
  it("accepts supported data files and removes the temporary directory", async () => {
    const upload = await persistUpload(new File(["region,amount\n华东,120\n"], "sales.csv", { type: "text/csv" }));
    await expect(access(upload.path)).resolves.toBeUndefined();
    expect(upload.originalName).toBe("sales.csv");
    await removeUpload(upload);
    await expect(access(upload.tempDir)).rejects.toThrow();
  });

  it("rejects unsupported and oversized files", () => {
    expect(() => validateUpload({ name: "notes.txt", size: 10 })).toThrow(/Unsupported/);
    expect(() => validateUpload({ name: "sales.csv", size: MAX_UPLOAD_BYTES + 1 })).toThrow(/25 MB/);
  });
});
