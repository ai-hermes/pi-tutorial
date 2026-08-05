import type { StreamEvent, ToolTrace, WorkspaceSnapshot } from "../shared/types";

export type WorkspaceAction =
  | { type: "snapshot"; snapshot: WorkspaceSnapshot }
  | { type: "event"; event: StreamEvent }
  | { type: "reset" };

export const EMPTY_SNAPSHOT: WorkspaceSnapshot = {
  workspace: null,
  status: "empty",
  catalog: null,
  messages: [],
  tools: [],
  queries: [],
  charts: [],
  attributions: [],
  lastEventId: 0,
};

function upsertTool(tools: ToolTrace[], trace: ToolTrace): ToolTrace[] {
  const index = tools.findIndex((item) => item.id === trace.id);
  if (index < 0) return [...tools, trace];
  return tools.map((item, itemIndex) => itemIndex === index ? trace : item);
}

export function workspaceReducer(state: WorkspaceSnapshot, action: WorkspaceAction): WorkspaceSnapshot {
  if (action.type === "reset") return EMPTY_SNAPSHOT;
  if (action.type === "snapshot") return action.snapshot;

  const { event } = action;
  const payload = event.payload as Record<string, any>;
  const next = { ...state, lastEventId: Math.max(state.lastEventId, event.id) };

  switch (event.type) {
    case "workspace.ready":
      return { ...(payload.snapshot as WorkspaceSnapshot), lastEventId: event.id };
    case "workspace.deleted":
      return EMPTY_SNAPSHOT;
    case "message.added":
      return state.messages.some((message) => message.id === payload.message.id)
        ? next
        : { ...next, messages: [...state.messages, payload.message] };
    case "message.delta":
      return {
        ...next,
        messages: state.messages.map((message) => message.id === payload.messageId
          ? { ...message, content: message.content + payload.delta, streaming: true }
          : message),
      };
    case "message.completed":
      return {
        ...next,
        messages: state.messages.map((message) => message.id === payload.message.id
          ? payload.message
          : message),
      };
    case "tool.started":
    case "tool.completed":
      return { ...next, tools: upsertTool(state.tools, payload.trace) };
    case "query.created":
      return state.queries.some((query) => query.id === payload.artifact.id)
        ? next
        : { ...next, queries: [...state.queries, payload.artifact] };
    case "chart.created":
      return state.charts.some((chart) => chart.id === payload.artifact.id)
        ? next
        : { ...next, charts: [...state.charts, payload.artifact] };
    case "attribution.created":
      return state.attributions.some((item) => item.id === payload.artifact.id)
        ? next
        : { ...next, attributions: [...state.attributions, payload.artifact] };
    case "run.started":
      return { ...next, status: "running", error: undefined };
    case "run.stopping":
      return { ...next, status: "stopping" };
    case "run.completed":
    case "run.aborted":
      return { ...next, status: "ready", error: undefined };
    case "run.error":
      return { ...next, status: "error", error: String(payload.error ?? "Unknown error") };
    default:
      return next;
  }
}
