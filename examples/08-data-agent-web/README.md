# DataAgent Web

基于 Pi SDK 与 DataAgent Core 的本地 Web 示例。它使用 React、Tailwind CSS 与 shadcn/ui，提供浏览器文件上传、实时 Agent 事件、只读 SQL 证据、受限图表和指标贡献归因。

## 启动

在仓库根目录执行：

```bash
pnpm install
cp .env.example .env
pnpm example:data-agent-web
```

打开 `http://127.0.0.1:4317`。API 监听 `http://127.0.0.1:4318`，Vite 会代理 `/api` 请求。

可通过环境变量指定模型：

```bash
DATA_AGENT_MODEL=anthropic/claude-sonnet-4-5 pnpm example:data-agent-web
```

## 数据与安全边界

- 支持 `.db`、`.sqlite`、`.sqlite3`、`.csv`、`.tsv`、`.json`、`.jsonl`、`.ndjson`。
- 单文件最大 25 MB，服务同时维护一个工作区。
- SQLite 以只读模式打开；文本数据加载到内存 SQLite。
- 查询继续经过 Core 的单条只读 SQL 安全门，默认最多返回 200 行。
- 上传内容写入随机临时目录，替换数据集或关闭服务时删除。
- 服务只监听 `127.0.0.1`，不提供公网认证能力。

## 事件与证据

`GET /api/workspace/events` 使用 SSE 推送消息增量、工具生命周期、重试、压缩、查询结果、图表与归因产物。服务保留最近 1,000 条事件，客户端使用事件 ID 恢复连接；游标过期时重新获取工作区快照。

每个图表必须引用 `data_query` 返回的 `resultId`。图表工具只允许四种 mark 和字段编码，不接受 URL、表达式或任意 transform，浏览器通过 shadcn Chart/Recharts 渲染。

`data_attribute` 只能使用未截断、每个维度唯一且包含有限基期/当期数值的查询结果。贡献值由服务端确定性计算，属于描述性分解，不代表因果关系。Agent 的定量结论通过 `[[evidence:<artifactId>]]` 绑定到查询、图表或归因证据。

## 验证

```bash
pnpm example:data-agent-web:test
pnpm example:data-agent-web:build
pnpm data-agent:test
pnpm data-agent:typecheck
```
