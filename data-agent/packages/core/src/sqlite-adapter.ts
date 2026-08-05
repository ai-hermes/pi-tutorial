import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { basename, extname, resolve } from "node:path";
import { stat } from "node:fs/promises";
import { assertReadOnlySql, quoteIdentifier } from "./sql-safety.js";
import { readTabularFile, type TabularData } from "./tabular.js";
import type {
  ColumnProfile,
  DataCatalog,
  LocalDataSource,
  QueryOptions,
  LocalQueryResult,
  RelationProfile,
  Scalar,
} from "./types.js";

const SQLITE_EXTENSIONS = new Set([".db", ".sqlite", ".sqlite3"]);
const TABULAR_EXTENSIONS = new Set([".csv", ".tsv", ".json", ".jsonl", ".ndjson"]);

function normalizeValue(value: unknown): Scalar {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") {
    return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER)
      ? Number(value)
      : value.toString();
  }
  if (value instanceof Uint8Array) return `<blob:${value.byteLength} bytes>`;
  return String(value);
}

function normalizeRow(row: Record<string, unknown>): Record<string, Scalar> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, normalizeValue(value)]));
}

function inferredSqlType(data: TabularData, column: string): "INTEGER" | "REAL" | "TEXT" {
  const values = data.rows.map((row) => row[column]).filter((value) => value !== null);
  if (values.length > 0 && values.every((value) => typeof value === "number" && Number.isInteger(value))) return "INTEGER";
  if (values.length > 0 && values.every((value) => typeof value === "number")) return "REAL";
  if (values.length > 0 && values.every((value) => typeof value === "boolean")) return "INTEGER";
  return "TEXT";
}

function toSqlInput(value: Scalar): SQLInputValue {
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

export class SqliteDataSource implements LocalDataSource {
  readonly dialect = "sqlite" as const;

  private constructor(
    readonly id: string,
    private readonly database: DatabaseSync,
  ) {}

  static async open(inputPath: string): Promise<SqliteDataSource> {
    const path = resolve(inputPath);
    const file = await stat(path).catch(() => undefined);
    if (!file?.isFile()) throw new Error(`Data source is not a file: ${path}`);

    const extension = extname(path).toLowerCase();
    if (SQLITE_EXTENSIONS.has(extension)) {
      return new SqliteDataSource(path, new DatabaseSync(path, { readOnly: true }));
    }
    if (TABULAR_EXTENSIONS.has(extension)) {
      const database = new DatabaseSync(":memory:");
      const source = new SqliteDataSource(path, database);
      source.loadTable("data", await readTabularFile(path));
      return source;
    }
    throw new Error(`Unsupported data source ${basename(path)}. Use SQLite, CSV, TSV, JSON, or JSONL.`);
  }

  private loadTable(name: string, data: TabularData): void {
    if (data.columns.length === 0) throw new Error("The tabular source has no columns.");
    const definitions = data.columns
      .map((column) => `${quoteIdentifier(column)} ${inferredSqlType(data, column)}`)
      .join(", ");
    this.database.exec(`CREATE TABLE ${quoteIdentifier(name)} (${definitions})`);

    const placeholders = data.columns.map(() => "?").join(", ");
    const insert = this.database.prepare(
      `INSERT INTO ${quoteIdentifier(name)} (${data.columns.map(quoteIdentifier).join(", ")}) VALUES (${placeholders})`,
    );
    this.database.exec("BEGIN");
    try {
      for (const row of data.rows) insert.run(...data.columns.map((column) => toSqlInput(row[column] ?? null)));
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  async catalog(): Promise<DataCatalog> {
    const relations = this.database.prepare(
      "SELECT name, type FROM sqlite_schema WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\' ORDER BY name",
    ).all() as Array<{ name: string; type: "table" | "view" }>;

    return {
      source: this.id,
      dialect: this.dialect,
      relations: relations.map((relation) => {
        const columns = this.database.prepare(`PRAGMA table_xinfo(${quoteIdentifier(relation.name)})`).all() as Array<{
          name: string;
          type: string;
          notnull: number;
          pk: number;
          hidden: number;
        }>;
        return {
          name: relation.name,
          type: relation.type,
          columns: columns.filter((column) => column.hidden === 0).map((column) => ({
            name: column.name,
            declaredType: column.type || "ANY",
            nullable: column.notnull === 0,
            primaryKey: column.pk > 0,
          })),
        };
      }),
    };
  }

  async profile(relation: string): Promise<RelationProfile> {
    const schema = (await this.catalog()).relations.find((candidate) => candidate.name === relation);
    if (!schema) throw new Error(`Unknown relation: ${relation}`);

    const table = quoteIdentifier(relation);
    const countRow = this.database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number | bigint };
    const columns: ColumnProfile[] = schema.columns.map((column) => {
      const name = quoteIdentifier(column.name);
      const summary = this.database.prepare(
        `SELECT COUNT(*) - COUNT(${name}) AS null_count, COUNT(DISTINCT ${name}) AS distinct_count, MIN(${name}) AS min_value, MAX(${name}) AS max_value, AVG(${name}) AS average FROM ${table}`,
      ).get() as Record<string, unknown>;
      const top = this.database.prepare(
        `SELECT ${name} AS value, COUNT(*) AS count FROM ${table} WHERE ${name} IS NOT NULL GROUP BY ${name} ORDER BY count DESC, ${name} LIMIT 5`,
      ).all() as Array<{ value: unknown; count: number | bigint }>;
      return {
        name: column.name,
        declaredType: column.declaredType,
        nullCount: Number(summary.null_count),
        distinctCount: Number(summary.distinct_count),
        min: normalizeValue(summary.min_value),
        max: normalizeValue(summary.max_value),
        ...(typeof summary.average === "number" ? { average: summary.average } : {}),
        topValues: top.map((item) => ({ value: normalizeValue(item.value), count: Number(item.count) })),
      };
    });

    return { relation, rowCount: Number(countRow.count), columns };
  }

  async query(inputSql: string, options: QueryOptions = {}): Promise<LocalQueryResult> {
    const sql = assertReadOnlySql(inputSql);
    const maxRows = Math.min(Math.max(options.maxRows ?? 200, 1), 10_000);
    const start = performance.now();
    const statement = this.database.prepare(sql);
    const rows: Record<string, Scalar>[] = [];
    let truncated = false;

    for (const rawRow of statement.iterate() as Iterable<Record<string, unknown>>) {
      if (rows.length >= maxRows) {
        truncated = true;
        break;
      }
      rows.push(normalizeRow(rawRow));
    }

    return {
      columns: statement.columns().map((column) => column.name),
      rows,
      rowCount: rows.length,
      truncated,
      elapsedMs: Math.round((performance.now() - start) * 100) / 100,
    };
  }

  close(): void {
    this.database.close();
  }
}

export async function openDataSource(path: string): Promise<LocalDataSource> {
  return SqliteDataSource.open(path);
}
