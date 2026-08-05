import assert from "node:assert/strict";
import test from "node:test";
import { parseUiDump } from "../android/ui.js";
import { detectHumanBlocker } from "./safety.js";

const fixtures = {
  xiaohongshu: `<hierarchy><node text="便携咖啡机真实体验" resource-id="com.xingin.xhs:id/title" class="android.widget.TextView" content-desc="" clickable="true" bounds="[40,180][900,320]"/></hierarchy>`,
  douyin: `<hierarchy><node text="搜索结果：露营咖啡" resource-id="com.ss.android.ugc.aweme:id/desc" class="android.widget.TextView" content-desc="评论 128" clickable="true" bounds="[0,200][1080,1500]"/></hierarchy>`,
  wechat: `<hierarchy><node text="公众号文章" resource-id="com.tencent.mm:id/result" class="android.widget.TextView" content-desc="搜一搜公开结果" clickable="true" bounds="[20,200][1060,400]"/></hierarchy>`,
};

test("sanitized three-platform UI replay preserves research anchors", () => {
  assert.equal(parseUiDump(fixtures.xiaohongshu)[0].text, "便携咖啡机真实体验");
  assert.match(parseUiDump(fixtures.douyin)[0].contentDesc, /评论 128/);
  assert.match(parseUiDump(fixtures.wechat)[0].contentDesc, /公开结果/);
});

test("replay flags a risk-control screen before extraction", () => {
  const risk = `<hierarchy><node text="操作频繁，请完成安全验证" resource-id="risk" class="android.widget.TextView" content-desc="" clickable="false" bounds="[0,0][1080,500]"/></hierarchy>`;
  const text = parseUiDump(risk).map((node) => node.text).join(" ");
  assert.match(detectHumanBlocker(text) ?? "", /操作频繁|安全验证/);
});
