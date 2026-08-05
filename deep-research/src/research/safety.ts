import type { AndroidObservation } from "../android/driver.js";

export type TapIntent = "search" | "result" | "expand" | "comments" | "article" | "navigation" | "playback";

const UNSAFE = /点赞|关注|发送|私信|转发|分享|购买|下单|支付|红包|转账|删除|举报|收藏|加入购物车/i;
const COMMENT_WRITE = /写评论|发表评论|发布评论|说点什么|回复评论/i;
const BLOCKERS = /验证码|安全验证|拖动滑块|操作频繁|账号异常|登录失效|重新登录|手机号登录|人脸验证|风险提示/i;

export function detectHumanBlocker(text: string): string | undefined {
  const match = text.match(BLOCKERS);
  return match ? match[0] : undefined;
}

export function assertSafeTap(observation: AndroidObservation | undefined, x: number, y: number, intent: TapIntent): void {
  if (!observation) throw new Error("点击前必须先调用 research_observe");
  const age = Date.now() - Date.parse(observation.capturedAt);
  if (!Number.isFinite(age) || age > 60_000) throw new Error("观察结果已过期，请重新调用 research_observe");
  const nodes = observation.nodes.filter((node) => x >= node.bounds.left && x <= node.bounds.right
    && y >= node.bounds.top && y <= node.bounds.bottom);
  for (const node of nodes) {
    const label = `${node.text} ${node.contentDesc} ${node.resourceId}`;
    if (UNSAFE.test(label) || COMMENT_WRITE.test(label)) {
      throw new Error(`只读策略阻止点击疑似互动控件: ${label.trim()}`);
    }
    if (/评论/i.test(label) && intent !== "comments") {
      throw new Error(`打开评论区必须声明 comments 意图: ${label.trim()}`);
    }
  }
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) throw new Error("点击坐标无效");
  if (!intent) throw new Error("点击必须声明只读导航意图");
}

export function assertSearchInput(observation: AndroidObservation | undefined): void {
  if (!observation) throw new Error("输入前必须先调用 research_observe");
  const editable = observation.nodes.some((node) => node.editable && (node.focused
    || /搜索|搜一搜|search/i.test(`${node.text} ${node.contentDesc} ${node.resourceId}`)));
  if (observation.nodes.length > 0 && !editable) throw new Error("当前没有已聚焦或可识别的搜索框，禁止输入文本");
}

export const READ_ONLY_POLICY = `
只允许读取公开内容。严禁点赞、关注、收藏、评论、私信、分享、转发、购买、支付、加好友、打开聊天记录或修改任何数据。
遇到验证码、登录、风控或无法确认的页面，必须调用 research_needs_human，不能尝试绕过。
每次点击前必须先 observe，坐标必须来自最近观察；只使用单击，不双击、不长按。
`.trim();
