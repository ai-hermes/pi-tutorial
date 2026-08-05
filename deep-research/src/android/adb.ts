/**
 * adb 命令封装。
 * - 通过 ANDROID_SERIAL 环境变量支持多设备。
 * - 所有调用走 execFile，避免 shell 注入。
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function adbPath(): string {
  return process.env.ADB_PATH?.trim() || "adb";
}

function baseArgs(): string[] {
  const serial = process.env.ANDROID_SERIAL?.trim();
  return serial ? ["-s", serial] : [];
}

export async function adb(args: string[], options: { timeoutMs?: number } = {}): Promise<string> {
  const { stdout } = await execFileAsync(adbPath(), [...baseArgs(), ...args], {
    timeout: options.timeoutMs ?? 30_000,
    maxBuffer: 32 * 1024 * 1024,
  });
  return stdout;
}

export async function adbShell(command: string[], options: { timeoutMs?: number } = {}): Promise<string> {
  return adb(["shell", ...command], options);
}

/** screencap 输出 PNG 二进制。 */
export async function adbScreencap(): Promise<Buffer> {
  const { stdout } = await execFileAsync(adbPath(), [...baseArgs(), "exec-out", "screencap", "-p"], {
    timeout: 30_000,
    maxBuffer: 64 * 1024 * 1024,
    encoding: "buffer",
  });
  return stdout;
}

/** 获取当前前台应用包名（读 dumpsys window / activity 的焦点信息）。取不到返回 null。 */
export async function getForegroundPackage(): Promise<string | null> {
  const component = await getForegroundComponent();
  return component?.split("/")[0] ?? null;
}

/** 获取当前前台组件，形如 package/activity。 */
export async function getForegroundComponent(): Promise<string | null> {
  try {
    const out = await adbShell(["dumpsys", "window"], { timeoutMs: 10_000 });
    // 匹配 mCurrentFocus / mFocusedApp 里的 包名/Activity
    const m =
      out.match(/mCurrentFocus=.*?\s([a-zA-Z][\w.]+)\/([\w.$]+)/) ||
      out.match(/mFocusedApp=.*?\s([a-zA-Z][\w.]+)\/([\w.$]+)/);
    if (m) return `${m[1]}/${m[2]}`;
  } catch {
    // 忽略，回退下面的 activity 查询
  }
  try {
    const out = await adbShell(["dumpsys", "activity", "activities"], { timeoutMs: 10_000 });
    const m = out.match(/mResumedActivity.*?\s([a-zA-Z][\w.]+)\/([\w.$]+)/);
    if (m) return `${m[1]}/${m[2]}`;
  } catch {
    // 忽略
  }
  return null;
}

/** 查询系统锁屏是否仍覆盖屏幕，避免把锁屏内容截图交给模型。 */
export async function isKeyguardShowing(): Promise<boolean> {
  try {
    const out = await adbShell(["dumpsys", "window", "policy"], { timeoutMs: 10_000 });
    return /(?:showing|mIsShowing)=true/.test(out) && !/mKeyguardOccluded=true/.test(out);
  } catch {
    return false;
  }
}

export interface DeviceInfo {
  serial: string;
  state: string;
}

export async function listDevices(): Promise<DeviceInfo[]> {
  const { stdout } = await execFileAsync(adbPath(), ["devices"], { timeout: 15_000 });
  return stdout
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial, state] = line.split(/\s+/);
      return { serial, state };
    });
}

/** 确认至少有一台在线设备，否则抛出可读错误。 */
export async function ensureDevice(): Promise<DeviceInfo> {
  let devices: DeviceInfo[];
  try {
    devices = await listDevices();
  } catch (error) {
    throw new Error(
      `无法执行 adb（${adbPath()}）。请安装 Android platform-tools 并确保 adb 在 PATH 中，或设置 ADB_PATH。原始错误: ${(error as Error).message}`,
    );
  }
  const online = devices.filter((d) => d.state === "device");
  if (online.length === 0) {
    throw new Error("没有在线的安卓设备。请连接手机并开启 USB 调试（adb devices 应显示 device 状态）。");
  }
  const serial = process.env.ANDROID_SERIAL?.trim();
  if (serial) {
    const matched = online.find((d) => d.serial === serial);
    if (!matched) {
      throw new Error(`ANDROID_SERIAL=${serial} 不在线。在线设备: ${online.map((d) => d.serial).join(", ")}`);
    }
    return matched;
  }
  if (online.length > 1) {
    throw new Error(
      `检测到多台设备: ${online.map((d) => d.serial).join(", ")}。请设置 ANDROID_SERIAL 指定其中一台。`,
    );
  }
  return online[0];
}
