import {
  adbShell, adbScreencap, getForegroundComponent, getForegroundPackage, isKeyguardShowing,
} from "./adb.js";
import { dumpUi, type UiNode } from "./ui.js";

const ADB_IME = "com.android.adbkeyboard/.AdbIME";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface AndroidObservation {
  packageName: string | null;
  capturedAt: string;
  nodes: UiNode[];
  formatted: string;
  screenshot?: Buffer;
  dumpError?: string;
}

/** Reusable, model-independent Android control surface. */
export class AndroidDriver {
  async foregroundPackage(): Promise<string | null> {
    return getForegroundPackage();
  }

  foregroundComponent(): Promise<string | null> {
    return getForegroundComponent();
  }

  isLocked(): Promise<boolean> {
    return isKeyguardShowing();
  }

  async observe(options: { screenshot?: boolean } = {}): Promise<AndroidObservation> {
    const packageName = await this.foregroundPackage();
    let nodes: UiNode[] = [];
    let formatted = "";
    let dumpError: string | undefined;
    try {
      const dump = await dumpUi();
      nodes = dump.nodes;
      formatted = dump.formatted;
    } catch (error) {
      dumpError = (error as Error).message;
      formatted = `UI dump 失败: ${dumpError}`;
    }
    return {
      packageName,
      capturedAt: new Date().toISOString(),
      nodes,
      formatted,
      screenshot: options.screenshot ? await adbScreencap() : undefined,
      dumpError,
    };
  }

  screenshot(): Promise<Buffer> {
    return adbScreencap();
  }

  async tap(x: number, y: number): Promise<void> {
    await adbShell(["input", "tap", String(Math.round(x)), String(Math.round(y))]);
    await sleep(800);
  }

  async swipe(x1: number, y1: number, x2: number, y2: number, durationMs = 300): Promise<void> {
    await adbShell([
      "input", "swipe", String(Math.round(x1)), String(Math.round(y1)),
      String(Math.round(x2)), String(Math.round(y2)), String(Math.round(durationMs)),
    ]);
    await sleep(800);
  }

  async key(keycode: string): Promise<void> {
    await adbShell(["input", "keyevent", keycode]);
    await sleep(500);
  }

  async inputText(text: string): Promise<void> {
    const imeList = await adbShell(["ime", "list", "-s"]);
    if (!imeList.includes("com.android.adbkeyboard")) {
      if (!/^[\x20-\x7e]*$/.test(text)) {
        throw new Error("文本包含非 ASCII 字符，但设备未安装 ADBKeyboard。");
      }
      await adbShell(["input", "text", text.replace(/ /g, "%s")]);
      await sleep(500);
      return;
    }
    const current = (await adbShell(["settings", "get", "secure", "default_input_method"])).trim();
    if (current !== ADB_IME) {
      await adbShell(["ime", "enable", ADB_IME]);
      await adbShell(["ime", "set", ADB_IME]);
      await sleep(500);
    }
    const b64 = Buffer.from(text, "utf-8").toString("base64");
    await adbShell(["am", "broadcast", "-a", "ADB_INPUT_B64", "--es", "msg", b64]);
    await sleep(500);
  }

  async launchPackage(packageName: string): Promise<void> {
    const out = await adbShell(["monkey", "-p", packageName, "-c", "android.intent.category.LAUNCHER", "1"]);
    if (out.includes("No activities found")) throw new Error(`设备上没有找到包 ${packageName}`);
    await sleep(2_000);
  }

  /** Deep-link directly to WeChat public search so private chat lists are never captured. */
  async launchWeChatPublicSearch(): Promise<void> {
    const out = await adbShell(["am", "start", "-n", "com.tencent.mm/.plugin.websearch.ui.FTSMainUI"]);
    if (/Error|Exception|Permission Denial|does not exist/i.test(out)) {
      throw new Error("无法直接打开微信搜一搜；请手动进入微信“发现 → 搜一搜”后继续");
    }
    await sleep(1_500);
    const component = await this.foregroundComponent();
    if (!isWeChatPublicSearchComponent(component)) {
      throw new Error("微信未进入公开搜一搜页面；请手动进入“发现 → 搜一搜”后继续");
    }
  }

  async listPackages(keyword: string): Promise<string[]> {
    const out = await adbShell(["pm", "list", "packages"]);
    return out.split("\n").map((line) => line.replace("package:", "").trim())
      .filter((pkg) => pkg.toLowerCase().includes(keyword.toLowerCase())).slice(0, 50);
  }
}

export const androidDriver = new AndroidDriver();

export function isWeChatPublicComponent(component: string | null): boolean {
  return Boolean(component && /^com\.tencent\.mm\/(?:com\.tencent\.mm\.)?\.?plugin\.(?:websearch|brandservice|webview)\./.test(component));
}

export function isWeChatPublicSearchComponent(component: string | null): boolean {
  return Boolean(component && /^com\.tencent\.mm\/(?:com\.tencent\.mm\.)?\.?plugin\.websearch\./.test(component));
}
