export class DataAdapterError extends Error {
  constructor(
    message: string,
    readonly code:
      | "not_connected"
      | "invalid_config"
      | "unsupported"
      | "query_failed"
      | "timeout"
      | "permission_denied",
  ) {
    super(message);
    this.name = "DataAdapterError";
  }
}
