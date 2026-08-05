import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import type { Scalar } from "./types.js";

export interface TabularData {
  columns: string[];
  rows: Record<string, Scalar>[];
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (quoted) throw new Error("Unterminated quoted field in delimited file.");
  if (value.length > 0 || row.length > 0) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function uniqueColumns(raw: string[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((name, index) => {
    const base = name.trim() || `column_${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

function inferScalar(value: unknown): Scalar {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed)) {
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric)) return numeric;
    }
    if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === "true";
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return value;
  return JSON.stringify(value);
}

function fromObjects(input: unknown[]): TabularData {
  const objects = input.filter((value): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value),
  );
  if (objects.length !== input.length) throw new Error("JSON data must be an object or an array of objects.");

  const columns = [...new Set(objects.flatMap((row) => Object.keys(row)))];
  return {
    columns,
    rows: objects.map((row) => Object.fromEntries(columns.map((column) => [column, inferScalar(row[column])]))),
  };
}

export async function readTabularFile(path: string): Promise<TabularData> {
  const extension = extname(path).toLowerCase();
  const text = await readFile(path, "utf8");

  if (extension === ".csv" || extension === ".tsv") {
    const records = parseDelimited(text.replace(/^\uFEFF/, ""), extension === ".tsv" ? "\t" : ",");
    if (records.length === 0) return { columns: [], rows: [] };
    const columns = uniqueColumns(records[0]!);
    return {
      columns,
      rows: records.slice(1).filter((record) => record.some((value) => value !== "")).map((record) =>
        Object.fromEntries(columns.map((column, index) => [column, inferScalar(record[index] ?? "")]))),
    };
  }

  if (extension === ".json") {
    const parsed: unknown = JSON.parse(text);
    return fromObjects(Array.isArray(parsed) ? parsed : [parsed]);
  }

  if (extension === ".jsonl" || extension === ".ndjson") {
    const values = text.split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line) as unknown);
    return fromObjects(values);
  }

  throw new Error(`Unsupported tabular file extension: ${extension || "(none)"}.`);
}
