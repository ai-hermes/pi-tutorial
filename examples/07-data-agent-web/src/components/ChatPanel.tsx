import { useEffect, useRef, useState } from "react";
import { ArrowUp, CircleStop, DatabaseZap, LoaderCircle, TriangleAlert } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ToolTrace, TranscriptMessage, WorkspaceStatus } from "../../shared/types";
import { ToolTraceList } from "./ToolTraceList";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const SUGGESTIONS = ["这个数据集包含什么？先概览结构和质量。", "找出最重要的趋势，并说明查询依据。", "比较两个时期的指标变化，并按维度做贡献归因。"];
const evidenceMarkdown = (content: string) => content.replace(/\[\[evidence:([A-Za-z0-9_-]+)\]\]/g, "[$1](#evidence-$1)");

export function ChatPanel({ messages, tools, status, error, onSend, onAbort, onSelectEvidence }: {
  messages: TranscriptMessage[]; tools: ToolTrace[]; status: WorkspaceStatus; error?: string;
  onSend: (text: string) => Promise<void>; onAbort: () => Promise<void>; onSelectEvidence: (id: string) => void;
}) {
  const [text, setText] = useState("");
  const [submitError, setSubmitError] = useState<string>();
  const end = useRef<HTMLDivElement>(null);
  const busy = status === "running" || status === "stopping";
  const latestContent = messages.at(-1)?.content;

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [messages.length, latestContent, tools.length]);
  const submit = async (value = text) => {
    const question = value.trim(); if (!question || busy) return;
    setSubmitError(undefined);
    try { await onSend(question); setText(""); } catch (reason) { setSubmitError(reason instanceof Error ? reason.message : String(reason)); }
  };

  return <section className="flex min-h-0 flex-1 flex-col bg-background" aria-label="DataAgent 对话">
    <ScrollArea className="min-h-0 flex-1"><div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 md:px-6">
      {!messages.length ? <div className="flex min-h-[45vh] flex-col justify-center gap-5">
        <div className="space-y-2"><div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><DatabaseZap className="size-4" /></div><h2 className="text-xl font-semibold tracking-tight">从一个可验证的问题开始</h2><p className="max-w-xl text-sm leading-6 text-muted-foreground">DataAgent 会展示读取的结构、执行的 SQL、可视化和用于结论的贡献证据。</p></div>
        <div className="grid gap-2 sm:grid-cols-3">{SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" onClick={() => void submit(suggestion)} className="rounded-lg border bg-card p-3 text-left text-xs leading-5 transition-colors hover:border-primary/40 hover:bg-accent">{suggestion}</button>)}</div>
      </div> : messages.map((message) => <article key={message.id} className={`space-y-2 ${message.role === "user" ? "ml-auto max-w-[85%]" : "max-w-full"}`}>
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground"><span>{message.role === "user" ? "你" : "DataAgent"}</span>{message.streaming && <Badge variant="secondary"><LoaderCircle className="animate-spin" />分析中</Badge>}</div>
        {message.role === "user" ? <p className="rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">{message.content}</p> : <div className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ href, children }) => {
            const id = href?.startsWith("#evidence-") ? href.slice(10) : undefined;
            if (!id) return <a href={href} className="text-primary underline underline-offset-4">{children}</a>;
            const ref = message.evidenceRefs?.find((item) => item.artifactId === id);
            return <button type="button" disabled={!ref?.valid} onClick={() => ref?.valid && onSelectEvidence(id)} className="mx-0.5 inline-flex items-center rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary disabled:border-destructive/30 disabled:bg-destructive/10 disabled:text-destructive">{ref?.valid ? `证据 ${id.split("_")[0]}` : "无效证据"}</button>;
          } }}>{evidenceMarkdown(message.content)}</ReactMarkdown>
        </div>}
      </article>)}
      <ToolTraceList tools={tools} onSelectEvidence={onSelectEvidence} />
      {busy && messages.at(-1)?.role !== "assistant" && <div className="space-y-2" aria-label="DataAgent 正在分析"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-3/4" /></div>}
      {(error || submitError) && <Alert variant="destructive" role="alert"><TriangleAlert /><AlertTitle>请求失败</AlertTitle><AlertDescription>{submitError ?? error}</AlertDescription></Alert>}
      <div ref={end} />
    </div></ScrollArea>
    <div className="shrink-0 border-t bg-background/95 p-3 backdrop-blur md:p-4"><form className="mx-auto max-w-3xl" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <Field><FieldLabel htmlFor="question" className="sr-only">向数据提问</FieldLabel><div className="relative rounded-xl border bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring/40">
        <Textarea id="question" value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="例如：按地区比较销售额，并做贡献归因" disabled={busy} className="min-h-20 resize-none border-0 bg-transparent pr-14 shadow-none focus-visible:ring-0" />
        {busy ? <Button type="button" size="icon-sm" variant="destructive" className="absolute right-2 bottom-2" onClick={() => void onAbort()} disabled={status === "stopping"} aria-label="停止生成"><CircleStop /></Button> : <Button type="submit" size="icon-sm" className="absolute right-2 bottom-2" disabled={!text.trim()} aria-label="发送"><ArrowUp /></Button>}
      </div><FieldDescription>Enter 发送，Shift + Enter 换行。查询最多返回 200 行。</FieldDescription></Field>
    </form></div>
  </section>;
}
