/**
 * 截图坐标网格叠加。
 *
 * 视觉模型对高分辨率截图直接估像素坐标很不准，而且服务端常会缩放图片，
 * 导致模型内部像素与真实设备像素对不上。解决办法：在截图上叠一层带
 * 「设备像素刻度数字」的网格。模型不再靠感觉猜坐标，而是读网格上最接近
 * 的刻度数字来定位——这天然抗缩放（数字缩放后仍可读），定位精度大幅提升。
 *
 * 纯 pngjs 实现（无原生依赖），自带 5x7 像素数字字体。
 */

import { PNG } from "pngjs";

/** 5x7 像素数字字体（每个字形 7 行、每行 5 列，'1' 表示落点）。 */
const FONT: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};

const GLYPH_W = 5;
const GLYPH_H = 7;

const LINE_COLOR: [number, number, number] = [0, 200, 255]; // 青色网格线
const LINE_ALPHA = 0.35;
const TEXT_COLOR: [number, number, number] = [255, 255, 0]; // 黄色刻度数字
const TEXT_BG: [number, number, number] = [0, 0, 0]; // 数字底衬（保证任意背景下可读）

function setPx(png: PNG, x: number, y: number, [r, g, b]: [number, number, number]): void {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * (y | 0) + (x | 0)) << 2;
  png.data[i] = r;
  png.data[i + 1] = g;
  png.data[i + 2] = b;
  png.data[i + 3] = 255;
}

function blendPx(png: PNG, x: number, y: number, [r, g, b]: [number, number, number], a: number): void {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * (y | 0) + (x | 0)) << 2;
  png.data[i] = Math.round(png.data[i] * (1 - a) + r * a);
  png.data[i + 1] = Math.round(png.data[i + 1] * (1 - a) + g * a);
  png.data[i + 2] = Math.round(png.data[i + 2] * (1 - a) + b * a);
  png.data[i + 3] = 255;
}

/** 画一个字符，scale 为放大倍数，返回该字符占用的宽度（像素）。 */
function drawChar(png: PNG, ch: string, x: number, y: number, scale: number): number {
  const glyph = FONT[ch];
  if (!glyph) return 0;
  for (let gy = 0; gy < GLYPH_H; gy++) {
    for (let gx = 0; gx < GLYPH_W; gx++) {
      if (glyph[gy][gx] === "1") {
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            setPx(png, x + gx * scale + sx, y + gy * scale + sy, TEXT_COLOR);
          }
        }
      }
    }
  }
  return GLYPH_W * scale;
}

/** 画一串数字，先铺一块黑色底衬再画黄字，保证任意背景可读。 */
function drawLabel(png: PNG, text: string, x: number, y: number, scale: number): void {
  const pad = scale;
  const w = text.length * (GLYPH_W + 1) * scale + pad * 2;
  const h = GLYPH_H * scale + pad * 2;
  for (let dy = -pad; dy < h - pad; dy++) {
    for (let dx = -pad; dx < w - pad; dx++) {
      blendPx(png, x + dx, y + dy, TEXT_BG, 0.55);
    }
  }
  let cx = x;
  for (const ch of text) {
    cx += drawChar(png, ch, cx, y, scale) + scale;
  }
}

export interface GridOptions {
  /** 网格间距（设备像素），默认按较短边自适应为约 8 格。 */
  step?: number;
  /** 数字放大倍数，默认 3（约 15x21 像素/字符，抗缩放）。 */
  scale?: number;
}

/** 按较短边自适应网格间距（约 8 格，取整到 50 的倍数）。 */
export function computeStep(width: number, height: number): number {
  return Math.max(100, Math.round(Math.min(width, height) / 8 / 50) * 50);
}

/**
 * 在 PNG 上叠加带刻度数字的坐标网格。纯函数，便于测试。
 * 每条竖线顶部标注其 X 值，每条横线左侧标注其 Y 值。
 * 返回新 PNG 字节、图片尺寸与所用间距（供提示词说明）。
 */
export function overlayGrid(
  buffer: Buffer,
  options: GridOptions = {},
): { data: Buffer; width: number; height: number; step: number } {
  const png = PNG.sync.read(buffer);
  const { width, height } = png;
  const step = options.step ?? computeStep(width, height);
  const scale = options.scale ?? 3;

  // 竖线 + 顶部 X 刻度
  for (let x = 0; x <= width; x += step) {
    const gx = Math.min(x, width - 1);
    for (let y = 0; y < height; y++) blendPx(png, gx, y, LINE_COLOR, LINE_ALPHA);
    drawLabel(png, String(x), gx + 3, 3, scale);
  }
  // 横线 + 左侧 Y 刻度
  for (let y = 0; y <= height; y += step) {
    const gy = Math.min(y, height - 1);
    for (let x = 0; x < width; x++) blendPx(png, x, gy, LINE_COLOR, LINE_ALPHA);
    drawLabel(png, String(y), 3, gy + 3, scale);
  }

  return { data: PNG.sync.write(png), width, height, step };
}

/** 返回叠加网格后的截图字节与所用间距（供提示词说明）。 */
export function describeGrid(width: number, height: number, step: number): string {
  return (
    `屏幕分辨率 ${width}x${height}，已叠加青色坐标网格，每格 ${step} 像素，` +
    `网格线旁的黄色数字是该处的 X 或 Y 像素值。` +
    `定位目标时，读取目标最接近的横竖刻度数字来估算像素坐标，再传给 research_tap。`
  );
}
