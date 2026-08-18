import { Children, isValidElement, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDownIcon, CheckIcon, CopyIcon, FilesIcon, GitBranchIcon, HistoryIcon, PencilIcon, TerminalSquareIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ChatMessage, ToolRun } from "../../shared/types";
import { PiLogo } from "./PiLogo";
import { RunGroup } from "./RunGroup";

interface Props {
  conversationId?: string;
  messages: ChatMessage[];
  tools: ToolRun[];
  onBranch(entryId: string, text: string): Promise<void>;
}

export function ChatTimeline({ conversationId, messages, tools, onBranch }: Props) {
  const [branchMessage, setBranchMessage] = useState<ChatMessage>();
  const [branchText, setBranchText] = useState("");
  const [branching, setBranching] = useState(false);
  const [showLatest, setShowLatest] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const timeline = useMemo(() => groupTimeline(messages, tools), [messages, tools]);
  const contentVersion = `${timeline.length}:${messages.at(-1)?.text.length ?? 0}:${messages.at(-1)?.streaming ?? false}:${tools.at(-1)?.status ?? ""}:${tools.at(-1)?.result?.length ?? 0}`;

  const viewport = () => rootRef.current?.querySelector<HTMLElement>("[data-slot='scroll-area-viewport']");
  const jumpToLatest = (behavior: ScrollBehavior = "smooth") => {
    const element = viewport();
    if (!element) return;
    if (typeof element.scrollTo === "function") element.scrollTo({ top: element.scrollHeight, behavior });
    else element.scrollTop = element.scrollHeight;
    following.current = true;
    setShowLatest(false);
  };

  useEffect(() => {
    const element = viewport();
    if (!element) return undefined;
    const onScroll = () => {
      const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 96;
      following.current = nearBottom;
      setShowLatest(!nearBottom);
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, [conversationId]);

  useLayoutEffect(() => {
    following.current = true;
    const frame = requestAnimationFrame(() => jumpToLatest("auto"));
    return () => cancelAnimationFrame(frame);
  }, [conversationId]);

  useLayoutEffect(() => {
    if (!following.current) return undefined;
    const frame = requestAnimationFrame(() => jumpToLatest("auto"));
    return () => cancelAnimationFrame(frame);
  }, [contentVersion]);

  const branch = async () => {
    if (!branchMessage || !branchText.trim()) return;
    setBranching(true);
    try { await onBranch(branchMessage.id, branchText); setBranchMessage(undefined); }
    finally { setBranching(false); }
  };

  return <>
    <div className="relative flex min-h-0 flex-1 flex-col">
      <ScrollArea ref={rootRef} className="min-h-0 flex-1">
        <div data-slot="timeline-content" className={cn("mx-auto flex w-full min-w-0 max-w-[min(60rem,100dvw)] flex-col px-3 py-4 sm:px-4 md:px-6 md:py-5", showLatest && "pb-14 md:pb-14")}>
          {timeline.length === 0 ? <Empty className="min-h-[52vh] items-stretch justify-center border-0 p-0 text-left">
            <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_17rem] md:gap-9">
              <EmptyHeader className="max-w-xl items-start gap-2.5 text-left">
                <EmptyMedia className="size-10 rounded-lg bg-primary text-primary-foreground"><PiLogo className="size-6" /></EmptyMedia>
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Pi agent harness</p>
                <EmptyTitle className="text-xl font-semibold tracking-[-0.5px] md:text-2xl">交给 Pi 来完成</EmptyTitle>
                <EmptyDescription className="max-w-lg text-sm leading-6 text-body">描述目标，Pi 会读取工作区、运行命令并修改文件。工具过程与结果会保留在同一条时间线中。</EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="w-full max-w-none gap-0 overflow-hidden rounded-xl border bg-card">
                <CapabilityRow icon={FilesIcon} title="文件系统" description="读取、编辑和写入当前工作区" />
                <CapabilityRow icon={TerminalSquareIcon} title="Shell" description="运行 Bash 并持续回传输出" />
                <CapabilityRow icon={HistoryIcon} title="持久会话" description="恢复、分支与压缩上下文" last />
              </EmptyContent>
            </div>
          </Empty> : <div className="flex min-w-0 flex-col gap-0.5">
            {timeline.map((item, index) => item.kind === "run"
              ? <div key={`run-${item.tools[0]?.id}`} data-slot="run-group-row" className="min-w-0 py-1.5"><RunGroup tools={item.tools} index={timeline.slice(0, index + 1).filter((entry) => entry.kind === "run").length} /></div>
              : <MessageRow key={item.message.id} message={item.message} onBranch={() => { setBranchMessage(item.message); setBranchText(item.message.text); }} />)}
          </div>}
        </div>
      </ScrollArea>
      {showLatest && <div data-slot="jump-latest" className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
        <Button className="pointer-events-auto border bg-background shadow-sm" variant="outline" size="sm" onClick={() => jumpToLatest()}>
          <ArrowDownIcon data-icon="inline-start" />回到最新
        </Button>
      </div>}
    </div>

    <Dialog open={Boolean(branchMessage)} onOpenChange={(open) => { if (!open) setBranchMessage(undefined); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑消息并创建分支</DialogTitle>
          <DialogDescription>新分支保留此消息之前的上下文，并与原对话共享当前 workspace。</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="branch-message">消息</FieldLabel>
            <Textarea id="branch-message" value={branchText} onChange={(event) => setBranchText(event.target.value)} rows={6} />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => setBranchMessage(undefined)}>取消</Button>
          <Button onClick={() => { branch().catch(() => undefined); }} disabled={!branchText.trim() || branching}>
            <GitBranchIcon data-icon="inline-start" />{branching ? "创建中" : "创建分支"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

function MessageRow({ message, onBranch }: { message: ChatMessage; onBranch(): void }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const copy = async () => {
    await navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return <article className={cn("group/message flex py-2", isUser ? "justify-end" : "justify-start")}>
    <div className="min-w-0 max-w-[92%] sm:max-w-[84%] md:max-w-[76%]">
      <div data-slot="message-bubble" className="min-w-0 rounded-lg border bg-card px-3.5 py-2.5 text-sm leading-6 shadow-[0_8px_24px_-22px_rgba(20,31,46,0.48)]">
      {message.images.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{message.images.map((image, index) => <img key={index} alt="用户附件" src={`data:${image.mimeType};base64,${image.data}`} className="max-h-56 rounded-lg border object-contain" />)}</div>}
      {message.text && <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        h1: ({ children }) => <h1 className="mb-1.5 mt-4 text-lg font-semibold tracking-[-0.36px] first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-1 mt-3 text-base font-semibold tracking-[-0.28px] first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-1 mt-2.5 text-sm font-semibold tracking-[-0.28px]">{children}</h3>,
        p: ({ children }) => <p className="mb-2 leading-6 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="mb-2 list-disc pl-5 leading-6">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 list-decimal pl-5 leading-6">{children}</ol>,
        blockquote: ({ children }) => <blockquote className="mb-2 border-l-2 pl-3 text-muted-foreground">{children}</blockquote>,
        table: ({ children }) => <div className="mb-2.5 overflow-auto rounded-lg border bg-card"><table className="w-full text-sm">{children}</table></div>,
        th: ({ children }) => <th className="border-b bg-muted px-2.5 py-1.5 text-left font-medium">{children}</th>,
        td: ({ children }) => <td className="border-b px-2.5 py-1.5 align-top last:border-r-0">{children}</td>,
        code: ({ className, children }) => <code className={cn(className ? "font-mono" : "rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.9em]", className)}>{children}</code>,
        pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-link underline underline-offset-4">{children}</a>,
      }}>{message.text}</ReactMarkdown>}
      {message.pending && !message.text && <p className="text-sm text-muted-foreground">正在发送图片…</p>}
      {message.pending && <span className="mt-1 block font-mono text-[10px] uppercase text-muted-foreground">发送中</span>}
      {message.streaming && <span className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground" aria-label="生成中"><span className="size-1.5 animate-pulse rounded-full bg-link" />正在回复</span>}
      {message.error && <p className="mt-2 text-sm text-destructive">{message.error}</p>}
      </div>
      {!message.streaming && message.text && <div data-slot="message-actions" className={cn("mt-0.5 flex gap-0.5 md:opacity-0 md:transition-opacity md:group-hover/message:opacity-100 md:group-focus-within/message:opacity-100", isUser ? "justify-end" : "justify-start")}>
        <Button variant="ghost" size="icon-xs" aria-label="复制消息" onClick={() => { copy().catch(() => undefined); }}>{copied ? <CheckIcon /> : <CopyIcon />}</Button>
        {isUser && <Button variant="ghost" size="icon-xs" aria-label="编辑并创建分支" onClick={onBranch}><PencilIcon /></Button>}
      </div>}
    </div>
  </article>;
}

function CodeBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const text = nodeText(children).replace(/\n$/, "");
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return <div className="group/code relative mb-2.5 overflow-auto rounded-lg border bg-surface-subtle p-3 font-mono text-xs leading-5">
    <Button variant="ghost" size="icon-xs" className="absolute top-2 right-2 opacity-0 transition-opacity group-hover/code:opacity-100 focus-visible:opacity-100" aria-label="复制代码块" onClick={() => { copy().catch(() => undefined); }}>{copied ? <CheckIcon /> : <CopyIcon />}</Button>
    {children}
  </div>;
}

function CapabilityRow({ icon: Icon, title, description, last = false }: { icon: typeof FilesIcon; title: string; description: string; last?: boolean }) {
  return <div className={cn("grid grid-cols-[28px_minmax(0,1fr)] gap-2.5 px-3 py-2.5", !last && "border-b")}>
    <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-3.5" /></span>
    <div className="min-w-0"><p className="text-xs font-medium">{title}</p><p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{description}</p></div>
  </div>;
}

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return Children.toArray(node).map(nodeText).join("");
}

type TimelineEntry =
  | { kind: "message"; timestamp: number; message: ChatMessage }
  | { kind: "run"; timestamp: number; tools: ToolRun[] };

export function groupTimeline(messages: ChatMessage[], tools: ToolRun[]): TimelineEntry[] {
  const ordered = [
    ...messages.map((message) => ({ kind: "message" as const, timestamp: message.timestamp, message })),
    ...tools.map((tool) => ({ kind: "tool" as const, timestamp: tool.startedAt, tool })),
  ].sort((a, b) => a.timestamp - b.timestamp);

  return ordered.reduce<TimelineEntry[]>((entries, item) => {
    if (item.kind === "message") {
      entries.push(item);
      return entries;
    }
    const previous = entries.at(-1);
    if (previous?.kind === "run") previous.tools.push(item.tool);
    else entries.push({ kind: "run", timestamp: item.timestamp, tools: [item.tool] });
    return entries;
  }, []);
}
