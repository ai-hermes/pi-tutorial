const FORBIDDEN_WORDS = new Set([
  "alter",
  "analyze",
  "attach",
  "begin",
  "commit",
  "create",
  "delete",
  "detach",
  "drop",
  "insert",
  "load_extension",
  "pragma",
  "reindex",
  "release",
  "replace",
  "rollback",
  "savepoint",
  "update",
  "vacuum",
]);

export class UnsafeQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeQueryError";
  }
}

/**
 * Masks comments and quoted values while preserving unquoted SQL tokens. This is
 * deliberately conservative: malformed SQL is rejected before it reaches SQLite.
 */
function searchableSql(sql: string): { text: string; semicolons: number } {
  let text = "";
  let semicolons = 0;
  let index = 0;

  while (index < sql.length) {
    const char = sql[index]!;
    const next = sql[index + 1];

    if (char === "-" && next === "-") {
      index += 2;
      while (index < sql.length && sql[index] !== "\n") index += 1;
      text += " ";
      continue;
    }
    if (char === "/" && next === "*") {
      const end = sql.indexOf("*/", index + 2);
      if (end < 0) throw new UnsafeQueryError("Unterminated SQL comment.");
      index = end + 2;
      text += " ";
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      const quote = char;
      index += 1;
      while (index < sql.length) {
        if (sql[index] === quote) {
          if (sql[index + 1] === quote) {
            index += 2;
            continue;
          }
          index += 1;
          break;
        }
        index += 1;
      }
      if (sql[index - 1] !== quote) throw new UnsafeQueryError("Unterminated SQL string or identifier.");
      text += " ";
      continue;
    }
    if (char === "[") {
      const end = sql.indexOf("]", index + 1);
      if (end < 0) throw new UnsafeQueryError("Unterminated SQL identifier.");
      index = end + 1;
      text += " ";
      continue;
    }
    if (char === ";") semicolons += 1;
    text += char;
    index += 1;
  }

  return { text, semicolons };
}

export function assertReadOnlySql(input: string): string {
  const sql = input.trim();
  if (!sql) throw new UnsafeQueryError("SQL must not be empty.");

  const { text, semicolons } = searchableSql(sql);
  const normalized = text.trim().replace(/;+\s*$/, "").trim();
  const trailingSemicolons = (text.trim().match(/;+$/)?.[0].length ?? 0);
  if (semicolons > trailingSemicolons || trailingSemicolons > 1) {
    throw new UnsafeQueryError("Only one SQL statement is allowed.");
  }

  const firstWord = normalized.match(/^[a-z_]+/i)?.[0]?.toLowerCase();
  if (firstWord !== "select" && firstWord !== "with" && firstWord !== "explain") {
    throw new UnsafeQueryError("Only SELECT, WITH, or EXPLAIN queries are allowed.");
  }

  const words = normalized.toLowerCase().match(/[a-z_][a-z0-9_]*/g) ?? [];
  const forbidden = words.find((word) => FORBIDDEN_WORDS.has(word));
  if (forbidden) throw new UnsafeQueryError(`Forbidden SQL keyword or function: ${forbidden}.`);

  if (/\breadfile\s*\(/i.test(normalized) || /\bwritefile\s*\(/i.test(normalized)) {
    throw new UnsafeQueryError("File access functions are not allowed.");
  }

  return sql.replace(/;\s*$/, "");
}

export function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}
