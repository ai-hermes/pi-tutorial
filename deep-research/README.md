# Deep Research

基于 Pi + Android ADB 的证据驱动移动端研究 Agent。它在真实客户端中只读搜索公开内容，保存原始证据与结构化记录，再生成带本地引用的中文研究报告。

当前支持：

- 小红书：公开搜索、笔记正文、图文关键帧与公开评论。
- 抖音：公开搜索、视频字幕/关键帧与公开评论。
- 微信：仅“发现 → 搜一搜”和公众号公开文章；不会读取聊天、联系人或其他私域内容。

## 安装

要求 Node.js 22.19+、Android platform-tools、已开启 USB 调试的 Android 真机，以及用于中文输入的 ADBKeyboard。

```bash
cd pi/deep-research
pnpm install
cp .env.example .env   # 按需配置；Pi 已有全局模型时可以不创建
```

研究截图默认不能发送给云端 provider。使用 Pi 全局 Kimi 等远程模型时，需明确设置：

```bash
export ANDROID_RESEARCH_ALLOW_CLOUD=1
```

## 运行

```bash
# 默认研究三个平台
pnpm research -- --question "年轻消费者购买便携咖啡机时最在意什么"

# 单平台、小预算任务
pnpm research -- --question "用户用 Agent 写 PPT 的需求场景" \
  --platform xiaohongshu \
  --candidate-limit 6 --detail-limit 2 --comment-limit 6

# 从 SQLite 检查点恢复
pnpm research -- --resume <run-id>
```

可选参数：`--since`、`--context`、`--platform`、`--candidate-limit`、`--detail-limit`、`--comment-limit`、`--yes`。

## 产物

每个任务保存在 `.deep-research/runs/<run-id>/`：

- `research.sqlite`：计划、查询、候选、正文、评论、洞见、检查点与错误。
- `evidence/`：原始截图、关键帧和 UI dump。
- `report.md`：带证据链接的最终报告。
- `export.jsonl`：可供其他分析系统消费的标准化记录。

## 安全边界

- 仅允许公开内容只读采集，不点赞、关注、收藏、评论、私信、分享、购买或支付。
- 登录、验证码、风控和无法可靠识别的页面会暂停等待人工处理，不绕过平台保护。
- 每个导航阶段都有观察、点击、滑动和关键帧硬预算，防止页面循环。
- 微信进入公开搜一搜前不会截图，避免私域页面进入模型上下文。

## 开发验证

```bash
pnpm typecheck
pnpm test
```

项目自带 SQLite/报告、去重、饱和停止、安全策略、三平台脱敏回放以及 fake ADB 测试。
