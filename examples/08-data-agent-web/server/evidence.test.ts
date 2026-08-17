import { describe, expect, it } from "vitest";
import { parseEvidenceReferences } from "./evidence";

describe("evidence references", () => {
  it("classifies known artifacts and preserves invalid references", () => {
    const refs = parseEvidenceReferences("增长 20% [[evidence:query_1]]，归因如下 [[evidence:attribution_1]] [[evidence:unknown_1]]", {
      queries: [{ id: "query_1" } as never], charts: [], attributions: [{ id: "attribution_1" } as never],
    });
    expect(refs).toEqual([
      { token: "[[evidence:query_1]]", artifactId: "query_1", kind: "query", valid: true },
      { token: "[[evidence:attribution_1]]", artifactId: "attribution_1", kind: "attribution", valid: true },
      { token: "[[evidence:unknown_1]]", artifactId: "unknown_1", valid: false },
    ]);
  });
});
