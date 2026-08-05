# DataAgent

一个基于 [Pi SDK](https://pi.dev) 的只读数据分析 Agent。目前已完成可运行的 **Core + CLI MVP**，并在 `examples/07-data-agent-web` 提供本地 Web MVP；Server/Web 目录保留为后续产品化宿主。

## 已实现

- SQLite、CSV、TSV、JSON、JSONL/NDJSON 数据源
- 统一 Catalog、Schema、Profile、Query 返回结构
- 只允许单条 `SELECT` / `WITH` / `EXPLAIN` 的 SQL 安全门
- 查询最大返回行数和截断标记
- Pi 自定义工具：`data_catalog`、`data_profile`、`data_query`
- 证据优先的 DataAgent system prompt
- 单次提问和连续对话 CLI
- 浏览器上传、SSE 流式对话、查询证据和受限 Vega-Lite 图表
- Core 单元测试

CSV/JSON 等文件会被加载到内存 SQLite，并暴露为名为 `data` 的表。SQLite 文件以只读模式打开，源文件不会被修改。

## 快速开始

在仓库根目录运行：

```bash
pnpm install
cp .env.example .env # 按需填写模型凭据

pnpm data-agent -- --source ./sales.csv "各区域的销售额和占比是多少？"
```

进入连续对话：

```bash
pnpm data-agent -- --source ./analytics.sqlite
```

指定模型和最大返回行数：

```bash
pnpm data-agent -- \
  --source ./analytics.sqlite \
  --model anthropic/claude-sonnet-4-5 \
  --max-rows 500
```

也可以设置：

```bash
export DATA_AGENT_MODEL=anthropic/claude-sonnet-4-5
```

未指定模型时，Pi `ModelRuntime` 会使用 Pi 已保存的凭据、全局设置或可用模型。

## 验证

```bash
pnpm data-agent:test
pnpm data-agent:typecheck
pnpm example:data-agent-web:test
pnpm example:data-agent-web:build
```

## 目录

- `packages/core`：数据源、类型、只读 SQL 策略、Profile/Query
- `packages/cli`：Pi Agent 组装和终端交互
- `packages/server`：计划中的本地 REST + SSE 宿主
- `packages/web`：计划中的 React/Vite 可视化界面

## 当前边界

- 当前仅连接一个本地数据源。
- Profile 会扫描关系及各列，超大表上应谨慎使用。
- 当前 CLI 是流式 REPL，尚未接入 Pi 完整 `InteractiveMode` TUI。
- Web 示例为单工作区临时会话；持久化、报告导出和多数据源联邦查询尚未实现。
