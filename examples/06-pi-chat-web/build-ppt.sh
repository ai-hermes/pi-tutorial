#!/usr/bin/env bash
set -euo pipefail

FILE="/Users/aholic/workspace/opensource/pi-tutorial/examples/06-pi-chat-web/Pi-Chat-Web-项目介绍.pptx"

officecli create "$FILE"
officecli open "$FILE"
officecli set "$FILE" / --prop defaultFont=Arial

# Slide 1 — Cover
officecli add "$FILE" / --type slide --prop layout=blank --prop background=20231F
officecli batch "$FILE" <<'JSON'
[
  {"command":"add","parent":"/slide[1]","type":"shape","props":{"name":"TopBand","fill":"276C4C","line":"none","x":"0cm","y":"0cm","width":"33.87cm","height":"0.45cm"}},
  {"command":"add","parent":"/slide[1]","type":"shape","props":{"name":"PiMark","preset":"ellipse","fill":"DCEBE2","line":"none","x":"2cm","y":"3cm","width":"4.2cm","height":"4.2cm","text":"π","font":"Arial","size":"58","bold":"true","color":"276C4C","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[1]","type":"shape","props":{"name":"Eyebrow","text":"06 · PI TUTORIAL / WEB AGENT WORKBENCH","font":"Consolas","size":"14","bold":"true","color":"70D3A3","x":"7.2cm","y":"3.1cm","width":"23.8cm","height":"1cm"}},
  {"command":"add","parent":"/slide[1]","type":"shape","props":{"name":"Title","text":"Pi Chat Web","font":"Arial","size":"48","bold":"true","color":"FFFFFF","x":"7.2cm","y":"4.2cm","width":"23.8cm","height":"2.7cm"}},
  {"command":"add","parent":"/slide[1]","type":"shape","props":{"name":"Subtitle","text":"把 Agent Harness 带到 Web","font":"Arial","size":"26","bold":"true","color":"DCEBE2","x":"7.2cm","y":"7.2cm","width":"23.8cm","height":"1.6cm"}},
  {"command":"add","parent":"/slide[1]","type":"shape","props":{"name":"Descriptor","text":"本地可信工作区 · 持久会话 · 实时工具执行 · 上下文检查","font":"Arial","size":"18","color":"B8C2BA","x":"7.2cm","y":"9.2cm","width":"23.8cm","height":"1.3cm"}},
  {"command":"add","parent":"/slide[1]","type":"shape","props":{"name":"Meta","fill":"2A302B","line":"3A413B:1","x":"2cm","y":"14.7cm","width":"29.87cm","height":"2.3cm"}},
  {"command":"add","parent":"/slide[1]","type":"shape","props":{"text":"PROJECT PRESENTATION","font":"Consolas","size":"14","bold":"true","color":"70D3A3","x":"2.6cm","y":"15.25cm","width":"8cm","height":"0.9cm"}},
  {"command":"add","parent":"/slide[1]","type":"shape","props":{"text":"pi-tutorial / examples / 06-pi-chat-web","font":"Consolas","size":"14","color":"DCEBE2","x":"10.4cm","y":"15.25cm","width":"14.5cm","height":"0.9cm","align":"center"}},
  {"command":"add","parent":"/slide[1]","type":"shape","props":{"text":"2026-08-18","font":"Consolas","size":"14","color":"DCEBE2","x":"25.2cm","y":"15.25cm","width":"5.8cm","height":"0.9cm","align":"right"}},
  {"command":"add","parent":"/slide[1]","type":"notes","props":{"text":"开场说明：这不是一个普通聊天框，而是把 Pi 的 Agent harness 能力完整搬到本地 Web 工作台。强调项目用于可信本机环境的产品演示与日常开发。"}}
]
JSON
officecli get "$FILE" "/slide[1]" --depth 1 >/dev/null

# Slide 2 — Product positioning
officecli add "$FILE" / --type slide --prop layout=blank --prop background=F4F5F2
officecli batch "$FILE" <<'JSON'
[
  {"command":"add","parent":"/slide[2]","type":"shape","props":{"preset":"ellipse","fill":"276C4C","line":"none","x":"1.4cm","y":"0.85cm","width":"1.8cm","height":"1.8cm","text":"01","font":"Consolas","size":"12","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[2]","type":"shape","props":{"text":"从聊天界面升级为 Agent 工作台","font":"Arial","size":"38","bold":"true","color":"20231F","x":"3cm","y":"0.85cm","width":"28.5cm","height":"2.1cm"}},
  {"command":"add","parent":"/slide[2]","type":"shape","props":{"preset":"roundRect","fill":"E9ECE7","line":"DADDD7:1","x":"1.5cm","y":"4cm","width":"12.2cm","height":"11.5cm"}},
  {"command":"add","parent":"/slide[2]","type":"shape","props":{"text":"普通聊天界面","font":"Arial","size":"24","bold":"true","color":"687069","x":"2.3cm","y":"4.7cm","width":"10.6cm","height":"1.3cm","align":"center"}},
  {"command":"add","parent":"/slide[2]","type":"shape","props":{"preset":"roundRect","fill":"FCFDFB","line":"DADDD7:1","x":"2.4cm","y":"6.6cm","width":"8.6cm","height":"1.7cm","text":"用户消息","font":"Arial","size":"18","color":"4B514C","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[2]","type":"shape","props":{"preset":"roundRect","fill":"FCFDFB","line":"DADDD7:1","x":"4.1cm","y":"9cm","width":"8.6cm","height":"2.2cm","text":"模型回复","font":"Arial","size":"18","color":"4B514C","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[2]","type":"shape","props":{"text":"对话可见，执行过程不可见","font":"Arial","size":"18","color":"687069","x":"2.3cm","y":"13.1cm","width":"10.6cm","height":"1.2cm","align":"center"}},
  {"command":"add","parent":"/slide[2]","type":"shape","props":{"preset":"rightArrow","fill":"B7791F","line":"none","x":"14.6cm","y":"8.6cm","width":"3.4cm","height":"2.2cm"}},
  {"command":"add","parent":"/slide[2]","type":"shape","props":{"preset":"roundRect","fill":"20231F","line":"none","x":"18.9cm","y":"4cm","width":"13.47cm","height":"11.5cm"}},
  {"command":"add","parent":"/slide[2]","type":"shape","props":{"text":"Pi Chat Web","font":"Arial","size":"24","bold":"true","color":"FFFFFF","x":"19.8cm","y":"4.7cm","width":"11.7cm","height":"1.3cm","align":"center"}},
  {"command":"add","parent":"/slide[2]","type":"shape","props":{"fill":"276C4C","line":"none","x":"20.1cm","y":"6.7cm","width":"11.1cm","height":"1.8cm","text":"任务对话","font":"Arial","size":"20","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[2]","type":"shape","props":{"fill":"2F3932","line":"none","x":"20.1cm","y":"9cm","width":"11.1cm","height":"1.8cm","text":"工具执行与队列","font":"Arial","size":"20","bold":"true","color":"DCEBE2","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[2]","type":"shape","props":{"fill":"2F3932","line":"none","x":"20.1cm","y":"11.3cm","width":"11.1cm","height":"1.8cm","text":"上下文与运行状态","font":"Arial","size":"20","bold":"true","color":"DCEBE2","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[2]","type":"shape","props":{"text":"会话、执行、状态在同一工作台闭环","font":"Arial","size":"18","color":"B8C2BA","x":"19.8cm","y":"13.6cm","width":"11.7cm","height":"1.2cm","align":"center"}},
  {"command":"add","parent":"/slide[2]","type":"notes","props":{"text":"先建立定位差异：普通聊天产品只展示输入和输出；Pi Chat Web 把任务对话、工具执行、消息队列和上下文状态放在同一个产品界面中。"}}
]
JSON
officecli get "$FILE" "/slide[2]" --depth 1 >/dev/null

# Slide 3 — UI anatomy
officecli add "$FILE" / --type slide --prop layout=blank --prop background=F4F5F2
officecli batch "$FILE" <<'JSON'
[
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"preset":"ellipse","fill":"276C4C","line":"none","x":"1.4cm","y":"0.85cm","width":"1.8cm","height":"1.8cm","text":"02","font":"Consolas","size":"12","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"text":"界面把会话主线与执行细节同时呈现","font":"Arial","size":"38","bold":"true","color":"20231F","x":"3cm","y":"0.85cm","width":"28.5cm","height":"2.1cm"}},
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"fill":"20231F","line":"none","x":"1.5cm","y":"3.5cm","width":"30.87cm","height":"13.8cm"}},
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"fill":"ECEFE9","line":"none","x":"1.8cm","y":"3.8cm","width":"5.7cm","height":"13.2cm"}},
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"text":"PI CHAT","font":"Consolas","size":"16","bold":"true","color":"276C4C","x":"2.3cm","y":"4.3cm","width":"4.7cm","height":"0.9cm"}},
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"fill":"DCEBE2","line":"none","x":"2.2cm","y":"5.6cm","width":"4.9cm","height":"1.4cm","text":"当前会话","font":"Arial","size":"18","bold":"true","color":"276C4C","valign":"middle","margin":"0.25cm"}},
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"text":"历史会话\n分支会话\n导入 Session","font":"Arial","size":"16","color":"687069","x":"2.3cm","y":"7.6cm","width":"4.6cm","height":"4cm","lineSpacing":"1.35x"}},
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"fill":"FCFDFB","line":"none","x":"7.7cm","y":"3.8cm","width":"16.1cm","height":"13.2cm"}},
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"fill":"E9ECE7","line":"none","x":"7.7cm","y":"3.8cm","width":"16.1cm","height":"1.4cm","text":"workspace / local        Live · Harness","font":"Consolas","size":"13","color":"4B514C","valign":"middle","margin":"0.35cm"}},
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"preset":"roundRect","fill":"E9ECE7","line":"none","x":"14cm","y":"5.8cm","width":"8.8cm","height":"1.6cm","text":"请创建一个小型项目","font":"Arial","size":"16","color":"20231F","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"text":"Pi 正在分析并执行任务…","font":"Arial","size":"17","bold":"true","color":"20231F","x":"8.6cm","y":"8cm","width":"10cm","height":"1cm"}},
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"fill":"FBFCFA","line":"D9DDD8:1","x":"8.6cm","y":"9.3cm","width":"14.3cm","height":"4cm"}},
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"fill":"DCEBE2","line":"none","x":"8.9cm","y":"9.65cm","width":"2cm","height":"0.85cm","text":"RUN 01","font":"Consolas","size":"12","bold":"true","color":"276C4C","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"text":"bash   ✓ 安装依赖\nedit   ✓ 更新 App.tsx\nbash   ✓ 运行测试","font":"Consolas","size":"14","color":"4B514C","x":"9cm","y":"10.8cm","width":"12.8cm","height":"2.45cm","lineSpacing":"1.2x"}},
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"preset":"roundRect","fill":"FFFFFF","line":"DADDD7:1","x":"8.6cm","y":"14.3cm","width":"14.3cm","height":"1.8cm","text":"输入消息 · 附件 · 模型 · Thinking · 发送","font":"Arial","size":"15","color":"687069","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"fill":"F0F2EE","line":"none","x":"24cm","y":"3.8cm","width":"8.07cm","height":"13.2cm"}},
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"text":"HARNESS 检查器","font":"Consolas","size":"15","bold":"true","color":"276C4C","x":"24.7cm","y":"4.4cm","width":"6.7cm","height":"0.9cm"}},
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"text":"活动\n工具与队列时间线","font":"Arial","size":"17","bold":"true","color":"20231F","x":"24.7cm","y":"6.1cm","width":"6.4cm","height":"1.8cm"}},
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"text":"上下文\nToken · 费用 · 压缩","font":"Arial","size":"17","bold":"true","color":"20231F","x":"24.7cm","y":"9cm","width":"6.4cm","height":"2.5cm"}},
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"text":"设置\n自动重试 · 队列消费","font":"Arial","size":"17","bold":"true","color":"20231F","x":"24.7cm","y":"11.9cm","width":"6.4cm","height":"1.8cm"}},
  {"command":"add","parent":"/slide[3]","type":"shape","props":{"fill":"FFF3D8","line":"B7791F:1","x":"24.6cm","y":"14.7cm","width":"6.8cm","height":"1.6cm","text":"本机可信环境","font":"Arial","size":"16","bold":"true","color":"7A4E11","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[3]","type":"notes","props":{"text":"这一页按实际组件结构还原界面：左侧会话库，中间聊天时间线与 Warp Blocks 风格 Run Group，底部输入区，右侧 Harness 检查器。强调所有区域都围绕当前 Pi session。"}}
]
JSON
officecli get "$FILE" "/slide[3]" --depth 1 >/dev/null

# Slide 4 — Event model
officecli add "$FILE" / --type slide --prop layout=blank --prop background=F4F5F2
officecli batch "$FILE" <<'JSON'
[
  {"command":"add","parent":"/slide[4]","type":"shape","props":{"preset":"ellipse","fill":"276C4C","line":"none","x":"1.4cm","y":"0.85cm","width":"1.8cm","height":"1.8cm","text":"03","font":"Consolas","size":"12","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[4]","type":"shape","props":{"text":"Agent 事件如何变成前端状态","font":"Arial","size":"38","bold":"true","color":"20231F","x":"3cm","y":"0.85cm","width":"28.5cm","height":"2.1cm"}},
  {"command":"add","parent":"/slide[4]","type":"shape","props":{"fill":"FFF3D8","line":"B7791F","lineWidth":"1pt","x":"2cm","y":"3.3cm","width":"29.87cm","height":"1.25cm","text":"同一动作经过两套事件模型：内部事件不会直接暴露给前端","font":"Arial","size":"18","bold":"true","color":"7A4E11","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[4]","type":"shape","props":{"name":"EventInternal","preset":"roundRect","fill":"20231F","line":"none","x":"1.5cm","y":"5.6cm","width":"7.4cm","height":"4.5cm","text":"AgentSessionEvent\nPi Runtime 内部\nagent / entry / tool / queue","font":"Arial","size":"18","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[4]","type":"shape","props":{"name":"EventMapper","preset":"roundRect","fill":"276C4C","line":"none","x":"9.4cm","y":"5.6cm","width":"5.8cm","height":"4.5cm","text":"onEvent()\n语义映射\n→ StreamEvent","font":"Arial","size":"18","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[4]","type":"shape","props":{"name":"EventBuffer","preset":"roundRect","fill":"DCEBE2","line":"none","x":"15.7cm","y":"5.6cm","width":"7.3cm","height":"4.5cm","text":"EventBuffer\nStreamEvent\nid · streamId · type · payload","font":"Arial","size":"18","bold":"true","color":"276C4C","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[4]","type":"shape","props":{"name":"EventReducer","preset":"roundRect","fill":"20231F","line":"none","x":"23.5cm","y":"5.6cm","width":"8.87cm","height":"4.5cm","text":"SSE + snapshotReducer\nreplay / subscribe\n按事件更新前端状态","font":"Arial","size":"18","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[4]","type":"shape","props":{"name":"EventSnapshot","fill":"E9ECE7","line":"DADDD7","lineWidth":"1pt","x":"5cm","y":"12.4cm","width":"23.87cm","height":"3.15cm","text":"ConversationSnapshot\nmessages · tools · queue · status · activity · stream.lastEventId","font":"Arial","size":"20","bold":"true","color":"20231F","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[4]","type":"connector","props":{"from":"/slide[4]/shape[@name=EventInternal]","to":"/slide[4]/shape[@name=EventMapper]","shape":"straight","color":"687069","lineWidth":"1.5pt","tailEnd":"triangle"}},
  {"command":"add","parent":"/slide[4]","type":"connector","props":{"from":"/slide[4]/shape[@name=EventMapper]","to":"/slide[4]/shape[@name=EventBuffer]","shape":"straight","color":"687069","lineWidth":"1.5pt","tailEnd":"triangle"}},
  {"command":"add","parent":"/slide[4]","type":"connector","props":{"from":"/slide[4]/shape[@name=EventBuffer]","to":"/slide[4]/shape[@name=EventReducer]","shape":"straight","color":"687069","lineWidth":"1.5pt","tailEnd":"triangle"}},
  {"command":"add","parent":"/slide[4]","type":"connector","props":{"from":"/slide[4]/shape[@name=EventReducer]","to":"/slide[4]/shape[@name=EventSnapshot]","shape":"straight","color":"687069","lineWidth":"1.5pt","tailEnd":"triangle","fromSide":"bottom","toSide":"top"}},
  {"command":"add","parent":"/slide[4]","type":"shape","props":{"text":"重连：streamId + after 重放；游标过期时触发 snapshot.required","font":"Arial","size":"18","color":"4B514C","x":"3cm","y":"16.25cm","width":"27.87cm","height":"1.1cm","align":"center"}},
  {"command":"add","parent":"/slide[4]","type":"notes","props":{"text":"先区分两套事件模型：AgentSessionEvent 是 Pi runtime 内部事件；ConversationService.onEvent 将其映射为面向 UI 的 StreamEvent。EventBuffer 负责排序、缓存、重放和订阅，SSE 把事件推到浏览器，snapshotReducer 最终更新 ConversationSnapshot。重连时使用 streamId 与 after；游标过期或 streamId 变化时要求重新获取快照。"}}
]
JSON
officecli get "$FILE" "/slide[4]" --depth 1 >/dev/null

# Slide 5 — Session lifecycle
officecli add "$FILE" / --type slide --prop layout=blank --prop background=F4F5F2
officecli batch "$FILE" <<'JSON'
[
  {"command":"add","parent":"/slide[5]","type":"shape","props":{"preset":"ellipse","fill":"276C4C","line":"none","x":"1.4cm","y":"0.85cm","width":"1.8cm","height":"1.8cm","text":"04","font":"Consolas","size":"12","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[5]","type":"shape","props":{"text":"会话持久化与 Runtime 生命周期解耦","font":"Arial","size":"38","bold":"true","color":"20231F","x":"3cm","y":"0.85cm","width":"28.5cm","height":"2.1cm"}},
  {"command":"add","parent":"/slide[5]","type":"shape","props":{"name":"Life1","preset":"ellipse","fill":"20231F","line":"none","x":"2.3cm","y":"6.2cm","width":"4cm","height":"4cm","text":"创建\nSession","font":"Arial","size":"19","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[5]","type":"shape","props":{"name":"Life2","preset":"ellipse","fill":"276C4C","line":"none","x":"10.2cm","y":"6.2cm","width":"4cm","height":"4cm","text":"活跃\nRuntime","font":"Arial","size":"19","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[5]","type":"shape","props":{"name":"Life3","preset":"ellipse","fill":"DCEBE2","line":"none","x":"18.1cm","y":"6.2cm","width":"4cm","height":"4cm","text":"空闲释放\nCold","font":"Arial","size":"19","bold":"true","color":"276C4C","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[5]","type":"shape","props":{"name":"Life4","preset":"ellipse","fill":"20231F","line":"none","x":"26cm","y":"6.2cm","width":"4cm","height":"4cm","text":"恢复\n继续","font":"Arial","size":"19","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[5]","type":"connector","props":{"from":"/slide[5]/shape[@name=Life1]","to":"/slide[5]/shape[@name=Life2]","shape":"straight","color":"687069","lineWidth":"1.5pt","tailEnd":"triangle"}},
  {"command":"add","parent":"/slide[5]","type":"connector","props":{"from":"/slide[5]/shape[@name=Life2]","to":"/slide[5]/shape[@name=Life3]","shape":"straight","color":"687069","lineWidth":"1.5pt","tailEnd":"triangle"}},
  {"command":"add","parent":"/slide[5]","type":"connector","props":{"from":"/slide[5]/shape[@name=Life3]","to":"/slide[5]/shape[@name=Life4]","shape":"straight","color":"687069","lineWidth":"1.5pt","tailEnd":"triangle"}},
  {"command":"add","parent":"/slide[5]","type":"shape","props":{"name":"Fork","preset":"roundRect","fill":"FFF3D8","line":"B7791F:1","x":"9.1cm","y":"13.1cm","width":"6.2cm","height":"2.2cm","text":"编辑历史消息\nFork 新 Session","font":"Arial","size":"18","bold":"true","color":"7A4E11","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[5]","type":"shape","props":{"name":"Shared","preset":"roundRect","fill":"E9ECE7","line":"DADDD7:1","x":"18.5cm","y":"13.1cm","width":"6.8cm","height":"2.2cm","text":"分支共享父会话\nWorkspace","font":"Arial","size":"18","bold":"true","color":"20231F","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[5]","type":"connector","props":{"from":"/slide[5]/shape[@name=Life2]","to":"/slide[5]/shape[@name=Fork]","shape":"elbow","color":"B7791F","lineWidth":"1.5pt","tailEnd":"triangle","fromSide":"bottom","toSide":"top"}},
  {"command":"add","parent":"/slide[5]","type":"connector","props":{"from":"/slide[5]/shape[@name=Fork]","to":"/slide[5]/shape[@name=Shared]","shape":"straight","color":"687069","lineWidth":"1.5pt","tailEnd":"triangle"}},
  {"command":"add","parent":"/slide[5]","type":"shape","props":{"text":"历史与上下文保存在 JSONL；Runtime 可以回收，Session 不会丢失。","font":"Arial","size":"20","color":"4B514C","x":"2cm","y":"16.3cm","width":"29.87cm","height":"1.2cm","align":"center"}},
  {"command":"add","parent":"/slide[5]","type":"notes","props":{"text":"强调两个维度：Runtime 是可回收的计算资源，JSONL Session 是持久历史；分支创建新的对话上下文，但共享父会话的代码 workspace。"}}
]
JSON
officecli get "$FILE" "/slide[5]" --depth 1 >/dev/null

# Slide 6 — Runtime interaction
officecli add "$FILE" / --type slide --prop layout=blank --prop background=F4F5F2
officecli batch "$FILE" <<'JSON'
[
  {"command":"add","parent":"/slide[6]","type":"shape","props":{"preset":"ellipse","fill":"276C4C","line":"none","x":"1.4cm","y":"0.85cm","width":"1.8cm","height":"1.8cm","text":"05","font":"Consolas","size":"12","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[6]","type":"shape","props":{"text":"运行中仍可控制方向、队列与模型","font":"Arial","size":"38","bold":"true","color":"20231F","x":"3cm","y":"0.85cm","width":"28.5cm","height":"2.1cm"}},
  {"command":"add","parent":"/slide[6]","type":"shape","props":{"fill":"20231F","line":"none","x":"1.5cm","y":"4cm","width":"17.2cm","height":"11.7cm"}},
  {"command":"add","parent":"/slide[6]","type":"shape","props":{"fill":"DCEBE2","line":"none","x":"2.3cm","y":"4.7cm","width":"3.1cm","height":"1cm","text":"RUN 01","font":"Consolas","size":"14","bold":"true","color":"276C4C","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[6]","type":"shape","props":{"text":"连续工具调用合并为 Run Group","font":"Arial","size":"22","bold":"true","color":"FFFFFF","x":"5.9cm","y":"4.6cm","width":"11.8cm","height":"1.2cm"}},
  {"command":"add","parent":"/slide[6]","type":"shape","props":{"fill":"2F3932","line":"3A413B:1","x":"2.3cm","y":"6.4cm","width":"15.6cm","height":"2.1cm","text":"bash   pnpm install                         ✓","font":"Consolas","size":"16","color":"DCEBE2","valign":"middle","margin":"0.35cm"}},
  {"command":"add","parent":"/slide[6]","type":"shape","props":{"fill":"2F3932","line":"3A413B:1","x":"2.3cm","y":"8.9cm","width":"15.6cm","height":"2.1cm","text":"edit   src/App.tsx                        ✓","font":"Consolas","size":"16","color":"DCEBE2","valign":"middle","margin":"0.35cm"}},
  {"command":"add","parent":"/slide[6]","type":"shape","props":{"fill":"2F3932","line":"3A413B:1","x":"2.3cm","y":"11.4cm","width":"15.6cm","height":"2.1cm","text":"bash   pnpm test                          ●","font":"Consolas","size":"16","color":"FFFFFF","valign":"middle","margin":"0.35cm"}},
  {"command":"add","parent":"/slide[6]","type":"shape","props":{"text":"每一步可展开参数、输出与错误","font":"Arial","size":"18","color":"B8C2BA","x":"2.3cm","y":"14.2cm","width":"15.6cm","height":"1cm","align":"center"}},
  {"command":"add","parent":"/slide[6]","type":"shape","props":{"text":"运行时消息","font":"Arial","size":"24","bold":"true","color":"20231F","x":"20.1cm","y":"4.2cm","width":"11.3cm","height":"1.3cm"}},
  {"command":"add","parent":"/slide[6]","type":"shape","props":{"fill":"276C4C","line":"none","x":"20.1cm","y":"6.1cm","width":"11.3cm","height":"2.1cm","text":"Steer\n改变当前任务方向","font":"Arial","size":"18","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[6]","type":"shape","props":{"fill":"DCEBE2","line":"none","x":"20.1cm","y":"8.7cm","width":"11.3cm","height":"2.1cm","text":"Follow-up\n当前任务结束后继续","font":"Arial","size":"18","bold":"true","color":"276C4C","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[6]","type":"shape","props":{"fill":"FFF3D8","line":"B7791F:1","x":"20.1cm","y":"11.3cm","width":"11.3cm","height":"2.1cm","text":"Stop\n请求终止当前运行","font":"Arial","size":"18","bold":"true","color":"7A4E11","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[6]","type":"shape","props":{"fill":"E9ECE7","line":"none","x":"20.1cm","y":"14cm","width":"11.3cm","height":"1.7cm","text":"Model  ↔  Thinking level","font":"Consolas","size":"16","bold":"true","color":"20231F","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[6]","type":"notes","props":{"text":"演示 Run Group 如何压缩连续工具调用，并说明运行中三种操作：Steer 改变当前方向，Follow-up 排队到本轮之后，Stop 请求终止。模型与 thinking level 直接作用于同一个 session。"}}
]
JSON
officecli get "$FILE" "/slide[6]" --depth 1 >/dev/null

# Slide 7 — Harness inspector
officecli add "$FILE" / --type slide --prop layout=blank --prop background=20231F
officecli batch "$FILE" <<'JSON'
[
  {"command":"add","parent":"/slide[7]","type":"shape","props":{"preset":"ellipse","fill":"70D3A3","line":"none","x":"1.4cm","y":"0.85cm","width":"1.8cm","height":"1.8cm","text":"06","font":"Consolas","size":"12","bold":"true","color":"20231F","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[7]","type":"shape","props":{"text":"Harness 检查器让内部状态可见、可操作","font":"Arial","size":"38","bold":"true","color":"FFFFFF","x":"3cm","y":"0.85cm","width":"28.5cm","height":"2.1cm"}},
  {"command":"add","parent":"/slide[7]","type":"shape","props":{"fill":"2A302B","line":"3A413B:1","x":"1.5cm","y":"4cm","width":"9.78cm","height":"11.6cm"}},
  {"command":"add","parent":"/slide[7]","type":"shape","props":{"preset":"ellipse","fill":"DCEBE2","line":"none","x":"2.3cm","y":"4.8cm","width":"1.8cm","height":"1.8cm","text":"A","font":"Consolas","size":"18","bold":"true","color":"276C4C","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[7]","type":"shape","props":{"text":"活动","font":"Arial","size":"24","bold":"true","color":"FFFFFF","x":"4.5cm","y":"4.9cm","width":"5.7cm","height":"1.2cm"}},
  {"command":"add","parent":"/slide[7]","type":"shape","props":{"text":"运行时间线\n工具开始 / 更新 / 完成\n队列与 Runtime 状态\n自动重试事件","font":"Arial","size":"19","color":"DCEBE2","x":"2.3cm","y":"7.2cm","width":"7.8cm","height":"6cm","lineSpacing":"1.35x"}},
  {"command":"add","parent":"/slide[7]","type":"shape","props":{"fill":"2A302B","line":"3A413B:1","x":"12.04cm","y":"4cm","width":"9.78cm","height":"11.6cm"}},
  {"command":"add","parent":"/slide[7]","type":"shape","props":{"preset":"ellipse","fill":"DCEBE2","line":"none","x":"12.84cm","y":"4.8cm","width":"1.8cm","height":"1.8cm","text":"C","font":"Consolas","size":"18","bold":"true","color":"276C4C","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[7]","type":"shape","props":{"text":"上下文","font":"Arial","size":"24","bold":"true","color":"FFFFFF","x":"15cm","y":"4.9cm","width":"5.8cm","height":"1.2cm"}},
  {"command":"add","parent":"/slide[7]","type":"shape","props":{"text":"Context usage\n输入 / 输出 / 缓存 Tokens\n工具调用与估算费用\n手动压缩与导出","font":"Arial","size":"19","color":"DCEBE2","x":"12.84cm","y":"7.2cm","width":"7.8cm","height":"6cm","lineSpacing":"1.35x"}},
  {"command":"add","parent":"/slide[7]","type":"shape","props":{"fill":"2A302B","line":"3A413B:1","x":"22.58cm","y":"4cm","width":"9.78cm","height":"11.6cm"}},
  {"command":"add","parent":"/slide[7]","type":"shape","props":{"preset":"ellipse","fill":"DCEBE2","line":"none","x":"23.38cm","y":"4.8cm","width":"1.8cm","height":"1.8cm","text":"S","font":"Consolas","size":"18","bold":"true","color":"276C4C","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[7]","type":"shape","props":{"text":"设置","font":"Arial","size":"24","bold":"true","color":"FFFFFF","x":"25.55cm","y":"4.9cm","width":"5.8cm","height":"1.2cm"}},
  {"command":"add","parent":"/slide[7]","type":"shape","props":{"text":"自动压缩\n自动重试\nSteer 消费模式\nFollow-up 消费模式","font":"Arial","size":"19","color":"DCEBE2","x":"23.38cm","y":"7.2cm","width":"7.8cm","height":"6cm","lineSpacing":"1.35x"}},
  {"command":"add","parent":"/slide[7]","type":"shape","props":{"text":"不是调试后台，而是面向开发者的产品能力。","font":"Arial","size":"20","bold":"true","color":"70D3A3","x":"2cm","y":"16.5cm","width":"29.87cm","height":"1.1cm","align":"center"}},
  {"command":"add","parent":"/slide[7]","type":"notes","props":{"text":"按三个标签讲解 Harness：活动用于追踪执行，Context 用于判断窗口和成本，设置用于控制自动维护与队列策略。它们都来自真实 session 状态，不是前端模拟值。"}}
]
JSON
officecli get "$FILE" "/slide[7]" --depth 1 >/dev/null

# Slide 8 — Conversation entity model
officecli add "$FILE" / --type slide --prop layout=blank --prop background=F4F5F2
officecli batch "$FILE" <<'JSON'
[
  {"command":"add","parent":"/slide[8]","type":"shape","props":{"preset":"ellipse","fill":"276C4C","line":"none","x":"1.4cm","y":"0.85cm","width":"1.8cm","height":"1.8cm","text":"07","font":"Consolas","size":"12","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[8]","type":"shape","props":{"text":"Conversation 是跨三层状态的聚合","font":"Arial","size":"38","bold":"true","color":"20231F","x":"3cm","y":"0.85cm","width":"28.5cm","height":"2.1cm"}},
  {"command":"add","parent":"/slide[8]","type":"shape","props":{"fill":"20231F","line":"none","x":"1.5cm","y":"3.35cm","width":"30.87cm","height":"1.65cm","text":"ConversationService 统一协调 · 同一个 conversation.id 贯穿 Record / Active / Channel / Snapshot","font":"Arial","size":"18","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[8]","type":"shape","props":{"name":"RecordCard","fill":"E9ECE7","line":"DADDD7","lineWidth":"1pt","x":"1.5cm","y":"5.8cm","width":"9.5cm","height":"7.2cm"}},
  {"command":"add","parent":"/slide[8]","type":"shape","props":{"text":"ConversationRecord","font":"Consolas","size":"22","bold":"true","color":"20231F","x":"2.1cm","y":"6.45cm","width":"8.3cm","height":"1.2cm","align":"center"}},
  {"command":"add","parent":"/slide[8]","type":"shape","props":{"text":"持久化：records/{id}.json\nworkspace / sessionFile\nparentId / settings\n冷态仍存在","font":"Arial","size":"18","color":"4B514C","x":"2.1cm","y":"7.9cm","width":"8.3cm","height":"4.5cm","align":"center","lineSpacing":"1x"}},
  {"command":"add","parent":"/slide[8]","type":"shape","props":{"preset":"rightArrow","fill":"B7791F","line":"none","x":"11.15cm","y":"8.55cm","width":"0.9cm","height":"1.6cm"}},
  {"command":"add","parent":"/slide[8]","type":"shape","props":{"name":"ActiveCard","fill":"276C4C","line":"none","x":"12.18cm","y":"5.8cm","width":"9.5cm","height":"7.2cm"}},
  {"command":"add","parent":"/slide[8]","type":"shape","props":{"text":"ActiveConversation","font":"Consolas","size":"22","bold":"true","color":"FFFFFF","x":"12.78cm","y":"6.45cm","width":"8.3cm","height":"1.2cm","align":"center"}},
  {"command":"add","parent":"/slide[8]","type":"shape","props":{"text":"内存：active.get(id)\nAgentSessionRuntime\nstatus / timer / diagnostics\nTTL 到期释放，可重建","font":"Arial","size":"18","color":"FFFFFF","x":"12.78cm","y":"7.9cm","width":"8.3cm","height":"4.5cm","align":"center","lineSpacing":"1x"}},
  {"command":"add","parent":"/slide[8]","type":"shape","props":{"preset":"rightArrow","fill":"B7791F","line":"none","x":"21.83cm","y":"8.55cm","width":"0.9cm","height":"1.6cm"}},
  {"command":"add","parent":"/slide[8]","type":"shape","props":{"name":"ChannelCard","fill":"DCEBE2","line":"none","x":"22.87cm","y":"5.8cm","width":"9.5cm","height":"7.2cm"}},
  {"command":"add","parent":"/slide[8]","type":"shape","props":{"text":"EventBuffer","font":"Consolas","size":"22","bold":"true","color":"276C4C","x":"23.47cm","y":"6.45cm","width":"8.3cm","height":"1.2cm","align":"center"}},
  {"command":"add","parent":"/slide[8]","type":"shape","props":{"text":"内存：channels.get(id)\nStreamEvent[] + listeners\nreplay(after) / subscribe\nRuntime 释放后仍保留","font":"Arial","size":"18","color":"276C4C","x":"23.47cm","y":"7.9cm","width":"8.3cm","height":"4.5cm","align":"center","lineSpacing":"1x"}},
  {"command":"add","parent":"/slide[8]","type":"shape","props":{"preset":"downArrow","fill":"687069","line":"none","x":"5.9cm","y":"13.15cm","width":"0.7cm","height":"1.1cm"}},
  {"command":"add","parent":"/slide[8]","type":"shape","props":{"preset":"downArrow","fill":"687069","line":"none","x":"16.58cm","y":"13.15cm","width":"0.7cm","height":"1.1cm"}},
  {"command":"add","parent":"/slide[8]","type":"shape","props":{"preset":"downArrow","fill":"687069","line":"none","x":"27.27cm","y":"13.15cm","width":"0.7cm","height":"1.1cm"}},
  {"command":"add","parent":"/slide[8]","type":"shape","props":{"fill":"20231F","line":"none","x":"3.5cm","y":"14.45cm","width":"26.87cm","height":"2.65cm","text":"ConversationSnapshot（前端读模型）\nRecord 元数据 + Runtime 投影 + EventBuffer 游标 / activity","font":"Arial","size":"20","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[8]","type":"notes","props":{"text":"这一页先纠正对象边界：代码里没有一个包办所有状态的 Conversation 类。ConversationRecord 是持久化元数据；ActiveConversation 是按需加载的运行时容器；EventBuffer 是按 conversation id 管理的事件通道。三者通过相同 id 关联，由 ConversationService 协调，并在 snapshot() 中组装成前端使用的 ConversationSnapshot。特别指出：ActiveConversation 在 cold 状态会释放，但 Record、JSONL、Workspace 以及 channels 中的 EventBuffer 不随之删除。"}}
]
JSON
officecli get "$FILE" "/slide[8]" --depth 1 >/dev/null

# Slide 9 — Engineering quality
officecli add "$FILE" / --type slide --prop layout=blank --prop background=F4F5F2
officecli batch "$FILE" <<'JSON'
[
  {"command":"add","parent":"/slide[9]","type":"shape","props":{"preset":"ellipse","fill":"276C4C","line":"none","x":"1.4cm","y":"0.85cm","width":"1.8cm","height":"1.8cm","text":"08","font":"Consolas","size":"12","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[9]","type":"shape","props":{"text":"工程质量有可重复的验证结果","font":"Arial","size":"38","bold":"true","color":"20231F","x":"3cm","y":"0.85cm","width":"28.5cm","height":"2.1cm"}},
  {"command":"add","parent":"/slide[9]","type":"shape","props":{"fill":"20231F","line":"none","x":"1.5cm","y":"4cm","width":"9.78cm","height":"5.2cm"}},
  {"command":"add","parent":"/slide[9]","type":"shape","props":{"text":"12","font":"Arial","size":"54","bold":"true","color":"FFFFFF","x":"1.8cm","y":"4.7cm","width":"9.18cm","height":"2.55cm","align":"center"}},
  {"command":"add","parent":"/slide[9]","type":"shape","props":{"text":"测试文件全部通过","font":"Arial","size":"17","bold":"true","color":"DCEBE2","x":"2cm","y":"7.4cm","width":"8.78cm","height":"1cm","align":"center"}},
  {"command":"add","parent":"/slide[9]","type":"shape","props":{"fill":"276C4C","line":"none","x":"12.04cm","y":"4cm","width":"9.78cm","height":"5.2cm"}},
  {"command":"add","parent":"/slide[9]","type":"shape","props":{"text":"48","font":"Arial","size":"54","bold":"true","color":"FFFFFF","x":"12.34cm","y":"4.7cm","width":"9.18cm","height":"2.55cm","align":"center"}},
  {"command":"add","parent":"/slide[9]","type":"shape","props":{"text":"测试用例全部通过","font":"Arial","size":"17","bold":"true","color":"FFFFFF","x":"12.54cm","y":"7.4cm","width":"8.78cm","height":"1cm","align":"center"}},
  {"command":"add","parent":"/slide[9]","type":"shape","props":{"fill":"DCEBE2","line":"none","x":"22.58cm","y":"4cm","width":"9.78cm","height":"5.2cm"}},
  {"command":"add","parent":"/slide[9]","type":"shape","props":{"text":"PASS","font":"Consolas","size":"42","bold":"true","color":"276C4C","x":"22.88cm","y":"4.9cm","width":"9.18cm","height":"2cm","align":"center"}},
  {"command":"add","parent":"/slide[9]","type":"shape","props":{"text":"TypeScript + Vite 构建","font":"Arial","size":"17","bold":"true","color":"276C4C","x":"23.08cm","y":"7.4cm","width":"8.78cm","height":"1cm","align":"center"}},
  {"command":"add","parent":"/slide[9]","type":"shape","props":{"text":"源码与测试分离","font":"Arial","size":"24","bold":"true","color":"20231F","x":"1.5cm","y":"10.5cm","width":"12cm","height":"1.3cm"}},
  {"command":"add","parent":"/slide[9]","type":"shape","props":{"fill":"E9ECE7","line":"DADDD7:1","x":"1.5cm","y":"12.2cm","width":"7.1cm","height":"3.1cm","text":"src/\n前端界面与状态","font":"Arial","size":"18","bold":"true","color":"20231F","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[9]","type":"shape","props":{"fill":"E9ECE7","line":"DADDD7:1","x":"9.35cm","y":"12.2cm","width":"7.1cm","height":"3.1cm","text":"server/\nAPI 与 Session 服务","font":"Arial","size":"18","bold":"true","color":"20231F","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[9]","type":"shape","props":{"fill":"E9ECE7","line":"DADDD7:1","x":"17.2cm","y":"12.2cm","width":"7.1cm","height":"3.1cm","text":"shared/\n跨端类型契约","font":"Arial","size":"18","bold":"true","color":"20231F","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[9]","type":"shape","props":{"fill":"20231F","line":"none","x":"25.05cm","y":"12.2cm","width":"7.1cm","height":"3.1cm","text":"test/\n组件与服务测试","font":"Arial","size":"18","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[9]","type":"shape","props":{"text":"验证时间：2026-08-18 · pnpm test · pnpm build","font":"Consolas","size":"13","color":"687069","x":"1.5cm","y":"16.4cm","width":"30.5cm","height":"0.8cm","align":"right"}},
  {"command":"add","parent":"/slide[9]","type":"notes","props":{"text":"这些数字来自本次实际执行：12 个测试文件、48 个测试用例全部通过；pnpm build 同时完成 TypeScript noEmit 检查和 Vite production build。"}}
]
JSON
officecli get "$FILE" "/slide[9]" --depth 1 >/dev/null

# Slide 10 — Safety and demo path
officecli add "$FILE" / --type slide --prop layout=blank --prop background=F4F5F2
officecli batch "$FILE" <<'JSON'
[
  {"command":"add","parent":"/slide[10]","type":"shape","props":{"preset":"ellipse","fill":"276C4C","line":"none","x":"1.4cm","y":"0.85cm","width":"1.8cm","height":"1.8cm","text":"09","font":"Consolas","size":"12","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[10]","type":"shape","props":{"text":"演示的最后一步：明确安全边界","font":"Arial","size":"38","bold":"true","color":"20231F","x":"3cm","y":"0.85cm","width":"28.5cm","height":"2.1cm"}},
  {"command":"add","parent":"/slide[10]","type":"shape","props":{"fill":"20231F","line":"none","x":"1.5cm","y":"4cm","width":"12.2cm","height":"11.7cm"}},
  {"command":"add","parent":"/slide[10]","type":"shape","props":{"preset":"ellipse","fill":"FFF3D8","line":"none","x":"5.7cm","y":"5cm","width":"3.8cm","height":"3.8cm","text":"!","font":"Arial","size":"48","bold":"true","color":"B7791F","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[10]","type":"shape","props":{"text":"本机可信环境","font":"Arial","size":"27","bold":"true","color":"FFFFFF","x":"2.5cm","y":"9.4cm","width":"10.2cm","height":"1.5cm","align":"center"}},
  {"command":"add","parent":"/slide[10]","type":"shape","props":{"text":"独立 cwd 不是 OS 沙箱\nBash 可访问绝对路径\n仅监听 127.0.0.1\n不要暴露给不可信用户","font":"Arial","size":"19","color":"DCEBE2","x":"2.5cm","y":"11.2cm","width":"10.2cm","height":"4.25cm","align":"center","lineSpacing":"1.25x"}},
  {"command":"add","parent":"/slide[10]","type":"shape","props":{"text":"建议演示路径","font":"Arial","size":"26","bold":"true","color":"20231F","x":"15.3cm","y":"4.2cm","width":"16.5cm","height":"1.4cm"}},
  {"command":"add","parent":"/slide[10]","type":"shape","props":{"preset":"ellipse","fill":"276C4C","line":"none","x":"15.3cm","y":"6.4cm","width":"1.5cm","height":"1.5cm","text":"1","font":"Consolas","size":"16","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[10]","type":"shape","props":{"text":"创建小项目，展开 Bash 与 edit","font":"Arial","size":"18","color":"20231F","x":"17.5cm","y":"6.35cm","width":"14cm","height":"1.5cm","valign":"middle"}},
  {"command":"add","parent":"/slide[10]","type":"shape","props":{"preset":"ellipse","fill":"276C4C","line":"none","x":"15.3cm","y":"8.4cm","width":"1.5cm","height":"1.5cm","text":"2","font":"Consolas","size":"16","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[10]","type":"shape","props":{"text":"发送 Steer 与 Follow-up，观察队列","font":"Arial","size":"18","color":"20231F","x":"17.5cm","y":"8.35cm","width":"14cm","height":"1.5cm","valign":"middle"}},
  {"command":"add","parent":"/slide[10]","type":"shape","props":{"preset":"ellipse","fill":"276C4C","line":"none","x":"15.3cm","y":"10.4cm","width":"1.5cm","height":"1.5cm","text":"3","font":"Consolas","size":"16","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[10]","type":"shape","props":{"text":"切换 Model / Thinking，查看 Context","font":"Arial","size":"18","color":"20231F","x":"17.5cm","y":"10.35cm","width":"14cm","height":"1.5cm","valign":"middle"}},
  {"command":"add","parent":"/slide[10]","type":"shape","props":{"preset":"ellipse","fill":"276C4C","line":"none","x":"15.3cm","y":"12.4cm","width":"1.5cm","height":"1.5cm","text":"4","font":"Consolas","size":"16","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[10]","type":"shape","props":{"text":"上传图片、压缩上下文并创建分支","font":"Arial","size":"18","color":"20231F","x":"17.5cm","y":"12.35cm","width":"14cm","height":"1.5cm","valign":"middle"}},
  {"command":"add","parent":"/slide[10]","type":"shape","props":{"preset":"ellipse","fill":"276C4C","line":"none","x":"15.3cm","y":"14.4cm","width":"1.5cm","height":"1.5cm","text":"5","font":"Consolas","size":"16","bold":"true","color":"FFFFFF","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[10]","type":"shape","props":{"text":"重启服务，继续原会话验证恢复","font":"Arial","size":"18","color":"20231F","x":"17.5cm","y":"14.35cm","width":"14cm","height":"1.5cm","valign":"middle"}},
  {"command":"add","parent":"/slide[10]","type":"shape","props":{"fill":"DCEBE2","line":"none","x":"15.3cm","y":"16.15cm","width":"16.5cm","height":"1.65cm","text":"Pi Chat Web = 可观察、可恢复、可控制的本地 Agent 工作台","font":"Arial","size":"16","bold":"true","color":"276C4C","align":"center","valign":"middle"}},
  {"command":"add","parent":"/slide[10]","type":"notes","props":{"text":"收尾时先强调安全边界，再按五步给出演示路径。最后总结：Pi Chat Web 的价值是让本地 Agent 运行变得可观察、可恢复、可控制。"}}
]
JSON
officecli get "$FILE" "/slide[10]" --depth 1 >/dev/null

officecli save "$FILE"
