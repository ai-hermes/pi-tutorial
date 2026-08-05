import type { AndroidDriver } from "../android/driver.js";
import type { EvidenceRepository } from "./evidence.js";
import type { ResearchStore } from "./store.js";
import type { CandidateRecord, ContentRecord, Platform, ResearchQuery } from "./types.js";

export interface NavigationOutcome {
  submitted: number;
  needsHuman?: string;
}

export interface PlatformContext {
  runId: string;
  runDir: string;
  platform: Platform;
  driver: AndroidDriver;
  evidence: EvidenceRepository;
  store: ResearchStore;
}

export interface PlatformAdapter {
  readonly platform: Platform;
  search(query: ResearchQuery, limit: number): Promise<NavigationOutcome>;
  collectDetail(candidate: CandidateRecord): Promise<NavigationOutcome>;
  collectComments(content: ContentRecord, limit: number): Promise<NavigationOutcome>;
  recover(): Promise<NavigationOutcome>;
}
