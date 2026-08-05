import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AndroidDriver, AndroidObservation } from "../android/driver.js";
import { overlayGrid } from "../android/grid.js";
import type { Platform } from "./types.js";
import type { ResearchStore } from "./store.js";
import { id, sha256 } from "./utils.js";

export interface CapturedObservation {
  observation: AndroidObservation;
  screenshotId: string;
  dumpId: string;
  modelImage: Buffer;
  gridStep: number;
  width: number;
  height: number;
}

export class EvidenceRepository {
  private readonly evidenceDir: string;

  constructor(
    readonly runId: string,
    readonly runDir: string,
    private readonly store: ResearchStore,
    private readonly driver: AndroidDriver,
  ) {
    this.evidenceDir = join(runDir, "evidence");
  }

  async capture(platform: Platform, note: string, kind: "screenshot" | "frame" = "screenshot"):
    Promise<CapturedObservation> {
    await mkdir(this.evidenceDir, { recursive: true });
    const observation = await this.driver.observe({ screenshot: true });
    if (!observation.screenshot) throw new Error("设备截图为空");
    const screenshotId = id("ev");
    const dumpId = id("ev");
    const screenshotName = `${screenshotId}.png`;
    const dumpName = `${dumpId}.txt`;
    await writeFile(join(this.evidenceDir, screenshotName), observation.screenshot);
    await writeFile(join(this.evidenceDir, dumpName), observation.formatted, "utf8");
    this.store.addEvidence({ id: screenshotId, runId: this.runId, platform, kind,
      path: `evidence/${screenshotName}`, capturedAt: observation.capturedAt,
      packageName: observation.packageName ?? undefined, sha256: sha256(observation.screenshot), note });
    this.store.addEvidence({ id: dumpId, runId: this.runId, platform, kind: "ui_dump",
      path: `evidence/${dumpName}`, capturedAt: observation.capturedAt,
      packageName: observation.packageName ?? undefined, sha256: sha256(observation.formatted), note });
    const grid = overlayGrid(observation.screenshot);
    return { observation, screenshotId, dumpId, modelImage: grid.data, gridStep: grid.step,
      width: grid.width, height: grid.height };
  }
}
