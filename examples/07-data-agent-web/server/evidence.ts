import type { AttributionArtifact, ChartArtifact, EvidenceReference, QueryArtifact } from "../shared/types";

const TOKEN = /\[\[evidence:([A-Za-z0-9_-]+)\]\]/g;

export function parseEvidenceReferences(content: string, artifacts: {
  queries: QueryArtifact[];
  charts: ChartArtifact[];
  attributions: AttributionArtifact[];
}): EvidenceReference[] {
  const known = new Map<string, EvidenceReference["kind"]>([
    ...artifacts.queries.map((item) => [item.id, "query"] as const),
    ...artifacts.charts.map((item) => [item.id, "chart"] as const),
    ...artifacts.attributions.map((item) => [item.id, "attribution"] as const),
  ]);
  return [...content.matchAll(TOKEN)].map((match) => {
    const artifactId = match[1]!;
    const kind = known.get(artifactId);
    return { token: match[0], artifactId, ...(kind ? { kind } : {}), valid: Boolean(kind) };
  });
}
