import { useMemo, useRef, useState } from "react";
import { DownloadIcon, FileUpIcon, GitBranchIcon, MessageSquareIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarInput, SidebarMenu, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar";
import type { ConversationSummary } from "../../shared/types";
import { PiLogo } from "./PiLogo";

interface Props {
  conversations: ConversationSummary[];
  selectedId?: string;
  loading: boolean;
  onSelect(id: string): void;
  onNew(): Promise<void>;
  onImport(file: File): Promise<void>;
  onRename(id: string, title: string): Promise<void>;
  onDelete(id: string): Promise<void>;
}

export function ConversationSidebar({ conversations, selectedId, loading, onSelect, onNew, onImport, onRename, onDelete }: Props) {
  const importInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [renameItem, setRenameItem] = useState<ConversationSummary>();
  const [renameText, setRenameText] = useState("");
  const [deleteItem, setDeleteItem] = useState<ConversationSummary>();
  const filtered = useMemo(() => conversations.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())), [conversations, query]);

  return <>
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="gap-2 border-b border-sidebar-border p-3">
        <div className="flex h-9 items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md border border-sidebar-border bg-[#09090b] text-white shadow-sm" aria-label="Pi"><PiLogo className="size-5" /></span>
          <div className="min-w-0"><strong className="block text-sm leading-4 tracking-[-0.28px]">Pi Chat</strong><span className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground">Local workbench</span></div>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-1.5">
          <Button size="sm" className="justify-start bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/85" onClick={() => void onNew()} disabled={loading}><PlusIcon data-icon="inline-start" />新建任务</Button>
          <Button variant="outline" size="icon-sm" aria-label="导入会话" title="导入 Pi Session JSONL" onClick={() => importInput.current?.click()} disabled={loading}><FileUpIcon /></Button>
          <input
            ref={importInput}
            className="sr-only"
            type="file"
            accept=".jsonl,application/x-ndjson"
            aria-label="选择 JSONL 会话文件"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void onImport(file);
            }}
          />
        </div>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <SidebarInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索会话" className="h-8 pl-8 text-xs" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="p-2 pt-2">
          <SidebarGroupLabel className="h-7 px-2 font-mono text-[11px] tracking-[0.04em]">会话历史 <span className="ml-auto tabular-nums">{filtered.length}</span></SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {filtered.map((item) => <SidebarMenuItem key={item.id}>
                <SidebarMenuButton className="relative h-auto min-h-11 items-start rounded-lg border border-transparent py-1.5 before:absolute before:top-2.5 before:bottom-2.5 before:left-0 before:w-0.5 before:rounded-full before:bg-transparent hover:border-sidebar-border/70 data-[active=true]:border-sidebar-border data-[active=true]:bg-sidebar-accent data-[active=true]:shadow-sm data-[active=true]:before:bg-emerald-600 dark:data-[active=true]:before:bg-emerald-400" isActive={item.id === selectedId} onClick={() => onSelect(item.id)} tooltip={item.title}>
                  {item.parentId ? <GitBranchIcon className="mt-0.5" /> : <MessageSquareIcon className="mt-0.5" />}
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{item.title}</span><span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">{item.parentId ? "共享 workspace · " : ""}{relativeTime(item.updatedAt)}</span></span>
                </SidebarMenuButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction className="md:opacity-0 md:transition-opacity md:group-hover/menu-item:opacity-100 md:focus-visible:opacity-100" aria-label="对话操作"><MoreHorizontalIcon /></SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuGroup>
                      <DropdownMenuItem onSelect={() => { setRenameItem(item); setRenameText(item.title); }}><PencilIcon />重命名</DropdownMenuItem>
                      <DropdownMenuItem asChild><a href={`/api/conversations/${encodeURIComponent(item.id)}/export?format=jsonl`} download><DownloadIcon />导出 JSONL</a></DropdownMenuItem>
                      <DropdownMenuItem asChild><a href={`/api/conversations/${encodeURIComponent(item.id)}/export?format=html`} download><DownloadIcon />导出 HTML</a></DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem variant="destructive" onSelect={() => setDeleteItem(item)}><Trash2Icon />删除</DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>)}
              {filtered.length === 0 && <li className="px-2 py-8 text-center text-xs text-muted-foreground">没有匹配的对话</li>}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-3 py-2"><p className="font-mono text-[10px] text-muted-foreground">LOCAL · PERSISTENT SESSIONS</p></SidebarFooter>
      <SidebarRail />
    </Sidebar>

    <Dialog open={Boolean(renameItem)} onOpenChange={(open) => { if (!open) setRenameItem(undefined); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>重命名对话</DialogTitle><DialogDescription>新标题会写入 Pi session 元数据。</DialogDescription></DialogHeader>
        <FieldGroup><Field><FieldLabel htmlFor="conversation-title">标题</FieldLabel><Input id="conversation-title" value={renameText} onChange={(event) => setRenameText(event.target.value)} /></Field></FieldGroup>
        <DialogFooter><Button variant="outline" onClick={() => setRenameItem(undefined)}>取消</Button><Button onClick={() => { if (renameItem) void onRename(renameItem.id, renameText).then(() => setRenameItem(undefined)); }} disabled={!renameText.trim()}>保存</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={Boolean(deleteItem)} onOpenChange={(open) => { if (!open) setDeleteItem(undefined); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>删除“{deleteItem?.title}”？</AlertDialogTitle><AlertDialogDescription>会话 JSONL 会被删除；仅当没有其他分支引用时才会删除共享 workspace。</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => { if (deleteItem) void onDelete(deleteItem.id).then(() => setDeleteItem(undefined)); }}>删除</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

function relativeTime(value: string): string {
  const elapsed = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 60_000) return "刚刚";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)} 分钟前`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)} 小时前`;
  if (elapsed < 604_800_000) return `${Math.floor(elapsed / 86_400_000)} 天前`;
  return new Date(value).toLocaleDateString();
}
