import type { ChatMessage, ToolRun } from "@shared/types";

interface EntryLike {
  id: string;
  type: string;
  timestamp: string;
  message?: MessageLike;
}

interface MessageLike {
  role: string;
  content: string | ContentLike[];
  timestamp: number;
  toolCallId?: string;
  toolName?: string;
  details?: unknown;
  isError?: boolean;
  errorMessage?: string;
}

interface ContentLike {
  type: string;
  text?: string;
  data?: string;
  mimeType?: string;
  id?: string;
  name?: string;
  arguments?: Record<string, unknown>;
}

export function projectTranscript(entries: readonly unknown[]): { messages: ChatMessage[]; tools: ToolRun[] } {
  const messages: ChatMessage[] = [];
  const tools = new Map<string, ToolRun>();
  let previousTimestamp = 0;

  for (const raw of entries) {
    const entry = raw as EntryLike;
    if (entry.type !== "message" || !entry.message) continue;
    const message = entry.message;
    const candidateTimestamp = message.timestamp || Date.parse(entry.timestamp);
    const timestamp = Math.max(Number.isFinite(candidateTimestamp) ? candidateTimestamp : Date.now(), previousTimestamp + 1);
    previousTimestamp = timestamp;
    const content = typeof message.content === "string" ? [{ type: "text", text: message.content }] : message.content;

    if (message.role === "user" || message.role === "assistant") {
      const text = content.filter((part) => part.type === "text").map((part) => part.text ?? "").join("");
      const images = content
        .filter((part) => part.type === "image" && part.data && part.mimeType)
        .map((part) => ({ type: "image" as const, data: part.data!, mimeType: part.mimeType! }));
      if (message.role === "user" || text || message.errorMessage) {
        messages.push({
          id: entry.id,
          role: message.role,
          text,
          images,
          timestamp,
          ...(message.errorMessage ? { error: message.errorMessage } : {}),
        });
      }
      if (message.role === "assistant") {
        for (const part of content.filter((item) => item.type === "toolCall")) {
          if (!part.id || !part.name) continue;
          tools.set(part.id, {
            id: part.id,
            name: part.name,
            args: part.arguments ?? {},
            status: "running",
            startedAt: timestamp,
          });
        }
      }
      continue;
    }

    if (message.role === "toolResult" && message.toolCallId) {
      const current = tools.get(message.toolCallId);
      const result = content.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n");
      tools.set(message.toolCallId, {
        id: message.toolCallId,
        name: message.toolName ?? current?.name ?? "tool",
        args: current?.args ?? {},
        status: message.isError ? "error" : "success",
        result,
        details: message.details,
        startedAt: current?.startedAt ?? timestamp,
        endedAt: timestamp,
      });
    }
  }

  return { messages, tools: [...tools.values()].sort((a, b) => a.startedAt - b.startedAt) };
}

export function projectEntry(raw: unknown): ChatMessage | undefined {
  return projectTranscript([raw]).messages[0];
}
