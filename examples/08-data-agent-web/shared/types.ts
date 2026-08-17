import type { DataCatalog, Scalar } from "@warjiang/data-agent-core";

export type WorkspaceStatus = "empty" | "ready" | "running" | "stopping" | "error";
export type MessageRole = "user" | "assistant";
export type ChartMark = "bar" | "line" | "area" | "point";
export type FieldType = "quantitative" | "temporal" | "nominal" | "ordinal";

export interface TranscriptMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  streaming?: boolean;
  evidenceRefs?: EvidenceReference[];
}

export interface ToolTrace {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: "running" | "success" | "error";
  startedAt: string;
  endedAt?: string;
  resultId?: string;
  chartId?: string;
  attributionId?: string;
}

export interface QueryArtifact {
  id: string;
  sql: string;
  sourceName: string;
  columns: string[];
  rows: Record<string, Scalar>[];
  rowCount: number;
  truncated: boolean;
  elapsedMs: number;
  createdAt: string;
}

export interface ChartEncoding {
  field: string;
  type: FieldType;
  title?: string;
  sort?: "ascending" | "descending";
}

export interface ChartIntent {
  resultId: string;
  title: string;
  mark: ChartMark;
  x: ChartEncoding;
  y: ChartEncoding;
  color?: ChartEncoding;
}

export interface ChartArtifact {
  id: string;
  resultId: string;
  title: string;
  intent: ChartIntent;
  createdAt: string;
}

export interface AttributionIntent {
  resultId: string;
  title: string;
  dimensionField: string;
  baselineField: string;
  currentField: string;
  metric?: string;
}

export interface AttributionContribution {
  dimension: Scalar;
  baseline: number;
  current: number;
  delta: number;
  contributionShare: number | null;
}

export interface AttributionArtifact {
  id: string;
  resultId: string;
  title: string;
  sourceName: string;
  sql: string;
  dimensionField: string;
  baselineField: string;
  currentField: string;
  metric?: string;
  baselineTotal: number;
  currentTotal: number;
  delta: number;
  changeRate: number | null;
  contributions: AttributionContribution[];
  method: "period-over-period-contribution";
  caveats: string[];
  createdAt: string;
}

export type EvidenceArtifactKind = "query" | "chart" | "attribution";

export interface EvidenceReference {
  token: string;
  artifactId: string;
  kind?: EvidenceArtifactKind;
  valid: boolean;
}

export interface WorkspaceInfo {
  id: string;
  sourceName: string;
  sourceSize: number;
  model: string;
  createdAt: string;
}

export interface WorkspaceSnapshot {
  workspace: WorkspaceInfo | null;
  status: WorkspaceStatus;
  catalog: DataCatalog | null;
  messages: TranscriptMessage[];
  tools: ToolTrace[];
  queries: QueryArtifact[];
  charts: ChartArtifact[];
  attributions: AttributionArtifact[];
  lastEventId: number;
  error?: string;
}

export type StreamEventType =
  | "workspace.ready"
  | "workspace.deleted"
  | "message.added"
  | "message.delta"
  | "message.completed"
  | "tool.started"
  | "tool.completed"
  | "query.created"
  | "chart.created"
  | "attribution.created"
  | "run.started"
  | "run.completed"
  | "run.stopping"
  | "run.aborted"
  | "run.error"
  | "run.retrying"
  | "run.compacting"
  | "snapshot.required";

export interface StreamEvent<T = unknown> {
  id: number;
  type: StreamEventType;
  timestamp: string;
  payload: T;
}

export interface ApiError {
  error: string;
}
