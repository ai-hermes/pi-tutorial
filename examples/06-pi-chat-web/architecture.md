# Pi Chat Web 系统架构

配套交互图：`architecture.html`。图中的步骤来自当前实现，而不是目标态设计。

## 系统边界

Pi Chat Web 是仅监听本机回环地址的 Agent 工作台。它将 React 界面、Hono REST/SSE、Pi `AgentSessionRuntime`、模型供应商、本机工具和本地持久化串在一起。

安全边界需要特别注意：每个根会话有独立 workspace，但 `bash` 仍以服务进程的系统权限运行，可通过绝对路径访问 workspace 之外的位置。因此这是可信本机工具，不是 OS 级沙箱，也不应直接暴露到公网。

## 组件

| 组件 | 实现 | 职责 |
|---|---|---|
| 本地用户 | 浏览器 | 管理会话、发送消息、查看工具执行与上下文状态 |
| React 工作台 | React 19、Vite、Tailwind CSS v4 | optimistic message、快照状态、SSE reducer、聊天与 Harness UI |
| Hono API | Hono、`@hono/node-server` | REST 路由、SSE、错误映射，以及生产环境静态文件托管 |
| `ConversationService` | `server/conversations.ts` | 会话 CRUD、runtime 生命周期、分支、压缩、模型和工具设置 |
| `EventBuffer` / SSE | `server/events.ts` | 单调事件 ID、最近 1000 条缓冲、游标重放、订阅和 15 秒心跳 |
| `AgentSessionRuntime` | `@earendil-works/pi-coding-agent` | prompt、steer、follow-up、工具循环、compaction、fork、统计 |
| 模型供应商 | `ModelRuntime` | 发现已认证模型并执行流式模型调用 |
| Pi 工具执行层 | 内置工具与 `pi-web-access` | `read`、`bash`、`edit`、`write`、检索和网页访问 |
| 本地数据与 Workspace | `~/.pi/agent/web-chat` | records、session JSONL、workspace、附件、导出和工具设置 |

## 部署模式

### 开发模式

- 浏览器访问 `http://127.0.0.1:4327`。
- Vite 提供 React HMR，并把 `/api` 代理到 `http://127.0.0.1:4328`。
- Hono API 独立监听 `127.0.0.1:4328`。

### 生产模式

- `vite build` 生成 `dist/`。
- Hono 在 `127.0.0.1:4328` 同时提供 `dist/` 静态文件、REST 和 SSE。
- 前端与 API 同源，不经过 Vite 代理。

## 核心流程

### 1. 启动与恢复

1. 浏览器加载 React 工作台。
2. 前端并行请求 `/api/bootstrap` 和 `/api/conversations`。
3. 服务从 `ModelRuntime` 获取已配置模型，并读取 conversation records。
4. 打开已有会话时，`ensureRuntime()` 按需创建 runtime。
5. `SessionManager.open()` 从 JSONL 恢复当前分支。
6. `projectTranscript()` 将分支投影为消息、thinking、工具和活动。
7. 前端接收权威快照，再用 `streamId` 与 `lastEventId` 建立 SSE。

### 2. 聊天与工具执行

1. 前端通过 multipart 提交文本和附件，并先加入 optimistic 用户消息。
2. 服务校验附件；文件保存到 workspace 的 `.pi-chat-attachments/`。
3. 空闲 runtime 调用 `session.prompt()`；忙碌 runtime 转入 steer 或 follow-up。
4. Runtime 调用模型。模型可返回文本增量或工具调用。
5. 工具在本机执行并读写 workspace，结果追加到 Pi session。
6. Agent 原生事件被映射为 `message.*`、`tool.*` 和 `runtime.*`。
7. EventBuffer 经 SSE 推送事件；前端 reducer 更新聊天、工具卡片和活动时间线。

模型与工具之间可以循环多次，直到 `agent_settled`。

### 3. Steer 与 Follow-up

- `steer`：在当前 Agent turn 中改变执行方向。
- `followUp`：等待当前 turn 结束后继续。
- 两者都使用 `POST /api/conversations/:id/messages`，由 `behavior` 区分。
- Runtime 通过 `queue_update` 发布完整队列，前端无需轮询。
- 每个会话可以选择 `all` 或 `one-at-a-time` 消费策略。

### 4. 历史分支

1. 用户编辑一条历史消息。
2. 服务要求当前 runtime 空闲，然后在目标 entry 之前 fork。
3. 新分支得到独立 session ID、JSONL 和 conversation record。
4. 新 record 保存 `parentId`，但继续使用源会话的 workspace。
5. 编辑后的消息自动发送，新分支开始独立推理和事件流。

这意味着历史是隔离的，但文件系统状态在同一个会话族内共享。

### 5. 压缩与冷恢复

1. `session.compact()` 将较早上下文汇总为 compaction entry，并写入 session JSONL。
2. 默认空闲 300000 ms 后，runtime 被 dispose，conversation 状态变为 `cold`。
3. records、sessions、workspace 和附件不会被删除。
4. 下次打开时，服务从 record 定位 JSONL，重新创建 `SessionManager` 和 runtime。
5. 前端收到新的快照和 `streamId`，随后继续原会话。

## 数据目录

```text
~/.pi/agent/web-chat/
├── app-settings.json       # 全局工具开关
├── records/                # 会话元数据
├── sessions/               # Pi session JSONL
├── workspaces/             # 根会话工作区；分支共享
└── exports/                # 临时 HTML 导出
```

## 关键恢复机制

- SSE 保留最近 1000 条事件，并使用 `after` 游标重放。
- 如果 `streamId` 改变或游标过旧，服务发送 `snapshot.required`。
- `runtime.settled` 也触发前端重新拉取快照，保证统计与持久化投影一致。
- record 中的 session 路径失效时，服务会按 conversation ID 后缀查找最新 JSONL。

## 建议讲解顺序

1. 先切换开发/生产模式，说明 Vite 代理与 Hono 同源托管的区别。
2. 播放“启动与恢复”，建立 snapshot + SSE 的整体心智模型。
3. 播放“聊天与工具”，重点讲模型—工具循环和本机权限边界。
4. 播放“Steer / 排队”，解释单 active turn 与队列语义。
5. 用“历史分支”说明独立 session 与共享 workspace。
6. 最后用“压缩与冷恢复”说明持久化、内存释放和重启恢复。
