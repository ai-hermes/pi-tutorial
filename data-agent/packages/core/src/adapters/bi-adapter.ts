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

export class BiDataSourceAdapter implements DataSourceAdapter {
  readonly dialect = "bi";
  readonly capabilities: DataSourceCapabilities = {
    canQuery: false,
    canProfile: false,
    supportsTransactions: false,
    supportsTimeout: false,
    supportsRowLimit: false,
  };

  constructor(readonly identity: DataSourceIdentity) {}

  async connect(): Promise<void> {
    throw new DataAdapterError("BI adapter interface is defined but not implemented yet.", "unsupported");
  }

  async close(): Promise<void> {}

  async health(): Promise<DataSourceHealth> {
    return { ok: false, message: "BI adapter not implemented." };
  }

  async catalog(): Promise<DataCatalogEntry[]> {
    throw new DataAdapterError("BI adapter catalog is not implemented.", "unsupported");
  }

  async schema(_entryName: string): Promise<DataSchema> {
    throw new DataAdapterError("BI adapter schema is not implemented.", "unsupported");
  }

  async profile(_entryName: string, _sampleRows: number): Promise<ProfileResult> {
    throw new DataAdapterError("BI adapter profile is not implemented.", "unsupported");
  }

  async query(_request: QueryRequest): Promise<QueryResult> {
    throw new DataAdapterError("BI adapter query is not implemented.", "unsupported");
  }
}
