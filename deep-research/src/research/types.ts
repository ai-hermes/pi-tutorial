export const PLATFORMS = ["xiaohongshu", "douyin", "wechat"] as const;
export type Platform = (typeof PLATFORMS)[number];
export type Confidence = "low" | "medium" | "high";

export interface ResearchBudget {
  candidateLimit: number;
  detailLimit: number;
  commentLimit: number;
}

export interface ResearchQuery {
  id: string;
  platform: Platform;
  text: string;
  intent: "core" | "scenario" | "pain" | "counter" | "trend";
}

export interface ResearchBrief {
  question: string;
  context?: string;
  since?: string;
  audience: string;
  scope: string;
  queries: ResearchQuery[];
  budget: ResearchBudget;
  platforms: Platform[];
}

export interface CandidateRecord {
  id: string;
  runId: string;
  queryId: string;
  platform: Platform;
  title: string;
  author?: string;
  snippet?: string;
  publishedAt?: string;
  engagement?: Record<string, number | string>;
  rank: number;
  relevance: number;
  novelty: number;
  locator: string;
  evidenceIds: string[];
}

export interface ContentRecord {
  id: string;
  runId: string;
  candidateId: string;
  platform: Platform;
  title: string;
  body: string;
  author?: string;
  publishedAt?: string;
  engagement?: Record<string, number | string>;
  visualSummary?: string;
  canonicalUrl?: string;
  locator: string;
  confidence: Confidence;
  evidenceIds: string[];
}

export interface CommentRecord {
  id: string;
  runId: string;
  contentId: string;
  platform: Platform;
  text: string;
  author?: string;
  engagement?: Record<string, number | string>;
  stance?: "support" | "oppose" | "mixed" | "question" | "neutral";
  evidenceIds: string[];
}

export interface EvidenceRecord {
  id: string;
  runId: string;
  platform: Platform;
  kind: "screenshot" | "frame" | "ui_dump";
  path: string;
  capturedAt: string;
  packageName?: string;
  sha256: string;
  note?: string;
}

export interface Checkpoint {
  runId: string;
  platform: Platform;
  stage: string;
  queryId?: string;
  candidateId?: string;
  cursor?: string;
  screen?: string;
  recoveryAction: string;
  updatedAt: string;
}

export interface Insight {
  id: string;
  runId: string;
  category: "need" | "pain" | "scenario" | "decision" | "trend" | "difference" | "limitation";
  title: string;
  finding: string;
  platforms: Platform[];
  evidenceIds: string[];
  counterEvidenceIds: string[];
  confidence: Confidence;
}

export interface RunRecord {
  id: string;
  status: "planned" | "running" | "needs_input" | "completed" | "failed" | "cancelled";
  stage: string;
  brief: ResearchBrief;
  createdAt: string;
  updatedAt: string;
  error?: string;
}
