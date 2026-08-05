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

export interface CsvAdapterConfig {
  csvPath: string;
  tableName: string;
}

export class CsvDataSourceAdapter implements DataSourceAdapter {
  readonly dialect = "duckdb";
  readonly capabilities: DataSourceCapabilities = {
    canQuery: true,
    canProfile: true,
    supportsTransactions: false,
    supportsTimeout: true,
    supportsRowLimit: true,
  };

  private connected = false;

  constructor(
    readonly identity: DataSourceIdentity,
    readonly config: CsvAdapterConfig,
  ) {}

  async connect(): Promise<void> {
    if (!this.config.csvPath.trim()) {
      throw new DataAdapterError("CSV path is required.", "invalid_config");
    }
    if (!this.config.tableName.trim()) {
      throw new DataAdapterError("CSV table name is required.", "invalid_config");
    }
    // CSV will be loaded into an isolated read-only DuckDB runtime in the next step.
    this.connected = true;
  }

  async close(): Promise<void> {
    this.connected = false;
  }

  async health(): Promise<DataSourceHealth> {
    return this.connected
      ? { ok: true }
      : { ok: false, message: "CSV adapter is not connected." };
  }

  async catalog(): Promise<DataCatalogEntry[]> {
    this.assertConnected();
    return [{ name: this.config.tableName, type: "table" }];
  }

  async schema(_entryName: string): Promise<DataSchema> {
    this.assertConnected();
    throw new DataAdapterError("CSV schema introspection is not implemented yet.", "unsupported");
  }

  async profile(_entryName: string, _sampleRows: number): Promise<ProfileResult> {
    this.assertConnected();
    throw new DataAdapterError("CSV profile is not implemented yet.", "unsupported");
  }

  async query(_request: QueryRequest): Promise<QueryResult> {
    this.assertConnected();
    throw new DataAdapterError("CSV query execution is not implemented yet.", "unsupported");
  }

  private assertConnected(): void {
    if (!this.connected) {
      throw new DataAdapterError("CSV adapter is not connected.", "not_connected");
    }
  }
}
