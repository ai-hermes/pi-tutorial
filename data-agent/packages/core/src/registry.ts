import type { DataSourceAdapter, DataSourceIdentity } from "./types.js";

export class DataSourceRegistry {
  private readonly adapters = new Map<string, DataSourceAdapter>();

  register(adapter: DataSourceAdapter): void {
    if (this.adapters.has(adapter.identity.id)) {
      throw new Error(`Data source id already exists: ${adapter.identity.id}`);
    }
    this.adapters.set(adapter.identity.id, adapter);
  }

  list(): DataSourceIdentity[] {
    return Array.from(this.adapters.values()).map((adapter) => adapter.identity);
  }

  get(id: string): DataSourceAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw new Error(`Unknown data source: ${id}`);
    }
    return adapter;
  }
}
