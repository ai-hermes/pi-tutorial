import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = new Set([".db", ".sqlite", ".sqlite3", ".csv", ".tsv", ".json", ".jsonl", ".ndjson"]);

export interface PersistedUpload {
  originalName: string;
  size: number;
  tempDir: string;
  path: string;
}

export class UploadError extends Error {
  constructor(message: string, readonly status: 400 | 413 = 400) {
    super(message);
    this.name = "UploadError";
  }
}

export function validateUpload(file: Pick<File, "name" | "size">): string {
  const extension = extname(file.name).toLowerCase();
  if (!ACCEPTED_EXTENSIONS.has(extension)) {
    throw new UploadError("Unsupported file type. Upload SQLite, CSV, TSV, JSON, JSONL, or NDJSON.");
  }
  if (file.size === 0) throw new UploadError("The uploaded file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("The uploaded file exceeds the 25 MB limit.", 413);
  return extension;
}

export async function persistUpload(file: File): Promise<PersistedUpload> {
  const extension = validateUpload(file);
  const tempDir = await mkdtemp(join(tmpdir(), "pi-data-agent-web-"));
  const path = join(tempDir, `source${extension}`);
  try {
    await writeFile(path, new Uint8Array(await file.arrayBuffer()));
    return { originalName: basename(file.name), size: file.size, tempDir, path };
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true });
    throw error;
  }
}

export async function removeUpload(upload: Pick<PersistedUpload, "tempDir">): Promise<void> {
  await rm(upload.tempDir, { recursive: true, force: true });
}
