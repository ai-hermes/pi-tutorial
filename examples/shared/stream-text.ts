import type { AgentSession } from "@earendil-works/pi-coding-agent";

export function attachTextStream(session: AgentSession): () => void {
  return session.subscribe((event) => {
    if (event.type !== "message_update") {
      return;
    }

    const assistantEvent = event.assistantMessageEvent;
    if (assistantEvent.type === "text_delta") {
      process.stdout.write(assistantEvent.delta);
    }
  });
}
