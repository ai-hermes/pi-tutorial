import { useRef, useState } from "react";
import { Database, LoaderCircle, Upload, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const ACCEPT = ".db,.sqlite,.sqlite3,.csv,.tsv,.json,.jsonl,.ndjson";

export function UploadScreen({ onUpload, uploading, error }: { onUpload: (file: File) => void; uploading: boolean; error?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const choose = (files: FileList | null) => { const file = files?.[0]; if (file) onUpload(file); };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-3xl flex-col justify-center gap-8 px-5 py-12">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><Database className="size-5" /></div>
        <h1 className="text-3xl font-semibold tracking-tight">让数据回答问题</h1>
        <p className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground">上传本地数据文件。DataAgent 会检查结构、执行只读 SQL，并为每个定量结论提供可追溯证据。</p>
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="dataset-file" className="sr-only">选择数据文件</FieldLabel>
          <Empty
            className={`border-2 border-dashed bg-card px-6 py-12 transition-colors ${dragging ? "border-primary bg-accent" : "border-border"}`}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
            onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files); }}
          >
            <EmptyHeader>
              <EmptyMedia variant="icon"><Upload /></EmptyMedia>
              <EmptyTitle>选择数据文件</EmptyTitle>
              <EmptyDescription>SQLite、CSV、TSV、JSON 或 JSONL，最大 25 MB</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Input id="dataset-file" ref={input} className="sr-only" type="file" accept={ACCEPT} onChange={(event) => choose(event.target.files)} disabled={uploading} />
              <Button size="lg" onClick={() => input.current?.click()} disabled={uploading}>
                {uploading ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <Upload data-icon="inline-start" />}
                {uploading ? "正在连接" : "浏览文件"}
              </Button>
            </EmptyContent>
          </Empty>
          <FieldDescription className="text-center">文件只保存在本机临时目录，服务停止后自动清理。</FieldDescription>
        </Field>
      </FieldGroup>

      {error && <Alert variant="destructive" role="alert"><TriangleAlert /><AlertTitle>无法连接数据</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    </main>
  );
}
