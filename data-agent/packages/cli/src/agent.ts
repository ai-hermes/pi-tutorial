import { dirname } from "node:path";
import { Type } from "typebox";
import {
  createAgentSession,
  DefaultResourceLoader,
  defineTool,
  getAgentDir,
  ModelRuntime,
  SessionManager,
  SettingsManager,
  type AgentSession,
} from "@earendil-works/pi-coding-agent";
import type { LocalDataSource } from "@warjiang/data-agent-core";

const SYSTEM_PROMPT = `You are DataAgent, an evidence-driven data analyst.

Rules:
- Inspect the catalog and profile relevant relations before drawing conclusions.
- Use data_query for every quantitative claim. Never invent values, columns, or query results.
- Prefer a small number of clear, efficient SQLite queries.
- State the SQL or describe it precisely so the analysis is reproducible.
- Mention truncation, missing values, small samples, ambiguous semantics, and other limitations.
- Never claim that correlation proves causation.
- Answer in the user's language. Present the conclusion first, then evidence and caveats.
- You have read-only data tools. Do not ask to modify the source.`;

export interface CreateDataAgentOptions {
  source: LocalDataSource;
  sourcePath: string;
  maxRows?: number;
  model?: string;
}

export interface DataAgentHandle {
  session: AgentSession;
  dispose(): void;
}

function json(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export async function createDataAgent(options: CreateDataAgentOptions): Promise<DataAgentHandle> {
  const catalog = await options.source.catalog();
  const maxRows = options.maxRows ?? 200;
  const catalogTool = defineTool({
    name: "data_catalog",
    label: "Data catalog",
    description: "List available relations and their columns. Call this before writing SQL.",
    parameters: Type.Object({}),
    execute: async () => {
      const result = await options.source.catalog();
      return { content: [{ type: "text" as const, text: json(result) }], details: result };
    },
  });
  const profileTool = defineTool({
    name: "data_profile",
    label: "Profile relation",
    description: "Profile one relation: row count, nulls, cardinality, ranges, and frequent values.",
    parameters: Type.Object({
      relation: Type.String({ description: "Exact relation name from data_catalog." }),
    }),
    execute: async (_id, params) => {
      const result = await options.source.profile(params.relation);
      return { content: [{ type: "text" as const, text: json(result) }], details: result };
    },
  });
  const queryTool = defineTool({
    name: "data_query",
    label: "Run read-only query",
    description: `Run one read-only SQLite SELECT/WITH query. At most ${maxRows} rows are returned.`,
    parameters: Type.Object({
      sql: Type.String({ description: "A single read-only SQLite SELECT, WITH, or EXPLAIN statement." }),
    }),
    execute: async (_id, params) => {
      const result = await options.source.query(params.sql, { maxRows });
      return { content: [{ type: "text" as const, text: json(result) }], details: result };
    },
  });

  const modelRuntime = await ModelRuntime.create();
  const modelSelector = options.model?.trim() || process.env.DATA_AGENT_MODEL?.trim();
  let model;
  if (modelSelector) {
    const separator = modelSelector.indexOf("/");
    if (separator < 1) throw new Error("Model must use provider/model-id format.");
    model = modelRuntime.getModel(modelSelector.slice(0, separator), modelSelector.slice(separator + 1));
    if (!model) throw new Error(`Unknown model: ${modelSelector}`);
  }

  const settingsManager = SettingsManager.inMemory({
    compaction: { enabled: true },
    retry: { enabled: true, maxRetries: 2 },
  });
  const loader = new DefaultResourceLoader({
    cwd: dirname(options.sourcePath),
    agentDir: getAgentDir(),
    settingsManager,
    systemPromptOverride: () => `${SYSTEM_PROMPT}\n\nInitial catalog:\n${json(catalog)}`,
  });
  await loader.reload();

  const { session } = await createAgentSession({
    cwd: dirname(options.sourcePath),
    ...(model ? { model } : {}),
    modelRuntime,
    resourceLoader: loader,
    settingsManager,
    sessionManager: SessionManager.inMemory(dirname(options.sourcePath)),
    tools: ["data_catalog", "data_profile", "data_query"],
    customTools: [catalogTool, profileTool, queryTool],
  });

  return {
    session,
    dispose() {
      session.dispose();
      options.source.close();
    },
  };
}
