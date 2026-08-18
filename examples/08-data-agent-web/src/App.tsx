import { useEffect, useReducer, useRef, useState } from "react";
import { BarChart3, Database, Laptop, ListTree, Moon, RefreshCw, Sun, Trash2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { abortRun, connectEvents, deleteWorkspace, getWorkspace, sendMessage, uploadWorkspace } from "./api";
import { CatalogPanel } from "./components/CatalogPanel";
import { ChatPanel } from "./components/ChatPanel";
import { EvidencePanel } from "./components/EvidencePanel";
import { UploadScreen } from "./components/UploadScreen";
import { EMPTY_SNAPSHOT, workspaceReducer } from "./state";
import { useThemePreference, type ThemePreference } from "./theme";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const ACCEPT = ".db,.sqlite,.sqlite3,.csv,.tsv,.json,.jsonl,.ndjson";
const formatBytes = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const themeOptions: { value: ThemePreference; label: string; icon: typeof Sun }[] = [{ value: "system", label: "跟随系统", icon: Laptop }, { value: "light", label: "浅色", icon: Sun }, { value: "dark", label: "深色", icon: Moon }];

export default function App() {
  const [snapshot, dispatch] = useReducer(workspaceReducer, EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pageError, setPageError] = useState<string>();
  const [connected, setConnected] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<string>();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const replaceInput = useRef<HTMLInputElement>(null);
  const lastEventId = useRef(0);
  const theme = useThemePreference();

  useEffect(() => { getWorkspace().then((next) => { dispatch({ type: "snapshot", snapshot: next }); lastEventId.current = next.lastEventId; }).catch((reason) => setPageError(reason instanceof Error ? reason.message : String(reason))).finally(() => setLoading(false)); }, []);
  useEffect(() => { lastEventId.current = snapshot.lastEventId; }, [snapshot.lastEventId]);
  useEffect(() => {
    if (!snapshot.workspace) { setConnected(false); return undefined; }
    const source = connectEvents(lastEventId.current, (event) => {
      if (event.type === "snapshot.required") { getWorkspace().then((next) => dispatch({ type: "snapshot", snapshot: next })).catch((reason) => setPageError(reason instanceof Error ? reason.message : String(reason))); return; }
      dispatch({ type: "event", event });
    }, setConnected);
    return () => source.close();
  }, [snapshot.workspace?.id]);
  useEffect(() => {
    const exists = selectedEvidence && [...snapshot.queries, ...snapshot.charts, ...snapshot.attributions].some((item) => item.id === selectedEvidence);
    if (!exists) setSelectedEvidence(snapshot.queries.at(-1)?.id);
  }, [snapshot.queries, snapshot.charts, snapshot.attributions, selectedEvidence]);

  const upload = async (file: File) => {
    setUploading(true); setPageError(undefined);
    try { const next = await uploadWorkspace(file); dispatch({ type: "snapshot", snapshot: next }); lastEventId.current = next.lastEventId; setSelectedEvidence(undefined); toast.success("数据工作区已就绪"); }
    catch (reason) { const message = reason instanceof Error ? reason.message : String(reason); setPageError(message); toast.error(message); }
    finally { setUploading(false); if (replaceInput.current) replaceInput.current.value = ""; }
  };
  const remove = async () => {
    setPageError(undefined);
    try { await deleteWorkspace(); dispatch({ type: "reset" }); toast.success("临时工作区已删除"); }
    catch (reason) { const message = reason instanceof Error ? reason.message : String(reason); setPageError(message); toast.error(message); }
  };
  const selectEvidence = (id: string) => { setSelectedEvidence(id); setEvidenceOpen(true); };
  const busy = snapshot.status === "running" || snapshot.status === "stopping";
  const currentTheme = themeOptions.find((item) => item.value === theme.preference)!;
  const ThemeIcon = currentTheme.icon;

  return <TooltipProvider>
    <div className="flex h-dvh min-h-0 flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center border-b bg-card px-3 md:px-4">
        <div className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Database className="size-3.5" /></span><strong className="text-sm">DataAgent</strong></div>
        {snapshot.workspace && <div className="ml-4 hidden min-w-0 items-center gap-2 sm:flex"><span className="max-w-48 truncate text-xs font-medium">{snapshot.workspace.sourceName}</span><Badge variant="secondary">{formatBytes(snapshot.workspace.sourceSize)}</Badge><span className="hidden max-w-48 truncate font-mono text-[10px] text-muted-foreground lg:block">{snapshot.workspace.model}</span></div>}
        <div className="ml-auto flex items-center gap-1.5">
          {snapshot.workspace && <><Badge variant="outline" className="hidden gap-1 sm:flex">{connected ? <Wifi className="text-primary" /> : <WifiOff />}{connected ? "已连接" : "重连中"}</Badge>
            <div className="flex md:hidden"><Button variant="ghost" size="icon-sm" aria-label="打开数据目录" onClick={() => setCatalogOpen(true)}><ListTree /></Button><Button variant="ghost" size="icon-sm" aria-label="打开证据检查器" onClick={() => setEvidenceOpen(true)}><BarChart3 /></Button></div>
            <Input ref={replaceInput} type="file" className="sr-only" accept={ACCEPT} onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file).catch(() => undefined); }} />
            <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => replaceInput.current?.click()} disabled={busy || uploading}><RefreshCw data-icon="inline-start" className={uploading ? "animate-spin" : ""} />更换数据</Button>
            <AlertDialog><Tooltip><TooltipTrigger asChild><AlertDialogTrigger asChild><Button variant="ghost" size="icon-sm" disabled={busy} aria-label="删除工作区"><Trash2 /></Button></AlertDialogTrigger></TooltipTrigger><TooltipContent>删除当前临时工作区</TooltipContent></Tooltip><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>删除当前工作区？</AlertDialogTitle><AlertDialogDescription>临时数据、对话记录和所有证据都将被清理，此操作无法撤销。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={() => { remove().catch(() => undefined); }}>删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>}
          <DropdownMenu><Tooltip><TooltipTrigger asChild><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="切换主题"><ThemeIcon /></Button></DropdownMenuTrigger></TooltipTrigger><TooltipContent>主题：{currentTheme.label}</TooltipContent></Tooltip><DropdownMenuContent align="end">{themeOptions.map((item) => <DropdownMenuItem key={item.value} onClick={() => theme.setPreference(item.value)}><item.icon />{item.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
        </div>
      </header>
      {pageError && snapshot.workspace && <Alert variant="destructive" className="rounded-none border-x-0 border-t-0"><AlertDescription>{pageError}</AlertDescription></Alert>}
      {loading ? <div className="grid flex-1 place-items-center"><div className="w-56 space-y-3"><Skeleton className="mx-auto size-10 rounded-xl" /><Skeleton className="h-5 w-full" /><Skeleton className="mx-auto h-4 w-3/4" /></div></div>
      : !snapshot.workspace || !snapshot.catalog ? <UploadScreen onUpload={(file) => { upload(file).catch(() => undefined); }} uploading={uploading} error={pageError} />
      : <main className="min-h-0 flex-1">
        <div className="hidden h-full md:block"><ResizablePanelGroup orientation="horizontal"><ResizablePanel defaultSize={20} minSize={15} maxSize={30}><CatalogPanel catalog={snapshot.catalog} /></ResizablePanel><ResizableHandle /><ResizablePanel defaultSize={52} minSize={35}><ChatPanel messages={snapshot.messages} tools={snapshot.tools} status={snapshot.status} error={snapshot.error} onSend={sendMessage} onAbort={abortRun} onSelectEvidence={selectEvidence} /></ResizablePanel><ResizableHandle /><ResizablePanel defaultSize={28} minSize={20} maxSize={45}><EvidencePanel queries={snapshot.queries} charts={snapshot.charts} attributions={snapshot.attributions} selectedId={selectedEvidence} onSelect={setSelectedEvidence} /></ResizablePanel></ResizablePanelGroup></div>
        <div className="h-full md:hidden"><ChatPanel messages={snapshot.messages} tools={snapshot.tools} status={snapshot.status} error={snapshot.error} onSend={sendMessage} onAbort={abortRun} onSelectEvidence={selectEvidence} /></div>
        <Sheet open={catalogOpen} onOpenChange={setCatalogOpen}><SheetContent side="left" className="w-[90vw] gap-0 p-0"><SheetHeader className="sr-only"><SheetTitle>数据目录</SheetTitle></SheetHeader><CatalogPanel catalog={snapshot.catalog} /></SheetContent></Sheet>
        <Sheet open={evidenceOpen} onOpenChange={setEvidenceOpen}><SheetContent side="right" className="w-[94vw] max-w-none gap-0 p-0 sm:max-w-xl"><SheetHeader className="sr-only"><SheetTitle>证据检查器</SheetTitle></SheetHeader><EvidencePanel queries={snapshot.queries} charts={snapshot.charts} attributions={snapshot.attributions} selectedId={selectedEvidence} onSelect={setSelectedEvidence} /></SheetContent></Sheet>
      </main>}
    </div><Toaster theme={theme.resolved} position="bottom-right" richColors />
  </TooltipProvider>;
}
