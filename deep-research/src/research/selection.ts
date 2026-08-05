import type { CandidateRecord } from "./types.js";
import { normalizeText } from "./utils.js";

export function selectCandidates(candidates: CandidateRecord[], limit: number): CandidateRecord[] {
  const byQuery = new Map<string, CandidateRecord[]>();
  for (const item of candidates) {
    const list = byQuery.get(item.queryId) ?? [];
    list.push(item);
    byQuery.set(item.queryId, list);
  }
  for (const list of byQuery.values()) list.sort(scoreSort);
  const selected: CandidateRecord[] = [];
  const used = new Set<string>();
  const queues = [...byQuery.values()];
  while (selected.length < limit && queues.some((queue) => queue.length)) {
    for (const queue of queues) {
      const item = queue.shift();
      if (!item) continue;
      const key = normalizeText(`${item.title}|${item.author ?? ""}`);
      if (!used.has(key)) { selected.push(item); used.add(key); }
      if (selected.length >= limit) break;
    }
  }
  return selected.sort(scoreSort);
}

function scoreSort(a: CandidateRecord, b: CandidateRecord): number {
  return (b.relevance * 0.65 + b.novelty * 0.35) - (a.relevance * 0.65 + a.novelty * 0.35)
    || a.rank - b.rank;
}

export class SaturationTracker {
  private readonly grams = new Set<string>();
  private staleBatches = 0;

  addBatch(texts: string[]): { novelty: number; saturated: boolean } {
    const next = new Set(texts.flatMap((text) => ngrams(normalizeText(text))));
    const unseen = [...next].filter((gram) => !this.grams.has(gram));
    const novelty = next.size ? unseen.length / next.size : 0;
    for (const gram of next) this.grams.add(gram);
    this.staleBatches = novelty < 0.12 ? this.staleBatches + 1 : 0;
    return { novelty, saturated: this.staleBatches >= 2 };
  }
}

function ngrams(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  for (let i = 0; i < text.length - 2; i++) out.push(text.slice(i, i + 3));
  return out;
}
