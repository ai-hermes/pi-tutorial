export type DataSourceKind = "csv" | "duckdb" | "sqlite" | "postgresql" | "bi";

export interface DataSourceIdentity {
  id: string;
  name: string;
  kind: DataSourceKind;
}

export interface DataSourceCapabilities {
  canQuery: boolean;
  canProfile: boolean;
  supportsTransactions: boolean;
  supportsTimeout: boolean;
  supportsRowLimit: boolean;
}

export interface DataSourceHealth {
  ok: boolean;
  message?: string;
}

export interface DataCatalogEntry {
  schema?: string;
  name: string;
  type: "table" | "view";
}

export interface DataColumn {
  name: string;
  dataType: string;
  nullable: boolean;
}

export interface DataSchema {
  schema?: string;
  table: string;
  columns: DataColumn[];
}

export interface ProfileMetric {
  field: string;
  metric: string;
  value: string | number | boolean | null;
}

export interface ProfileResult {
  table: string;
  sampledRows: number;
  metrics: ProfileMetric[];
}

export interface QueryRequest {
  sql: string;
  timeoutMs: number;
  rowLimit: number;
}

export interface QueryColumn {
  name: string;
  dataType: string;
}

export interface QueryResult {
  columns: QueryColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  elapsedMs: number;
  source: {
    dataSourceId: string;
    dataSourceName: string;
    kind: DataSourceKind;
  };
}

/** Full adapter contract retained for future database and BI connectors. */
export interface DataSourceAdapter {
  readonly identity: DataSourceIdentity;
  readonly dialect: string;
  readonly capabilities: DataSourceCapabilities;
  connect(): Promise<void>;
  close(): Promise<void>;
  health(): Promise<DataSourceHealth>;
  catalog(): Promise<DataCatalogEntry[]>;
  schema(entryName: string): Promise<DataSchema>;
  profile(entryName: string, sampleRows: number): Promise<ProfileResult>;
  query(request: QueryRequest): Promise<QueryResult>;
}

// Lightweight local-source contract used by the first runnable Pi CLI.
export type Scalar = string | number | bigint | boolean | null;

export interface ColumnSchema {
  name: string;
  declaredType: string;
  nullable: boolean;
  primaryKey: boolean;
}

export interface RelationSchema {
  name: string;
  type: "table" | "view";
  columns: ColumnSchema[];
}

export interface DataCatalog {
  source: string;
  dialect: "sqlite";
  relations: RelationSchema[];
}

export interface ValueFrequency {
  value: Scalar;
  count: number;
}

export interface ColumnProfile {
  name: string;
  declaredType: string;
  nullCount: number;
  distinctCount: number;
  min?: Scalar;
  max?: Scalar;
  average?: number;
  topValues: ValueFrequency[];
}

export interface RelationProfile {
  relation: string;
  rowCount: number;
  columns: ColumnProfile[];
}

export interface LocalQueryResult {
  columns: string[];
  rows: Record<string, Scalar>[];
  rowCount: number;
  truncated: boolean;
  elapsedMs: number;
}

export interface QueryOptions {
  maxRows?: number;
}

export interface LocalDataSource {
  readonly id: string;
  readonly dialect: "sqlite";
  catalog(): Promise<DataCatalog>;
  profile(relation: string): Promise<RelationProfile>;
  query(sql: string, options?: QueryOptions): Promise<LocalQueryResult>;
  close(): void;
}

export interface EvidenceItem {
  claim: string;
  sql: string;
  result: LocalQueryResult;
}

export interface AnalysisReport {
  title: string;
  summary: string;
  evidence: EvidenceItem[];
  caveats: string[];
}
