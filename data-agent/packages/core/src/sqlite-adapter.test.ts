import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openDataSource } from "./sqlite-adapter.js";

test("loads, catalogs, profiles, and queries CSV data", async () => {
  const directory = await mkdtemp(join(tmpdir(), "data-agent-"));
  const path = join(directory, "sales.csv");
  await writeFile(path, "region,amount\nEast,10\nWest,20\nEast,30\n");
  const source = await openDataSource(path);

  try {
    const catalog = await source.catalog();
    assert.deepEqual(catalog.relations.map((relation) => relation.name), ["data"]);
    assert.deepEqual(catalog.relations[0]?.columns.map((column) => column.name), ["region", "amount"]);

    const profile = await source.profile("data");
    assert.equal(profile.rowCount, 3);
    assert.equal(profile.columns.find((column) => column.name === "region")?.distinctCount, 2);

    const result = await source.query("SELECT region, SUM(amount) AS total FROM data GROUP BY region ORDER BY total DESC");
    assert.deepEqual(result.rows, [
      { region: "East", total: 40 },
      { region: "West", total: 20 },
    ]);
  } finally {
    source.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("caps returned rows", async () => {
  const directory = await mkdtemp(join(tmpdir(), "data-agent-"));
  const path = join(directory, "items.json");
  await writeFile(path, JSON.stringify([{ id: 1 }, { id: 2 }, { id: 3 }]));
  const source = await openDataSource(path);
  try {
    const result = await source.query("SELECT * FROM data ORDER BY id", { maxRows: 2 });
    assert.equal(result.rowCount, 2);
    assert.equal(result.truncated, true);
  } finally {
    source.close();
    await rm(directory, { recursive: true, force: true });
  }
});
