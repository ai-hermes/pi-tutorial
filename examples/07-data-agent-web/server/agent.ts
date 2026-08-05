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
import type { LocalDataSource, LocalQueryResult } from "@warjiang/data-agent-core";
import type { AttributionArtifact, AttributionIntent, ChartArtifact, ChartIntent, QueryArtifact } from "../shared/types";

const SYSTEM_PROMPT = `You are DataAgent, an evidence-driven data analyst.

Rules:
- Inspect the catalog and profile relevant relations before drawing conclusions.
- Use data_query for every quantitative claim. Never invent values, columns, or query results.
- Prefer a small number of clear, efficient SQLite queries.
- State the conclusion first, then evidence and caveats, in the user's language.
- Mention truncation, missing values, small samples, ambiguous semantics, and other limitations.
- Never claim that correlation proves causation.
- Use data_visualize only after data_query. Bind every chart to the returned resultId and fields.
- Query aggregation must happen in SQL. Never request chart expressions, URLs, or transforms.
- For contribution attribution, query one unique row per dimension with finite baseline and current numeric fields, then call data_attribute.
- Attribution is descriptive, never causal. Cite every quantitative claim with [[evidence:<artifactId>]].
- You have read-only data tools. Do not ask to modify the source.`;

const encodingSchema = Type.Object({
  field: Type.String(),
  type: Type.Union([
    Type.Literal("quantitative"),
    Type.Literal("temporal"),
    Type.Literal("nominal"),
    Type.Literal("ordinal"),
  ]),
  title: Type.Optional(Type.String()),
  sort: Type.Optional(Type.Union([Type.Literal("ascending"), Type.Literal("descending")])),
}, { additionalProperties: false });

export interface WebAgentOptions {
  source: LocalDataSource;
  sourcePath: string;
  sourceName: string;
  maxRows?: number;
  onQuery(toolCallId: string, sql: string, result: LocalQueryResult): QueryArtifact;
  onChart(toolCallId: string, intent: ChartIntent): ChartArtifact;
  onAttribution(toolCallId: string, intent: AttributionIntent): AttributionArtifact;
}

export interface WebAgentHandle {
  session: AgentSession;
  model: string;
  dispose(): void;
}

function json(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export async function createWebAgent(options: WebAgentOptions): Promise<WebAgentHandle> {
  const catalog = await options.source.catalog();
  const safeCatalog = { ...catalog, source: options.sourceName };
  const maxRows = options.maxRows ?? 200;

  const catalogTool = defineTool({
    name: "data_catalog",
    label: "Data catalog",
    description: "List available relations and their columns. Call this before writing SQL.",
    parameters: Type.Object({}, { additionalProperties: false }),
    execute: async () => {
      const result = await options.source.catalog();
      const safeResult = { ...result, source: options.sourceName };
      return { content: [{ type: "text" as const, text: json(safeResult) }], details: safeResult };
    },
  });

  const profileTool = defineTool({
    name: "data_profile",
    label: "Profile relation",
    description: "Profile one relation: row count, nulls, cardinality, ranges, and frequent values.",
    parameters: Type.Object({ relation: Type.String() }, { additionalProperties: false }),
    execute: async (_id, params) => {
      const result = await options.source.profile(params.relation);
      return { content: [{ type: "text" as const, text: json(result) }], details: result };
    },
  });

  const queryTool = defineTool({
    name: "data_query",
    label: "Run read-only query",
    description: `Run one read-only SQLite SELECT, WITH, or EXPLAIN statement. At most ${maxRows} rows are returned.`,
    parameters: Type.Object({ sql: Type.String() }, { additionalProperties: false }),
    execute: async (id, params) => {
      const result = await options.source.query(params.sql, { maxRows });
      const artifact = options.onQuery(id, params.sql, result);
      return { content: [{ type: "text" as const, text: json(artifact) }], details: artifact };
    },
  });

  const visualizeTool = defineTool({
    name: "data_visualize",
    label: "Create evidence chart",
    description: "Create a restricted Vega-Lite chart from a prior data_query result. Use only returned result fields.",
    parameters: Type.Object({
      resultId: Type.String(),
      title: Type.String(),
      mark: Type.Union([Type.Literal("bar"), Type.Literal("line"), Type.Literal("area"), Type.Literal("point")]),
      x: encodingSchema,
      y: encodingSchema,
      color: Type.Optional(encodingSchema),
    }, { additionalProperties: false }),
    execute: async (id, params) => {
      const artifact = options.onChart(id, params as ChartIntent);
      return { content: [{ type: "text" as const, text: json(artifact) }], details: artifact };
    },
  });

  const attributionTool = defineTool({
    name: "data_attribute",
    label: "Attribute metric change",
    description: "Compute descriptive period-over-period contribution from a prior untruncated query result. The query must have one unique row per dimension.",
    parameters: Type.Object({
      resultId: Type.String(),
      title: Type.String(),
      dimensionField: Type.String(),
      baselineField: Type.String(),
      currentField: Type.String(),
      metric: Type.Optional(Type.String()),
    }, { additionalProperties: false }),
    execute: async (id, params) => {
      const artifact = options.onAttribution(id, params as AttributionIntent);
      return { content: [{ type: "text" as const, text: json(artifact) }], details: artifact };
    },
  });

  const modelRuntime = await ModelRuntime.create();
  const modelSelector = process.env.DATA_AGENT_MODEL?.trim();
  let model;
  if (modelSelector) {
    const separator = modelSelector.indexOf("/");
    if (separator < 1) throw new Error("DATA_AGENT_MODEL must use provider/model-id format.");
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
    systemPromptOverride: () => `${SYSTEM_PROMPT}\n\nInitial catalog:\n${json(safeCatalog)}`,
  });
  await loader.reload();

  const { session } = await createAgentSession({
    cwd: dirname(options.sourcePath),
    ...(model ? { model } : {}),
    modelRuntime,
    resourceLoader: loader,
    settingsManager,
    sessionManager: SessionManager.inMemory(dirname(options.sourcePath)),
    tools: ["data_catalog", "data_profile", "data_query", "data_visualize", "data_attribute"],
    customTools: [catalogTool, profileTool, queryTool, visualizeTool, attributionTool],
  });
  const activeModel = session.agent.state.model;

  return {
    session,
    model: `${activeModel.provider}/${activeModel.id}`,
    dispose() {
      session.dispose();
      options.source.close();
    },
  };
}
