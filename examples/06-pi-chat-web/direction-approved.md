# Pi Chat Web 设计方向确认

## 已展示方向

- Dark Editorial
  - 原型：`design-demos/dark-editorial.html`
  - 截图：`design-demos/dark-editorial-desktop.png`、`design-demos/dark-editorial-mobile.png`
- Warp Blocks
  - 原型：`design-demos/warp-blocks.html`
  - 截图：`design-demos/warp-blocks-desktop.png`、`design-demos/warp-blocks-mobile.png`
- Rams Instrument Panel
  - 原型：`design-demos/rams-instrument-panel.html`
  - 截图：`design-demos/rams-instrument-panel-desktop.png`、`design-demos/rams-instrument-panel-mobile.png`

## 用户选择

用户原话（2026-08-01）：**「方案B」**。

## 执行解释

正式界面采用 Warp Blocks 方向：会话仍是叙事主线，但连续工具调用合并为一个 Run Group；每个命令与输出形成可独立展开的 Block，顶部控制收纳为安静的工作台状态区，移动端隐藏历史库和次要模型控制，通过抽屉/面板按需打开。保留现有 REST/SSE、共享类型和所有产品能力。

## 后续迭代

- 2026-08-01：用户提供 Codex 输入工作台参考图，要求权限、模型与思考深度参考其实现。本次属于已选 Warp Blocks 方向内的控制区迭代：权限入口移至附件按钮旁，模型与思考深度合并到发送按钮前；顶部仅保留连接状态、Harness 与主题。
