import type { ApiError, StreamEvent, WorkspaceSnapshot } from "../shared/types";

async function responseError(response: Response): Promise<Error> {
  const body = await response.json().catch(() => undefined) as ApiError | undefined;
  return new Error(body?.error ?? `Request failed with status ${response.status}.`);
}

export async function getWorkspace(): Promise<WorkspaceSnapshot> {
  const response = await fetch("/api/workspace");
  if (!response.ok) throw await responseError(response);
  return response.json() as Promise<WorkspaceSnapshot>;
}

export async function uploadWorkspace(file: File): Promise<WorkspaceSnapshot> {
  const form = new FormData();
  form.set("file", file);
  const response = await fetch("/api/workspace", { method: "POST", body: form });
  if (!response.ok) throw await responseError(response);
  return response.json() as Promise<WorkspaceSnapshot>;
}

export async function deleteWorkspace(): Promise<void> {
  const response = await fetch("/api/workspace", { method: "DELETE" });
  if (!response.ok) throw await responseError(response);
}

export async function sendMessage(text: string): Promise<void> {
  const response = await fetch("/api/workspace/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw await responseError(response);
}

export async function abortRun(): Promise<void> {
  const response = await fetch("/api/workspace/abort", { method: "POST" });
  if (!response.ok) throw await responseError(response);
}

export function connectEvents(after: number, onEvent: (event: StreamEvent) => void, onConnection: (connected: boolean) => void): EventSource {
  const source = new EventSource(`/api/workspace/events?after=${after}`);
  source.onopen = () => onConnection(true);
  source.onerror = () => onConnection(false);
  source.onmessage = (message) => {
    try {
      onEvent(JSON.parse(message.data) as StreamEvent);
    } catch {
      onConnection(false);
    }
  };
  return source;
}
