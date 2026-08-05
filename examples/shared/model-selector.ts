import { ModelRuntime } from "@earendil-works/pi-coding-agent";

export async function pickModelFromEnvOrAvailable(modelRuntime: ModelRuntime) {
  const configuredModel = process.env.PI_MODEL?.trim();
  if (configuredModel) {
    const [provider, id] = configuredModel.split("/");
    if (provider && id) {
      const fromRuntime = modelRuntime.getModel(provider, id);
      if (fromRuntime) {
        return fromRuntime;
      }
      throw new Error(`PI_MODEL points to an unknown model: ${configuredModel}`);
    }
    throw new Error("PI_MODEL must be in the format provider/model-id");
  }

  const available = await modelRuntime.getAvailable();
  if (available.length === 0) {
    throw new Error("No available models found. Configure API keys or set PI_MODEL.");
  }
  return available[0];
}
