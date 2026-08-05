import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  CandidateRecord, Checkpoint, CommentRecord, ContentRecord, EvidenceRecord,
  Insight, Platform, ResearchBrief, ResearchQuery, RunRecord,
} from "./types.js";
import { dedupeKey } from "./utils.js";

type Row = Record<string, unknown>;
const json = (value: unknown) => JSON.stringify(value ?? null);
const parse = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string") return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

export class ResearchStore {
  private readonly db: DatabaseSync;

  constructor(readonly path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
    this.migrate();
  }

  close(): void { this.db.close(); }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY, status TEXT NOT NULL, stage TEXT NOT NULL, brief_json TEXT NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, error TEXT
      );
      CREATE TABLE IF NOT EXISTS queries (
        id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), platform TEXT NOT NULL,
        text TEXT NOT NULL, intent TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS evidence (
        id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), platform TEXT NOT NULL,
        kind TEXT NOT NULL, path TEXT NOT NULL, captured_at TEXT NOT NULL, package_name TEXT,
        sha256 TEXT NOT NULL, note TEXT
      );
      CREATE TABLE IF NOT EXISTS candidates (
        id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), query_id TEXT NOT NULL,
        platform TEXT NOT NULL, title TEXT NOT NULL, author TEXT, snippet TEXT, published_at TEXT,
        engagement_json TEXT, rank INTEGER NOT NULL, relevance REAL NOT NULL, novelty REAL NOT NULL,
        locator TEXT NOT NULL, evidence_ids_json TEXT NOT NULL, dedupe_key TEXT NOT NULL,
        UNIQUE(run_id, platform, dedupe_key)
      );
      CREATE TABLE IF NOT EXISTS contents (
        id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), candidate_id TEXT NOT NULL UNIQUE,
        platform TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, author TEXT, published_at TEXT,
        engagement_json TEXT, visual_summary TEXT, canonical_url TEXT, locator TEXT NOT NULL,
        confidence TEXT NOT NULL, evidence_ids_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), content_id TEXT NOT NULL REFERENCES contents(id),
        platform TEXT NOT NULL, text TEXT NOT NULL, author TEXT, engagement_json TEXT, stance TEXT,
        evidence_ids_json TEXT NOT NULL, dedupe_key TEXT NOT NULL,
        UNIQUE(content_id, dedupe_key)
      );
      CREATE TABLE IF NOT EXISTS insights (
        id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), category TEXT NOT NULL,
        title TEXT NOT NULL, finding TEXT NOT NULL, platforms_json TEXT NOT NULL,
        evidence_ids_json TEXT NOT NULL, counter_evidence_ids_json TEXT NOT NULL, confidence TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS checkpoints (
        run_id TEXT NOT NULL REFERENCES runs(id), platform TEXT NOT NULL, stage TEXT NOT NULL,
        query_id TEXT, candidate_id TEXT, cursor TEXT, screen TEXT, recovery_action TEXT NOT NULL,
        updated_at TEXT NOT NULL, PRIMARY KEY(run_id, platform)
      );
      CREATE TABLE IF NOT EXISTS errors (
        id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL REFERENCES runs(id), platform TEXT,
        stage TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_candidates_run_platform ON candidates(run_id, platform);
      CREATE INDEX IF NOT EXISTS idx_contents_run_platform ON contents(run_id, platform);
      CREATE INDEX IF NOT EXISTS idx_comments_run_platform ON comments(run_id, platform);
    `);
  }

  createRun(runId: string, brief: ResearchBrief): RunRecord {
    const now = new Date().toISOString();
    this.db.prepare(`INSERT INTO runs(id,status,stage,brief_json,created_at,updated_at)
      VALUES(?,?,?,?,?,?)`).run(runId, "planned", "planning", json(brief), now, now);
    const insert = this.db.prepare("INSERT INTO queries(id,run_id,platform,text,intent) VALUES(?,?,?,?,?)");
    for (const query of brief.queries) insert.run(query.id, runId, query.platform, query.text, query.intent);
    return { id: runId, status: "planned", stage: "planning", brief, createdAt: now, updatedAt: now };
  }

  getRun(runId: string): RunRecord {
    const row = this.db.prepare("SELECT * FROM runs WHERE id=?").get(runId) as Row | undefined;
    if (!row) throw new Error(`研究任务不存在: ${runId}`);
    return {
      id: String(row.id), status: row.status as RunRecord["status"], stage: String(row.stage),
      brief: parse<ResearchBrief>(row.brief_json, {} as ResearchBrief),
      createdAt: String(row.created_at), updatedAt: String(row.updated_at),
      error: row.error ? String(row.error) : undefined,
    };
  }

  updateRun(runId: string, status: RunRecord["status"], stage: string, error?: string): void {
    this.db.prepare("UPDATE runs SET status=?,stage=?,error=?,updated_at=? WHERE id=?")
      .run(status, stage, error ?? null, new Date().toISOString(), runId);
  }

  listQueries(runId: string, platform?: Platform): ResearchQuery[] {
    const rows = (platform
      ? this.db.prepare("SELECT * FROM queries WHERE run_id=? AND platform=? ORDER BY rowid").all(runId, platform)
      : this.db.prepare("SELECT * FROM queries WHERE run_id=? ORDER BY rowid").all(runId)) as Row[];
    return rows.map((row) => ({ id: String(row.id), platform: row.platform as Platform,
      text: String(row.text), intent: row.intent as ResearchQuery["intent"] }));
  }

  addEvidence(record: EvidenceRecord): void {
    this.db.prepare(`INSERT OR IGNORE INTO evidence
      (id,run_id,platform,kind,path,captured_at,package_name,sha256,note) VALUES(?,?,?,?,?,?,?,?,?)`)
      .run(record.id, record.runId, record.platform, record.kind, record.path, record.capturedAt,
        record.packageName ?? null, record.sha256, record.note ?? null);
  }

  listEvidence(runId: string): EvidenceRecord[] {
    return (this.db.prepare("SELECT * FROM evidence WHERE run_id=? ORDER BY captured_at").all(runId) as Row[])
      .map((row) => ({ id: String(row.id), runId: String(row.run_id), platform: row.platform as Platform,
        kind: row.kind as EvidenceRecord["kind"], path: String(row.path), capturedAt: String(row.captured_at),
        packageName: row.package_name ? String(row.package_name) : undefined, sha256: String(row.sha256),
        note: row.note ? String(row.note) : undefined }));
  }

  evidenceExists(runId: string, evidenceId: string): boolean {
    return Boolean(this.db.prepare("SELECT 1 FROM evidence WHERE run_id=? AND id=?").get(runId, evidenceId));
  }

  addCandidate(record: CandidateRecord): { inserted: boolean; id: string } {
    const key = dedupeKey(record.title, record.author, record.snippet);
    const result = this.db.prepare(`INSERT OR IGNORE INTO candidates
      (id,run_id,query_id,platform,title,author,snippet,published_at,engagement_json,rank,relevance,novelty,locator,evidence_ids_json,dedupe_key)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(record.id, record.runId, record.queryId, record.platform,
      record.title, record.author ?? null, record.snippet ?? null, record.publishedAt ?? null,
      json(record.engagement), record.rank, record.relevance, record.novelty, record.locator,
      json(record.evidenceIds), key);
    if (Number(result.changes) > 0) return { inserted: true, id: record.id };
    const existing = this.db.prepare("SELECT id FROM candidates WHERE run_id=? AND platform=? AND dedupe_key=?")
      .get(record.runId, record.platform, key) as Row;
    return { inserted: false, id: String(existing.id) };
  }

  listCandidates(runId: string, platform?: Platform): CandidateRecord[] {
    const rows = (platform
      ? this.db.prepare("SELECT * FROM candidates WHERE run_id=? AND platform=? ORDER BY relevance DESC,novelty DESC,rank").all(runId, platform)
      : this.db.prepare("SELECT * FROM candidates WHERE run_id=? ORDER BY platform,relevance DESC,novelty DESC,rank").all(runId)) as Row[];
    return rows.map((row) => this.candidateFromRow(row));
  }

  private candidateFromRow(row: Row): CandidateRecord {
    return { id: String(row.id), runId: String(row.run_id), queryId: String(row.query_id),
      platform: row.platform as Platform, title: String(row.title), author: row.author ? String(row.author) : undefined,
      snippet: row.snippet ? String(row.snippet) : undefined,
      publishedAt: row.published_at ? String(row.published_at) : undefined,
      engagement: parse(row.engagement_json, undefined), rank: Number(row.rank), relevance: Number(row.relevance),
      novelty: Number(row.novelty), locator: String(row.locator), evidenceIds: parse(row.evidence_ids_json, []) };
  }

  addContent(record: ContentRecord): { inserted: boolean; id: string } {
    const result = this.db.prepare(`INSERT OR IGNORE INTO contents
      (id,run_id,candidate_id,platform,title,body,author,published_at,engagement_json,visual_summary,canonical_url,locator,confidence,evidence_ids_json)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(record.id, record.runId, record.candidateId, record.platform,
      record.title, record.body, record.author ?? null, record.publishedAt ?? null, json(record.engagement),
      record.visualSummary ?? null, record.canonicalUrl ?? null, record.locator, record.confidence, json(record.evidenceIds));
    if (Number(result.changes) > 0) return { inserted: true, id: record.id };
    const row = this.db.prepare("SELECT id FROM contents WHERE candidate_id=?").get(record.candidateId) as Row;
    return { inserted: false, id: String(row.id) };
  }

  getContentByCandidate(candidateId: string): ContentRecord | undefined {
    const row = this.db.prepare("SELECT * FROM contents WHERE candidate_id=?").get(candidateId) as Row | undefined;
    return row ? this.contentFromRow(row) : undefined;
  }

  listContents(runId: string, platform?: Platform): ContentRecord[] {
    const rows = (platform
      ? this.db.prepare("SELECT * FROM contents WHERE run_id=? AND platform=? ORDER BY rowid").all(runId, platform)
      : this.db.prepare("SELECT * FROM contents WHERE run_id=? ORDER BY platform,rowid").all(runId)) as Row[];
    return rows.map((row) => this.contentFromRow(row));
  }

  private contentFromRow(row: Row): ContentRecord {
    return { id: String(row.id), runId: String(row.run_id), candidateId: String(row.candidate_id),
      platform: row.platform as Platform, title: String(row.title), body: String(row.body),
      author: row.author ? String(row.author) : undefined,
      publishedAt: row.published_at ? String(row.published_at) : undefined,
      engagement: parse(row.engagement_json, undefined), visualSummary: row.visual_summary ? String(row.visual_summary) : undefined,
      canonicalUrl: row.canonical_url ? String(row.canonical_url) : undefined, locator: String(row.locator),
      confidence: row.confidence as ContentRecord["confidence"], evidenceIds: parse(row.evidence_ids_json, []) };
  }

  addComment(record: CommentRecord): { inserted: boolean; id: string } {
    const key = dedupeKey(record.text, record.author);
    const result = this.db.prepare(`INSERT OR IGNORE INTO comments
      (id,run_id,content_id,platform,text,author,engagement_json,stance,evidence_ids_json,dedupe_key)
      VALUES(?,?,?,?,?,?,?,?,?,?)`).run(record.id, record.runId, record.contentId, record.platform,
      record.text, record.author ?? null, json(record.engagement), record.stance ?? null, json(record.evidenceIds), key);
    return { inserted: Number(result.changes) > 0, id: record.id };
  }

  listComments(runId: string, platform?: Platform): CommentRecord[] {
    const rows = (platform
      ? this.db.prepare("SELECT * FROM comments WHERE run_id=? AND platform=? ORDER BY rowid").all(runId, platform)
      : this.db.prepare("SELECT * FROM comments WHERE run_id=? ORDER BY platform,rowid").all(runId)) as Row[];
    return rows.map((row) => ({ id: String(row.id), runId: String(row.run_id), contentId: String(row.content_id),
      platform: row.platform as Platform, text: String(row.text), author: row.author ? String(row.author) : undefined,
      engagement: parse(row.engagement_json, undefined), stance: row.stance as CommentRecord["stance"],
      evidenceIds: parse(row.evidence_ids_json, []) }));
  }

  countComments(runId: string, platform: Platform): number {
    const row = this.db.prepare("SELECT count(*) AS n FROM comments WHERE run_id=? AND platform=?").get(runId, platform) as Row;
    return Number(row.n);
  }

  replaceInsights(runId: string, insights: Insight[]): void {
    this.db.prepare("DELETE FROM insights WHERE run_id=?").run(runId);
    const stmt = this.db.prepare(`INSERT INTO insights
      (id,run_id,category,title,finding,platforms_json,evidence_ids_json,counter_evidence_ids_json,confidence)
      VALUES(?,?,?,?,?,?,?,?,?)`);
    for (const item of insights) stmt.run(item.id, runId, item.category, item.title, item.finding,
      json(item.platforms), json(item.evidenceIds), json(item.counterEvidenceIds), item.confidence);
  }

  listInsights(runId: string): Insight[] {
    return (this.db.prepare("SELECT * FROM insights WHERE run_id=? ORDER BY rowid").all(runId) as Row[])
      .map((row) => ({ id: String(row.id), runId: String(row.run_id), category: row.category as Insight["category"],
        title: String(row.title), finding: String(row.finding), platforms: parse(row.platforms_json, []),
        evidenceIds: parse(row.evidence_ids_json, []), counterEvidenceIds: parse(row.counter_evidence_ids_json, []),
        confidence: row.confidence as Insight["confidence"] }));
  }

  saveCheckpoint(checkpoint: Checkpoint): void {
    this.db.prepare(`INSERT INTO checkpoints
      (run_id,platform,stage,query_id,candidate_id,cursor,screen,recovery_action,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(run_id,platform) DO UPDATE SET
      stage=excluded.stage,query_id=excluded.query_id,candidate_id=excluded.candidate_id,cursor=excluded.cursor,
      screen=excluded.screen,recovery_action=excluded.recovery_action,updated_at=excluded.updated_at`)
      .run(checkpoint.runId, checkpoint.platform, checkpoint.stage, checkpoint.queryId ?? null,
        checkpoint.candidateId ?? null, checkpoint.cursor ?? null, checkpoint.screen ?? null,
        checkpoint.recoveryAction, checkpoint.updatedAt);
  }

  getCheckpoint(runId: string, platform: Platform): Checkpoint | undefined {
    const row = this.db.prepare("SELECT * FROM checkpoints WHERE run_id=? AND platform=?").get(runId, platform) as Row | undefined;
    return row ? { runId: String(row.run_id), platform: row.platform as Platform, stage: String(row.stage),
      queryId: row.query_id ? String(row.query_id) : undefined, candidateId: row.candidate_id ? String(row.candidate_id) : undefined,
      cursor: row.cursor ? String(row.cursor) : undefined, screen: row.screen ? String(row.screen) : undefined,
      recoveryAction: String(row.recovery_action), updatedAt: String(row.updated_at) } : undefined;
  }

  addError(runId: string, stage: string, message: string, platform?: Platform): void {
    this.db.prepare("INSERT INTO errors(run_id,platform,stage,message,created_at) VALUES(?,?,?,?,?)")
      .run(runId, platform ?? null, stage, message, new Date().toISOString());
  }

  listErrors(runId: string): Array<{ platform?: Platform; stage: string; message: string; createdAt: string }> {
    return (this.db.prepare("SELECT * FROM errors WHERE run_id=? ORDER BY id").all(runId) as Row[]).map((row) => ({
      platform: row.platform as Platform | undefined, stage: String(row.stage), message: String(row.message),
      createdAt: String(row.created_at),
    }));
  }
}
