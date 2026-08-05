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

export interface PostgreSqlAdapterConfig {
  connectionString: string;
  readOnly: boolean;
}

export class PostgreSqlDataSourceAdapter implements DataSourceAdapter {
  readonly dialect = "postgresql";
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
    readonly config: PostgreSqlAdapterConfig,
  ) {}

  async connect(): Promise<void> {
    if (!this.config.connectionString.trim()) {
      throw new DataAdapterError("PostgreSQL connectionString is required.", "invalid_config");
    }
    if (!this.config.readOnly) {
      throw new DataAdapterError("PostgreSQL adapter must run in read-only mode.", "permission_denied");
    }
    this.connected = true;
  }

  async close(): Promise<void> {
    this.connected = false;
  }

  async health(): Promise<DataSourceHealth> {
    return this.connected
      ? { ok: true }
      : { ok: false, message: "PostgreSQL adapter is not connected." };
  }

  async catalog(): Promise<DataCatalogEntry[]> {
    this.assertConnected();
    throw new DataAdapterError("PostgreSQL catalog is not implemented yet.", "unsupported");
  }

  async schema(_entryName: string): Promise<DataSchema> {
    this.assertConnected();
    throw new DataAdapterError("PostgreSQL schema is not implemented yet.", "unsupported");
  }

  async profile(_entryName: string, _sampleRows: number): Promise<ProfileResult> {
    this.assertConnected();
    throw new DataAdapterError("PostgreSQL profile is not implemented yet.", "unsupported");
  }

  async query(_request: QueryRequest): Promise<QueryResult> {
    this.assertConnected();
    throw new DataAdapterError("PostgreSQL query is not implemented yet.", "unsupported");
  }

  private assertConnected(): void {
    if (!this.connected) {
      throw new DataAdapterError("PostgreSQL adapter is not connected.", "not_connected");
    }
  }
}
