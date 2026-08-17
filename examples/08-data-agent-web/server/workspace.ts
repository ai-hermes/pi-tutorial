import { randomUUID } from "node:crypto";
import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import { openDataSource, type LocalQueryResult } from "@warjiang/data-agent-core";
import type {
  ChartArtifact,
  ChartIntent,
  AttributionArtifact,
  AttributionIntent,
  QueryArtifact,
  StreamEvent,
  StreamEventType,
  ToolTrace,
  TranscriptMessage,
  WorkspaceSnapshot,
  WorkspaceStatus,
} from "../shared/types";
import { createWebAgent, type WebAgentHandle } from "./agent";
import { createChartArtifact } from "./chart";
import { createAttributionArtifact } from "./attribution";
import { parseEvidenceReferences } from "./evidence";
import { removeUpload, type PersistedUpload } from "./uploads";

type EventListener = (event: StreamEvent) => void;

export class EventBuffer {
  private sequence = 0;
  private readonly events: StreamEvent[] = [];
  private readonly listeners = new Set<EventListener>();

  publish(type: StreamEventType, payload: unknown): StreamEvent {
    const event: StreamEvent = { id: ++this.sequence, type, timestamp: new Date().toISOString(), payload };
    this.events.push(event);
    if (this.events.length > 1_000) this.events.shift();
    for (const listener of this.listeners) listener(event);
    return event;
  }

  get lastId(): number {
    return this.sequence;
  }

  replay(after: number): { stale: boolean; events: StreamEvent[] } {
    const oldest = this.events[0]?.id ?? this.sequence + 1;
    return {
      stale: after > 0 && after < oldest - 1,
      events: this.events.filter((event) => event.id > after),
    };
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export class WorkspaceConflictError extends Error {
  readonly status = 409 as const;
}

export class WorkspaceNotFoundError extends Error {
  readonly status = 404 as const;
}

class ActiveWorkspace {
  readonly id = randomUUID();
  readonly createdAt = new Date().toISOString();
  readonly messages: TranscriptMessage[] = [];
  readonly tools: ToolTrace[] = [];
  readonly queries: QueryArtifact[] = [];
  readonly charts: ChartArtifact[] = [];
  readonly attributions: AttributionArtifact[] = [];
  readonly events = new EventBuffer();
  status: WorkspaceStatus = "ready";
  error: string | undefined;

  private agent!: WebAgentHandle;
  private unsubscribe: (() => void) | undefined;
  private currentAssistantId: string | undefined;
  private abortRequested = false;

  private constructor(
    readonly upload: PersistedUpload,
    readonly catalog: WorkspaceSnapshot["catalog"],
  ) {}

  static async create(upload: PersistedUpload): Promise<ActiveWorkspace> {
    const source = await openDataSource(upload.path);
    const catalog = await source.catalog();
    const workspace = new ActiveWorkspace(upload, { ...catalog, source: upload.originalName });
    try {
      workspace.agent = await createWebAgent({
        source,
        sourcePath: upload.path,
        sourceName: upload.originalName,
        onQuery: (toolCallId, sql, result) => workspace.recordQuery(toolCallId, sql, result),
        onChart: (toolCallId, intent) => workspace.recordChart(toolCallId, intent),
        onAttribution: (toolCallId, intent) => workspace.recordAttribution(toolCallId, intent),
      });
      workspace.unsubscribe = workspace.agent.session.subscribe((event) => workspace.onAgentEvent(event));
      return workspace;
    } catch (error) {
      source.close();
      throw error;
    }
  }

  get busy(): boolean {
    return this.status === "running" || this.status === "stopping";
  }

  snapshot(): WorkspaceSnapshot {
    return {
      workspace: {
        id: this.id,
        sourceName: this.upload.originalName,
        sourceSize: this.upload.size,
        model: this.agent.model,
        createdAt: this.createdAt,
      },
      status: this.status,
      catalog: this.catalog,
      messages: [...this.messages],
      tools: [...this.tools],
      queries: [...this.queries],
      charts: [...this.charts],
      attributions: [...this.attributions],
      lastEventId: this.events.lastId,
      ...(this.error ? { error: this.error } : {}),
    };
  }

  ready(): void {
    const snapshot = this.snapshot();
    snapshot.lastEventId = this.events.lastId + 1;
    this.events.publish("workspace.ready", { snapshot });
  }

  prompt(text: string): void {
    if (this.busy) throw new WorkspaceConflictError("DataAgent is already processing a question.");
    const message: TranscriptMessage = {
      id: `msg_${randomUUID()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    this.messages.push(message);
    this.status = "running";
    this.error = undefined;
    this.abortRequested = false;
    this.events.publish("message.added", { message });
    this.events.publish("run.started", {});

    void this.agent.session.prompt(text).catch((error: unknown) => {
      this.fail(error);
    });
  }

  async abort(): Promise<void> {
    if (!this.busy) return;
    this.abortRequested = true;
    this.status = "stopping";
    this.events.publish("run.stopping", {});
    await this.agent.session.abort();
    if (this.status === "stopping") this.finishRun(true);
  }

  eventStream(after: number): Response {
    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        const send = (event: StreamEvent) => {
          controller.enqueue(encoder.encode(`id: ${event.id}\ndata: ${JSON.stringify(event)}\n\n`));
        };
        controller.enqueue(encoder.encode("retry: 2000\n\n"));
        const replay = this.events.replay(after);
        if (replay.stale) send({
          id: this.events.lastId,
          type: "snapshot.required",
          timestamp: new Date().toISOString(),
          payload: {},
        });
        else for (const event of replay.events) send(event);
        unsubscribe = this.events.subscribe(send);
        heartbeat = setInterval(() => controller.enqueue(encoder.encode(": keepalive\n\n")), 15_000);
      },
      cancel: () => {
        unsubscribe?.();
        if (heartbeat) clearInterval(heartbeat);
      },
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  async dispose(): Promise<void> {
    if (this.busy) await this.abort().catch(() => undefined);
    this.unsubscribe?.();
    this.agent.dispose();
    await removeUpload(this.upload);
  }

  private recordQuery(toolCallId: string, sql: string, result: LocalQueryResult): QueryArtifact {
    const artifact: QueryArtifact = {
      id: `query_${randomUUID()}`,
      sql,
      sourceName: this.upload.originalName,
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      truncated: result.truncated,
      elapsedMs: result.elapsedMs,
      createdAt: new Date().toISOString(),
    };
    this.queries.push(artifact);
    const trace = this.tools.find((item) => item.id === toolCallId);
    if (trace) trace.resultId = artifact.id;
    this.events.publish("query.created", { artifact });
    return artifact;
  }

  private recordChart(toolCallId: string, intent: ChartIntent): ChartArtifact {
    const query = this.queries.find((item) => item.id === intent.resultId);
    if (!query) throw new Error(`Unknown query result: ${intent.resultId}`);
    const artifact = createChartArtifact(intent, query);
    this.charts.push(artifact);
    const trace = this.tools.find((item) => item.id === toolCallId);
    if (trace) trace.chartId = artifact.id;
    this.events.publish("chart.created", { artifact });
    return artifact;
  }

  private recordAttribution(toolCallId: string, intent: AttributionIntent): AttributionArtifact {
    const query = this.queries.find((item) => item.id === intent.resultId);
    if (!query) throw new Error(`Unknown query result: ${intent.resultId}`);
    const artifact = createAttributionArtifact(intent, query);
    this.attributions.push(artifact);
    const trace = this.tools.find((item) => item.id === toolCallId);
    if (trace) trace.attributionId = artifact.id;
    this.events.publish("attribution.created", { artifact });
    return artifact;
  }

  private onAgentEvent(event: AgentSessionEvent): void {
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      if (!this.currentAssistantId) {
        const message: TranscriptMessage = {
          id: `msg_${randomUUID()}`,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
          streaming: true,
        };
        this.currentAssistantId = message.id;
        this.messages.push(message);
        this.events.publish("message.added", { message });
      }
      const message = this.messages.find((item) => item.id === this.currentAssistantId);
      if (message) message.content += event.assistantMessageEvent.delta;
      this.events.publish("message.delta", { messageId: this.currentAssistantId, delta: event.assistantMessageEvent.delta });
      return;
    }

    if (event.type === "message_end" && this.currentAssistantId) {
      this.completeAssistantMessage();
      return;
    }

    if (event.type === "tool_execution_start") {
      const trace: ToolTrace = {
        id: event.toolCallId,
        name: event.toolName,
        args: (event.args ?? {}) as Record<string, unknown>,
        status: "running",
        startedAt: new Date().toISOString(),
      };
      this.tools.push(trace);
      this.events.publish("tool.started", { trace });
      return;
    }

    if (event.type === "tool_execution_end") {
      const trace = this.tools.find((item) => item.id === event.toolCallId);
      if (trace) {
        trace.status = event.isError ? "error" : "success";
        trace.endedAt = new Date().toISOString();
        this.events.publish("tool.completed", { trace: { ...trace } });
      }
      return;
    }

    if (event.type === "auto_retry_start") {
      this.events.publish("run.retrying", { attempt: event.attempt, maxAttempts: event.maxAttempts, error: event.errorMessage });
      return;
    }

    if (event.type === "compaction_start") {
      this.events.publish("run.compacting", { reason: event.reason });
      return;
    }

    if (event.type === "agent_settled") this.finishRun(this.abortRequested);
  }

  private finishRun(aborted: boolean): void {
    if (!this.busy) return;
    if (this.currentAssistantId) {
      this.completeAssistantMessage();
    }
    this.status = "ready";
    this.abortRequested = false;
    this.events.publish(aborted ? "run.aborted" : "run.completed", {});
  }

  private completeAssistantMessage(): void {
    if (!this.currentAssistantId) return;
    const message = this.messages.find((item) => item.id === this.currentAssistantId);
    if (message) {
      message.streaming = false;
      message.evidenceRefs = parseEvidenceReferences(message.content, {
        queries: this.queries,
        charts: this.charts,
        attributions: this.attributions,
      });
      this.events.publish("message.completed", { message: { ...message } });
    }
    this.currentAssistantId = undefined;
  }

  private fail(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.status = "error";
    this.error = message;
    this.abortRequested = false;
    this.events.publish("run.error", { error: message });
  }
}

export class WorkspaceManager {
  private current: ActiveWorkspace | undefined;

  snapshot(): WorkspaceSnapshot {
    return this.current?.snapshot() ?? {
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
  }

  get busy(): boolean {
    return this.current?.busy ?? false;
  }

  async replace(upload: PersistedUpload): Promise<WorkspaceSnapshot> {
    if (this.busy) throw new WorkspaceConflictError("Stop the current run before replacing the data source.");
    let next: ActiveWorkspace;
    try {
      next = await ActiveWorkspace.create(upload);
    } catch (error) {
      await removeUpload(upload);
      throw error;
    }
    const previous = this.current;
    this.current = next;
    next.ready();
    if (previous) await previous.dispose();
    return next.snapshot();
  }

  prompt(text: string): void {
    if (!this.current) throw new WorkspaceNotFoundError("Upload a data source first.");
    this.current.prompt(text);
  }

  async abort(): Promise<void> {
    if (!this.current) throw new WorkspaceNotFoundError("No active workspace.");
    await this.current.abort();
  }

  stream(after: number): Response {
    if (!this.current) throw new WorkspaceNotFoundError("No active workspace.");
    return this.current.eventStream(after);
  }

  async delete(): Promise<void> {
    const workspace = this.current;
    this.current = undefined;
    if (!workspace) return;
    workspace.events.publish("workspace.deleted", {});
    await workspace.dispose();
  }
}
