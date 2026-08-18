import { useEffect, useRef, useState } from "react";
import { DownloadIcon, FileUpIcon, GitBranchIcon, MessageSquareIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem, SidebarRail,
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [renameItem, setRenameItem] = useState<ConversationSummary>();
  const [renameText, setRenameText] = useState("");
  const [deleteItem, setDeleteItem] = useState<ConversationSummary>();
  const openSearch = () => setSearchOpen(true);
  const selectSearchResult = (item: ConversationSummary) => {
    setSearchOpen(false);
    onSelect(item.id);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.repeat) return;
      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        if (!loading) onNew().catch(() => undefined);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loading, onNew]);

  return <>
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="gap-2 border-b border-sidebar-border p-3">
        <div className="flex h-9 items-center gap-2.5">
          <span className="flex size-8 items-center justify-center text-foreground" aria-label="Pi"><PiLogo className="size-6" /></span>
          <div className="min-w-0"><strong className="block text-sm leading-4">Pi Chat</strong><span className="text-[var(--type-meta)] leading-[var(--leading-meta)] text-muted-foreground">Local workbench</span></div>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-1.5">
          <Button size="sm" className="justify-start bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/85" title="新建会话 (⌘/Ctrl+N)" onClick={() => { onNew().catch(() => undefined); }} disabled={loading}><PlusIcon data-icon="inline-start" />新建任务<kbd className="ml-auto hidden font-mono text-[10px] font-normal opacity-60 xl:inline">⌘N</kbd></Button>
          <Button variant="outline" size="icon-sm" aria-label="搜索会话" title="搜索会话 (⌘/Ctrl+K)" onClick={openSearch}><SearchIcon /></Button>
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
              if (file) onImport(file).catch(() => undefined);
            }}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="p-2 pt-2">
          <SidebarGroupLabel className="h-7 px-2 text-xs">会话历史 <span className="ml-auto font-mono tabular-nums">{conversations.length}</span></SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {conversations.map((item) => <SidebarMenuItem key={item.id}>
                <SidebarMenuButton className="relative h-auto min-h-11 items-start rounded-md border border-transparent py-1.5 before:absolute before:top-2.5 before:bottom-2.5 before:left-0 before:w-0.5 before:bg-transparent hover:border-sidebar-border data-[active=true]:border-sidebar-border data-[active=true]:bg-sidebar-accent data-[active=true]:before:bg-foreground" isActive={item.id === selectedId} onClick={() => onSelect(item.id)} tooltip={item.title}>
                  {item.parentId ? <GitBranchIcon className="mt-0.5" /> : <MessageSquareIcon className="mt-0.5" />}
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{item.title}</span><span className="mt-0.5 block truncate text-[var(--type-meta)] leading-[var(--leading-meta)] text-muted-foreground">{item.parentId ? "共享 workspace · " : ""}<span className="font-mono">{relativeTime(item.updatedAt)}</span></span></span>
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
              {conversations.length === 0 && <li className="px-2 py-8 text-center text-xs text-muted-foreground">还没有会话</li>}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-3 py-2"><p className="text-[var(--type-meta)] leading-[var(--leading-meta)] text-muted-foreground">本地持久会话</p></SidebarFooter>
      <SidebarRail />
    </Sidebar>

    <CommandDialog
      open={searchOpen}
      onOpenChange={setSearchOpen}
      title="搜索会话"
      description="输入标题搜索本地会话。"
    >
      <CommandInput autoFocus placeholder="搜索会话…" aria-label="搜索会话" shortcut="ESC" />
      <CommandList aria-label="会话搜索结果">
        <CommandEmpty>没有匹配的会话</CommandEmpty>
        <CommandGroup>
          {conversations.map((item) => <CommandItem
            key={item.id}
            value={`${item.title} ${item.id}`}
            keywords={item.parentId ? ["分支", "共享 workspace"] : ["本地会话"]}
            onSelect={() => selectSearchResult(item)}
          >
            {item.parentId ? <GitBranchIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> : <MessageSquareIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{item.title}</span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.parentId ? "共享 workspace · " : ""}<span className="font-mono">{relativeTime(item.updatedAt)}</span></span>
            </span>
          </CommandItem>)}
        </CommandGroup>
      </CommandList>
    </CommandDialog>

    <Dialog open={Boolean(renameItem)} onOpenChange={(open) => { if (!open) setRenameItem(undefined); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>重命名对话</DialogTitle><DialogDescription>新标题会写入 Pi session 元数据。</DialogDescription></DialogHeader>
        <FieldGroup><Field><FieldLabel htmlFor="conversation-title">标题</FieldLabel><Input id="conversation-title" value={renameText} onChange={(event) => setRenameText(event.target.value)} /></Field></FieldGroup>
        <DialogFooter><Button variant="outline" onClick={() => setRenameItem(undefined)}>取消</Button><Button onClick={() => { if (renameItem) onRename(renameItem.id, renameText).then(() => setRenameItem(undefined)).catch(() => undefined); }} disabled={!renameText.trim()}>保存</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={Boolean(deleteItem)} onOpenChange={(open) => { if (!open) setDeleteItem(undefined); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>删除“{deleteItem?.title}”？</AlertDialogTitle><AlertDialogDescription>会话 JSONL 会被删除；仅当没有其他分支引用时才会删除共享 workspace。</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => { if (deleteItem) onDelete(deleteItem.id).then(() => setDeleteItem(undefined)).catch(() => undefined); }}>删除</AlertDialogAction></AlertDialogFooter>
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
