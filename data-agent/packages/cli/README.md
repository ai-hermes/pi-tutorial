# DataAgent CLI

基于 Pi SDK 的终端宿主。它将 Core 数据源封装为三个 Pi 自定义工具：

- `data_catalog`
- `data_profile`
- `data_query`

运行：

```bash
pnpm data-agent -- --source ./sales.csv "分析销售趋势"
pnpm data-agent -- --source ./analytics.sqlite
```

使用 `--help` 查看全部参数。当前实现为流式 REPL；后续可在复用 `createDataAgent()` 的基础上接入 Pi `InteractiveMode`。
