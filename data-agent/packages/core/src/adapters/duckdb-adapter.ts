import { DataAdapterError } from "../errors.js";
import type {
  DataCatalogEntry,
  DataSchema,
  DataSourceAdapter,
  DataSourceCapabilities,
  DataSourceHealth,
  DataSourceIdentity,
  ProfileResult,
  QueryRequest,
  QueryResult,
} from "../types.js";

export interface DuckDbAdapterConfig {
  databasePath: string;
  readOnly: boolean;
}

export class DuckDbDataSourceAdapter implements DataSourceAdapter {
  readonly dialect = "duckdb";
  readonly capabilities: DataSourceCapabilities = {
    canQuery: true,
    canProfile: true,
    supportsTransactions: true,
    supportsTimeout: true,
    supportsRowLimit: true,
  };

  private connected = false;

  constructor(
    readonly identity: DataSourceIdentity,
    readonly config: DuckDbAdapterConfig,
  ) {}

  async connect(): Promise<void> {
    if (!this.config.databasePath.trim()) {
      throw new DataAdapterError("DuckDB databasePath is required.", "invalid_config");
    }
    if (!this.config.readOnly) {
      throw new DataAdapterError("DuckDB adapter must run in read-only mode.", "permission_denied");
    }
    this.connected = true;
  }

  async close(): Promise<void> {
    this.connected = false;
  }

  async health(): Promise<DataSourceHealth> {
    return this.connected
      ? { ok: true }
      : { ok: false, message: "DuckDB adapter is not connected." };
  }

  async catalog(): Promise<DataCatalogEntry[]> {
    this.assertConnected();
    throw new DataAdapterError("DuckDB catalog is not implemented yet.", "unsupported");
  }

  async schema(_entryName: string): Promise<DataSchema> {
    this.assertConnected();
    throw new DataAdapterError("DuckDB schema is not implemented yet.", "unsupported");
  }

  async profile(_entryName: string, _sampleRows: number): Promise<ProfileResult> {
    this.assertConnected();
    throw new DataAdapterError("DuckDB profile is not implemented yet.", "unsupported");
  }

  async query(_request: QueryRequest): Promise<QueryResult> {
    this.assertConnected();
    throw new DataAdapterError("DuckDB query is not implemented yet.", "unsupported");
  }

  private assertConnected(): void {
    if (!this.connected) {
      throw new DataAdapterError("DuckDB adapter is not connected.", "not_connected");
    }
  }
}
