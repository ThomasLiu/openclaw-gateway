# openclaw-gateway 产品说明文档

> **维护方式**：本文档由 `doc-sync` subagent 自动维护。每次代码变更后，运行 `/doc-sync` 或让 doc-sync agent 读取变更文件并更新本文档。
>
> **同步规则**：文档描述必须与代码行为一致。如果代码与文档不符，以代码为准，文档应被修复。

---

## 项目概述

`openclaw-gateway` 是 OpenClaw Agent Gateway 的 Web UI 前端，基于 Next.js 16 构建，通过 WebSocket 与网关通信，为 AI Agent 交互提供图形化界面。

**技术栈**：Next.js 16 (App Router, Turbopack) / React 19 / Tailwind CSS 4 / better-sqlite3 / WebSocket JSON-RPC / SSE

**网关协议**：浏览器 → Next.js (HTTP/SSE) → OpenClaw 网关 (WebSocket JSON-RPC)

---

## 功能地图

### 1. 用户端功能

#### 1.1 聊天消息

| 功能 | 描述 | 核心文件 |
|------|------|----------|
| 发送消息（流式） | POST `/api/chat` 通过 SSE 建立流式会话，AI 回复以增量 delta 实时推送 | `src/app/api/chat/route.ts` |
| 加载消息历史 | GET `/api/chat` 支持网关会话和本地 SQLite 降级，最多 200 条 | `src/app/api/chat/route.ts` |
| Markdown 渲染 | 使用 `react-markdown` + `remark-gfm` 渲染助手消息，支持 GFM 表格、代码块高亮 | `src/components/MessageList.tsx` |
| 流式波浪动画 | 消息生成中时，底部显示浅绿色渐变波动动画条 | `src/components/StreamingWaveBar.tsx` |
| 消息时间戳 | 每条消息显示 `HH:mm` 时间戳；助手消息额外显示模型名称和生成耗时 | `src/components/MessageList.tsx` |
| 流式中止 | POST `/api/chat/abort` 通过 `chat.abort` RPC 中止正在生成的响应 | `src/app/api/chat/abort/route.ts` |

#### 1.2 会话管理

| 功能 | 描述 | 核心文件 |
|------|------|----------|
| 会话列表 | GET `/api/gateway/sessions` 调用 `sessions.list`，支持多种过滤参数 | `src/app/api/gateway/sessions/route.ts` |
| 新建会话 | POST `/api/gateway/sessions` 调用 `sessions.create`，sessionKey 写入 localStorage | `src/app/api/gateway/sessions/route.ts` |
| 删除会话 | DELETE `/api/gateway/sessions` 调用 `sessions.delete` | `src/app/api/gateway/sessions/route.ts` |
| 会话切换 | 切换时关闭 SSE、加载新会话历史，支持 localStorage 恢复已选会话 | `src/components/ChatApp.tsx` |
| 会话持久化 | 每个 Agent 的 sessionKey 独立存储于 localStorage | `src/components/chat-utils.ts` |
| 相对时间显示 | 会话列表显示"刚刚"、"N分钟前"等，每 30 秒刷新 | `src/components/ChatApp.tsx` |
| 会话配置修改 | POST `/api/gateway/sessions/patch` 支持修改会话级 model 覆盖 | `src/app/api/gateway/sessions/patch/route.ts` |

#### 1.3 输入框

| 功能 | 描述 | 核心文件 |
|------|------|----------|
| 多行文本输入 | textarea 自动高度扩展（最大 200px），最小 44px | `src/components/Composer.tsx` |
| 快捷键发送 | Enter 发送，Shift+Enter 换行；发送后自动清空 | `src/components/Composer.tsx` |
| 发送/停止切换 | 流式传输中按钮变为红色"停止"图标 | `src/components/Composer.tsx` |

---

### 2. Agent 管理

#### 2.1 Agent 列表与切换

| 功能 | 描述 | 核心文件 |
|------|------|----------|
| 加载 Agent 列表 | GET `/api/agents` 调用 `agents.list` | `src/app/api/agents/route.ts` |
| 切换 Agent | 关闭 SSE、切换会话列表、加载新 Agent 消息；侧栏可折叠 | `src/components/ChatApp.tsx` |
| Architect Agent 识别 | `agent-architect` 在侧栏列表中有特殊"Architect"标签 | `src/lib/openclaw-agent-architect/constants.ts` |
| 导出 Agent | GET `/api/agents/[agentId]/export` 打包为 ZIP 下载，内置脱敏逻辑 | `src/app/api/agents/[agentId]/export/route.ts` |

#### 2.2 Agent 工作区

| 功能 | 描述 | 核心文件 |
|------|------|----------|
| 工作区文件读写 | GET/PUT `/api/agent/workspace/[agentId]/file` 白名单文件名，防止路径遍历 | `src/app/api/agent/workspace/[agentId]/file/route.ts` |
| 工作区目录树 | GET `/api/agent/workspace/[agentId]/tree` 最多 20 层，跳过 node_modules/.git/.next | `src/app/api/agent/workspace/[agentId]/tree/route.ts` |

---

### 3. 系统配置

#### 3.1 网关配置

| 功能 | 描述 | 核心文件 |
|------|------|----------|
| 获取网关配置 | GET `/api/openclaw/config` 调用 `config.get`，返回脱敏后配置 | `src/app/api/openclaw/config/route.ts` |
| 获取可用模型 | GET `/api/openclaw/models` 调用 `models.list` | `src/app/api/openclaw/models/route.ts` |
| 默认模型读写 | GET/POST `/api/openclaw/default-model` 支持乐观锁（409 冲突） | `src/app/api/openclaw/default-model/route.ts` |

#### 3.2 子代理策略

| 功能 | 描述 | 核心文件 |
|------|------|----------|
| 子代理策略 Patch | POST `/api/openclaw/subagent-policy/patch` 支持 defaults/tools/agent 三种 kind | `src/app/api/openclaw/subagent-policy/patch/route.ts` |

#### 3.3 MCP 服务

| 功能 | 描述 | 核心文件 |
|------|------|----------|
| 移除 MCP 服务 | POST `/api/openclaw/mcp-servers/remove` 通过 `config.patch`，乐观锁保护 | `src/app/api/openclaw/mcp-servers/remove/route.ts` |

---

### 4. 管理功能

#### 4.1 执行审批

| 功能 | 描述 | 核心文件 |
|------|------|----------|
| SSE 审批流 | GET `/api/gateway/exec-approvals/stream` 实时接收网关审批事件 | `src/app/api/gateway/exec-approvals/stream/route.ts` |
| 审批决策 | POST `/api/gateway/exec-approvals/resolve` 支持"允许一次"/"始终允许"/"拒绝" | `src/app/api/gateway/exec-approvals/resolve/route.ts` |
| 审批弹窗 | 全屏遮罩 + 审批卡片，60 秒自动过期 | `src/components/ExecApprovalOverlay.tsx` |

#### 4.2 定时任务

| 功能 | 描述 | 核心文件 |
|------|------|----------|
| 定时任务列表 | GET `/api/openclaw/cron` 调用 `cron.list` | `src/app/api/openclaw/cron/route.ts` |
| 创建定时任务 | POST `/api/openclaw/cron` 调用 `cron.create` | `src/app/api/openclaw/cron/route.ts` |
| 删除定时任务 | DELETE `/api/openclaw/cron` 调用 `cron.remove` | `src/app/api/openclaw/cron/route.ts` |

#### 4.3 网关状态监控

| 功能 | 描述 | 核心文件 |
|------|------|----------|
| 网关连接探测 | GET `/api/gateway/status` WebSocket 探测（5秒超时）+ CLI 降级 | `src/app/api/gateway/status/route.ts` |
| 实时网关日志 | GET `/api/openclaw/logs` SSE 每 3 秒轮询 `logs.tail`，最多保留 500 条 | `src/app/api/openclaw/logs/route.ts` |
| 网关日志面板 | 右侧可折叠面板，自动滚动（滚动时暂停），连接断开 3 秒重连 | `src/components/OpenClawLogsPanel.tsx` |
| 网关告警弹窗 | 连接失败时显示红色告警对话框 | `src/components/GatewayAlertDialog.tsx` |

#### 4.4 技能管理

| 功能 | 描述 | 核心文件 |
|------|------|----------|
| 技能状态列表 | GET `/api/openclaw/skills/status` 调用 `skills.status` | `src/app/api/openclaw/skills/status/route.ts` |
| 搜索技能 | GET `/api/openclaw/skills/search` 从 ClaWHub 搜索 | `src/app/api/openclaw/skills/search/route.ts` |
| 安装技能 | POST `/api/openclaw/skills/install` 调用 `skills.install`（异步，202） | `src/app/api/openclaw/skills/install/route.ts` |
| 会话级技能管理 | GET/POST `/api/openclaw/skills/session` | `src/app/api/openclaw/skills/session/route.ts` |
| 开发工具探测 | GET `/api/openclaw/skills/dev-tool-presence` 检测 13 种开发工具 | `src/app/api/openclaw/skills/dev-tool-presence/route.ts` |

#### 4.5 版本与更新

| 功能 | 描述 | 核心文件 |
|------|------|----------|
| 获取版本 | GET `/api/openclaw/version` 获取 CLI 和网关版本 | `src/app/api/openclaw/version/route.ts` |
| 检查更新 | POST `/api/openclaw/update` (check) 调用 `update.check` | `src/app/api/openclaw/update/route.ts` |
| 执行更新 | POST `/api/openclaw/update` (install) SSE 流式执行 `openclaw update` | `src/app/api/openclaw/update/route.ts` |
| 更新弹窗 | 显示 changelog，实时显示 CLI 输出 | `src/components/UpdateDialog.tsx` |

#### 4.6 Architect Agent

| 功能 | 描述 | 核心文件 |
|------|------|----------|
| 就绪检查 | GET `/api/agent-architect/status` 检查 `agent-architect` 是否存在 | `src/app/api/agent-architect/status/route.ts` |
| 确保存在 | POST `/api/agent-architect/ensure` 幂等创建 | `src/app/api/agent-architect/ensure/route.ts` |

#### 4.7 诊断

| 功能 | 描述 | 核心文件 |
|------|------|----------|
| Agent 请求诊断 | GET/POST `/api/openclaw/agent-request-diagnostics` | `src/app/api/openclaw/agent-request-diagnostics/route.ts` |
| Agent 请求日志 | GET `/api/openclaw/agent-request-logs` 读取 `.jsonl/.log` 文件 | `src/app/api/openclaw/agent-request-logs/route.ts` |

#### 4.8 CLI 执行代理

| 功能 | 描述 | 核心文件 |
|------|------|----------|
| 白名单 CLI 执行 | POST `/api/openclaw/cli-exec` 仅允许 24 种预定义 CLI action | `src/app/api/openclaw/cli-exec/route.ts` |

---

### 5. 工具与集成

#### 5.1 WebSocket 客户端

| 功能 | 描述 | 核心文件 |
|------|------|----------|
| 连接池单例 | 通过 `globalThis` 维护单一 WS 连接，首次连接 28 秒超时 | `src/lib/openclaw/pool.ts` |
| 协议握手 | JSON-RPC over WebSocket，包含 challenge 握手、scope 声明 | `src/lib/openclaw/client.ts` |

#### 5.2 本地 SQLite

| 功能 | 描述 | 核心文件 |
|------|------|----------|
| 消息持久化 | 无 sessionKey 时消息存储本地 SQLite（WAL 模式） | `src/lib/db/index.ts` |

#### 5.3 安全

| 功能 | 描述 | 核心文件 |
|------|------|----------|
| 路径安全校验 | 禁止 `..`、绝对路径，解析后必须在 workspace 内 | `src/lib/openclaw/workspace-path.ts` |
| 导出脱敏 | 导出时将敏感字段替换为 `[REDACTED]` | `src/lib/openclaw/agent-export/redact-secrets-for-export.ts` |
| 配置脱敏 | `sanitizeConfig` 递归遍历配置对象脱敏敏感字段 | `src/app/api/openclaw/config/route.ts` |

---

## API 路由总表

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/chat` | GET/POST | 消息历史（GET）/ 流式发送（POST） |
| `/api/chat/abort` | POST | 中止运行中的 chat |
| `/api/agents` | GET | 列出所有 Agent |
| `/api/agents/[agentId]/export` | GET | 导出 Agent 为 ZIP |
| `/api/gateway/sessions` | GET/POST/DELETE | 会话列表/创建/删除 |
| `/api/gateway/sessions/patch` | POST | 修改会话配置 |
| `/api/gateway/status` | GET | 探测网关连接状态 |
| `/api/gateway/exec-approvals/stream` | GET | SSE 审批事件流 |
| `/api/gateway/exec-approvals/resolve` | POST | 提交审批决策 |
| `/api/openclaw/logs` | GET | SSE 网关实时日志流 |
| `/api/openclaw/update` | POST | 更新检查/执行 |
| `/api/openclaw/version` | GET | 获取 CLI/网关版本 |
| `/api/openclaw/config` | GET | 获取脱敏网关配置 |
| `/api/openclaw/models` | GET | 获取可用模型列表 |
| `/api/openclaw/cli-exec` | POST | 白名单 CLI 执行代理 |
| `/api/openclaw/cron` | GET/POST/DELETE | 定时任务管理 |
| `/api/openclaw/skills/status` | GET | 技能状态列表 |
| `/api/openclaw/skills/search` | GET | 搜索 ClaWHub 技能 |
| `/api/openclaw/skills/install` | POST | 安装技能 |
| `/api/openclaw/skills/session` | GET/POST | 会话级技能管理 |
| `/api/openclaw/skills/dev-tool-presence` | GET | 开发工具存在性探测 |
| `/api/openclaw/agent-request-diagnostics` | GET/POST | Agent 请求诊断 |
| `/api/openclaw/agent-request-logs` | GET | Agent 请求 JSONL 日志 |
| `/api/openclaw/default-model` | GET/POST | 默认模型读写 |
| `/api/openclaw/subagent-policy/patch` | POST | 子代理策略更新 |
| `/api/openclaw/mcp-servers/remove` | POST | 移除 MCP 服务 |
| `/api/agent-architect/status` | GET | Architect Agent 就绪检查 |
| `/api/agent-architect/ensure` | POST | 确保 Architect Agent 存在 |
| `/api/agent/workspace/[agentId]/file` | GET/PUT | 工作区文件读写 |
| `/api/agent/workspace/[agentId]/tree` | GET | 工作区目录树 |

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `OPENCLAW_GATEWAY_URL` | 网关 HTTP 地址 | `ws://127.0.0.1:18789` |
| `OPENCLAW_TOKEN` | 网关认证 token | - |
| `OPENCLAW_PASSWORD` | 网关认证密码 | - |
| `OPENCLAW_WS_HANDSHAKE_TIMEOUT_MS` | WS 握手超时 | 25000 |
| `OPENCLAW_POOL_CONNECT_TIMEOUT_MS` | 连接池超时 | 28000 |
| `OPENCLAW_CLI_EXEC_DISABLED` | 禁用 CLI 执行路由 | - |
| `OPENCLAW_CLI_PATH` | openclaw CLI 路径 | `openclaw` |
| `DATABASE_PATH` | SQLite 路径 | `./data/chat.sqlite` |
| `OPENCLAW_STATE_DIR` | Agent state 目录 | `~/.openclaw/agents` |
| `PLAYWRIGHT_E2E_PORT` | E2E 测试端口 | 3015 |

---

## 传输分层（不变量）

```
浏览器 ──HTTP/SSE──> Next.js (Node) ──WebSocket JSON-RPC──> OpenClaw 网关
```

- **浏览器 → Next.js**：仅 HTTP/SSE
- **Next.js → OpenClaw 网关**：WebSocket JSON-RPC
