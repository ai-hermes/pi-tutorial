import assert from "node:assert/strict";
import test from "node:test";
import { formatUiNodes, parseUiDump } from "./ui.js";

test("parseUiDump decodes labels and computes centers", () => {
  const xml = `<hierarchy><node text="搜索&amp;发现" resource-id="app/search" class="android.widget.EditText" content-desc="" clickable="true" focused="true" bounds="[10,20][110,80]" /></hierarchy>`;
  const nodes = parseUiDump(xml);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].text, "搜索&发现");
  assert.deepEqual(nodes[0].center, { x: 60, y: 50 });
  assert.equal(nodes[0].editable, true);
  assert.match(formatUiNodes(nodes), /center=\(60,50\)/);
});
