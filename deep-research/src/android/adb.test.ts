import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { AndroidDriver } from "./driver.js";
import { listDevices } from "./adb.js";

test("ADB wrapper passes explicit arguments to a fake executable", async () => {
  const dir = await mkdtemp(join(tmpdir(), "deep-research-adb-"));
  const fake = join(dir, "fake-adb.mjs");
  const log = join(dir, "calls.log");
  await writeFile(fake, `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
appendFileSync(process.env.FAKE_ADB_LOG, process.argv.slice(2).join(" ") + "\\n");
if (process.argv[2] === "devices") process.stdout.write("List of devices attached\\nserial-1\\tdevice\\n");
`, "utf8");
  await chmod(fake, 0o755);
  const previousPath = process.env.ADB_PATH;
  const previousLog = process.env.FAKE_ADB_LOG;
  process.env.ADB_PATH = fake;
  process.env.FAKE_ADB_LOG = log;
  try {
    assert.deepEqual(await listDevices(), [{ serial: "serial-1", state: "device" }]);
    await new AndroidDriver().tap(12, 34);
    const calls = await readFile(log, "utf8");
    assert.match(calls, /^devices$/m);
    assert.match(calls, /^shell input tap 12 34$/m);
  } finally {
    if (previousPath === undefined) delete process.env.ADB_PATH; else process.env.ADB_PATH = previousPath;
    if (previousLog === undefined) delete process.env.FAKE_ADB_LOG; else process.env.FAKE_ADB_LOG = previousLog;
  }
});
