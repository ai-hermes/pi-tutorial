import assert from "node:assert/strict";
import test from "node:test";
import { assertReadOnlySql, UnsafeQueryError } from "./sql-safety.js";

test("accepts SELECT and CTE queries", () => {
  assert.equal(assertReadOnlySql("SELECT * FROM users;"), "SELECT * FROM users");
  assert.equal(assertReadOnlySql("WITH totals AS (SELECT 1 AS n) SELECT * FROM totals"), "WITH totals AS (SELECT 1 AS n) SELECT * FROM totals");
});

test("ignores keywords in strings, identifiers, and comments", () => {
  assert.doesNotThrow(() => assertReadOnlySql("SELECT 'delete', \"update\" -- drop\nFROM records"));
});

test("rejects writes, multiple statements, and file functions", () => {
  for (const sql of [
    "DELETE FROM users",
    "SELECT 1; SELECT 2",
    "WITH gone AS (DELETE FROM users RETURNING *) SELECT * FROM gone",
    "SELECT readfile('/etc/passwd')",
    "PRAGMA table_info(users)",
  ]) {
    assert.throws(() => assertReadOnlySql(sql), UnsafeQueryError);
  }
});
