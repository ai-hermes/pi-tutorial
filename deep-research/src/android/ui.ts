/**
 * uiautomator dump 结果解析：
 * 把原始 XML 精简为模型易读的控件列表（文本/ID/描述/中心坐标/可交互属性）。
 */

import { adbShell } from "./adb.js";

export interface UiNode {
  index: number;
  text: string;
  resourceId: string;
  className: string;
  contentDesc: string;
  clickable: boolean;
  scrollable: boolean;
  editable: boolean;
  focused: boolean;
  bounds: { left: number; top: number; right: number; bottom: number };
  center: { x: number; y: number };
}

const NODE_RE = /<node\b([^>]*?)\/?>(?:<\/node>)?/g;
const ATTR_RE = /([\w-]+)="([^"]*)"/g;
const BOUNDS_RE = /\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]/;

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

export function parseUiDump(xml: string): UiNode[] {
  const nodes: UiNode[] = [];
  let match: RegExpExecArray | null;
  let index = 0;
  NODE_RE.lastIndex = 0;
  while ((match = NODE_RE.exec(xml)) !== null) {
    const attrs: Record<string, string> = {};
    let attrMatch: RegExpExecArray | null;
    ATTR_RE.lastIndex = 0;
    while ((attrMatch = ATTR_RE.exec(match[1])) !== null) {
      attrs[attrMatch[1]] = decodeXmlEntities(attrMatch[2]);
    }
    const boundsMatch = BOUNDS_RE.exec(attrs["bounds"] ?? "");
    if (!boundsMatch) {
      continue;
    }
    const [left, top, right, bottom] = boundsMatch.slice(1).map(Number);
    if (right <= left || bottom <= top) {
      continue; // 不可见节点
    }
    nodes.push({
      index: index++,
      text: attrs["text"] ?? "",
      resourceId: attrs["resource-id"] ?? "",
      className: attrs["class"] ?? "",
      contentDesc: attrs["content-desc"] ?? "",
      clickable: attrs["clickable"] === "true",
      scrollable: attrs["scrollable"] === "true",
      editable: (attrs["class"] ?? "").includes("EditText"),
      focused: attrs["focused"] === "true",
      bounds: { left, top, right, bottom },
      center: { x: Math.round((left + right) / 2), y: Math.round((top + bottom) / 2) },
    });
  }
  return nodes;
}

/** 只保留对操作有意义的节点，输出紧凑文本，控制 token 消耗。 */
export function formatUiNodes(nodes: UiNode[], maxNodes = 200): string {
  const interesting = nodes.filter(
    (n) => n.text || n.contentDesc || n.clickable || n.scrollable || n.editable,
  );
  const shown = interesting.slice(0, maxNodes);
  const lines = shown.map((n) => {
    const parts: string[] = [`#${n.index}`];
    if (n.text) parts.push(`text=${JSON.stringify(n.text.slice(0, 60))}`);
    if (n.contentDesc) parts.push(`desc=${JSON.stringify(n.contentDesc.slice(0, 60))}`);
    if (n.resourceId) parts.push(`id=${n.resourceId.split("/").pop()}`);
    parts.push(n.className.split(".").pop() ?? "");
    const flags = [
      n.clickable ? "clickable" : "",
      n.scrollable ? "scrollable" : "",
      n.editable ? "editable" : "",
      n.focused ? "focused" : "",
    ]
      .filter(Boolean)
      .join(",");
    if (flags) parts.push(`[${flags}]`);
    parts.push(`center=(${n.center.x},${n.center.y})`);
    return parts.join(" ");
  });
  const header = `共 ${interesting.length} 个有效控件${
    interesting.length > maxNodes ? `（仅显示前 ${maxNodes} 个，如需更多请滑动后重新 dump）` : ""
  }:`;
  return [header, ...lines].join("\n");
}

export function countInteresting(nodes: UiNode[]): number {
  return nodes.filter(
    (n) => n.text || n.contentDesc || n.clickable || n.scrollable || n.editable,
  ).length;
}

/** dump 当前界面并返回精简控件列表文本。 */
export async function dumpUi(): Promise<{ nodes: UiNode[]; formatted: string; count: number }> {
  await adbShell(["uiautomator", "dump", "/sdcard/window_dump.xml"]);
  const xml = await adbShell(["cat", "/sdcard/window_dump.xml"]);
  const nodes = parseUiDump(xml);
  return { nodes, formatted: formatUiNodes(nodes), count: countInteresting(nodes) };
}
