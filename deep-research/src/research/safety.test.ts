import assert from "node:assert/strict";
import test from "node:test";
import { assertSafeTap, detectHumanBlocker } from "./safety.js";
import {
  isWeChatPublicComponent, isWeChatPublicSearchComponent, type AndroidObservation,
} from "../android/driver.js";

const observation: AndroidObservation = {
  packageName: "test", capturedAt: new Date().toISOString(), formatted: "",
  nodes: [{ index: 0, text: "关注", resourceId: "follow", className: "Button", contentDesc: "",
    clickable: true, scrollable: false, editable: false, focused: false,
    bounds: { left: 0, top: 0, right: 100, bottom: 100 }, center: { x: 50, y: 50 } }],
};

test("safety blocks social interaction controls", () => {
  assert.throws(() => assertSafeTap(observation, 50, 50, "navigation"), /只读策略/);
  assert.doesNotThrow(() => assertSafeTap(observation, 150, 150, "navigation"));
});

test("safety allows opening public comments but blocks composing one", () => {
  const comments = { ...observation, nodes: [{ ...observation.nodes[0], text: "查看120条评论" }] };
  assert.doesNotThrow(() => assertSafeTap(comments, 50, 50, "comments"));
  assert.throws(() => assertSafeTap(comments, 50, 50, "navigation"), /comments 意图/);
  const composer = { ...observation, nodes: [{ ...observation.nodes[0], text: "写评论" }] };
  assert.throws(() => assertSafeTap(composer, 50, 50, "comments"), /只读策略/);
});

test("blocker detector recognizes verification screens", () => {
  assert.equal(detectHumanBlocker("请完成安全验证后继续"), "安全验证");
});

test("WeChat privacy gate only accepts public search and article activities", () => {
  assert.equal(isWeChatPublicComponent("com.tencent.mm/.plugin.websearch.ui.FTSMainUI"), true);
  assert.equal(isWeChatPublicComponent("com.tencent.mm/com.tencent.mm.plugin.webview.ui.tools.WebViewUI"), true);
  assert.equal(isWeChatPublicComponent("com.tencent.mm/.ui.LauncherUI"), false);
  assert.equal(isWeChatPublicComponent("com.tencent.mm/.ui.chatting.ChattingUI"), false);
  assert.equal(isWeChatPublicSearchComponent("com.tencent.mm/.plugin.websearch.ui.FTSMainUI"), true);
  assert.equal(isWeChatPublicSearchComponent("com.tencent.mm/com.tencent.mm.plugin.webview.ui.tools.WebViewUI"), false);
});
