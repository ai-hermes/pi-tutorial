# Pi SDK 案例与 DataAgent（进行中）

这个目录用于三件事：

1. 通过渐进式案例学习 Pi SDK。
2. 基于同一套能力落地 DataAgent（Core、CLI 与本地 Web 示例均可运行）。
3. 通过独立的 `deep-research/` 项目运行 Pi + Android 证据驱动研究 Agent。

## 当前可运行内容（模块 0）

- `examples/00-quickstart/00-minimal-agent.ts`
- `examples/00-quickstart/01-model-runtime.ts`
- `examples/00-quickstart/02-custom-provider.ts`

另外已提供模块 1-5 的首批可运行案例，见 `examples/README.md`。

## 运行

```bash
cd pi
pnpm install
pnpm example:minimal
pnpm example:model-runtime
PI_CUSTOM_PROVIDER=my-provider PI_CUSTOM_MODEL=my-model pnpm example:custom-provider
pnpm example:loop
pnpm example:readonly-tools
pnpm example:custom-tool
pnpm example:context
pnpm example:sessions
pnpm example:extension
pnpm example:image-input -- ./path/to/image.png
```

运行 DataAgent：

```bash
pnpm data-agent -- --source ./sales.csv "各区域销售额是多少？"
pnpm data-agent -- --source ./analytics.sqlite
pnpm data-agent:test

# 启动 API 与 Vite Web 界面
pnpm example:data-agent-web

# 启动 ChatGPT 风格的 Pi Harness 展示台
pnpm example:pi-chat-web
```

移动端深度研究请进入独立项目：

```bash
cd deep-research
pnpm install
pnpm research -- --question "用户用 Agent 写 PPT 的需求场景" --platform xiaohongshu
```

## 环境变量

复制 `.env.example` 为 `.env`，按需配置 API keys 与模型名称。不要在源码中写入密钥。

## 目录约定

- `examples/`：模块化教学案例（0-9）
- `examples/08-bonus-bicycle-kick/`：个人照片生成原创倒挂金钩视频的彩蛋课
- `deep-research/`：独立的移动端证据驱动深度研究项目
- `data-agent/packages/core`：宿主无关核心能力（本地数据源、只读 SQL、Catalog/Profile/Query）
- `data-agent/packages/cli`：基于 Pi 自定义工具的流式 CLI 宿主
- `examples/07-data-agent-web`：可运行的本地 REST/SSE + React/Vite 可视化示例
- `examples/09-pi-chat-web`：Pi session/runtime/tool harness 的 ChatGPT 风格 Web 展示台
- `data-agent/packages/server`、`data-agent/packages/web`：后续产品化宿主的保留目录
