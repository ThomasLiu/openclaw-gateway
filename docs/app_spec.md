# openclaw-gateway 功能规格索引（Spec Suite）

## 文档目的

本目录按**功能点**拆分为多份 `spec-*.md`，与 `apps/openclaw-chat` 及仓库根脚本、清单对齐，粒度足以让 **AI 在无仓库上下文时从零复刻** 本项目的架构、协议、路由、数据流与 UI 行为。

## 阅读顺序（建议）

| 序号 | 文档 | 覆盖范围 |
| ---- | ---- | -------- |
| 01 | [spec-01-monorepo-and-tooling.md](./spec-01-monorepo-and-tooling.md) | pnpm workspace、脚本、Next 配置、依赖 |
| 02 | [spec-02-gateway-config-ws-client.md](./spec-02-gateway-config-ws-client.md) | 网关 URL/鉴权、`OpenClawClient`、连接池、单例守卫 |
| 03 | [spec-03-api-chat-streaming-and-abort.md](./spec-03-api-chat-streaming-and-abort.md) | `/api/chat` SSE、`/api/chat/abort`、流与中止 |
| 04 | [spec-04-api-sessions-and-agents.md](./spec-04-api-sessions-and-agents.md) | `/api/gateway/sessions`、`/api/agents`、会话规范化 |
| 05 | [spec-05-sqlite-local-messages.md](./spec-05-sqlite-local-messages.md) | `lib/db`、本地消息表、与网关历史双源策略 |
| 06 | [spec-06-openclaw-admin-proxy-routes.md](./spec-06-openclaw-admin-proxy-routes.md) | `/api/openclaw/*` 代理（config、models、skills、cron、MCP、CLI 等） |
| 07 | [spec-07-ui-chat-application-shell.md](./spec-07-ui-chat-application-shell.md) | `ChatApp`、侧栏、标题栏、动态导入、网关告警 |
| 08 | [spec-08-ui-chat-panel-composer-and-pretext.md](./spec-08-ui-chat-panel-composer-and-pretext.md) | `ChatPanel`、Pretext 测高、草稿、发送 |
| 09 | [spec-09-message-rendering-markdown-tools.md](./spec-09-message-rendering-markdown-tools.md) | 消息分组、Markdown、工具卡、附件、JSON 折叠 |
| 10 | [spec-10-right-panel-features.md](./spec-10-right-panel-features.md) | 右侧面板 Tab、日志、Agent 请求、定时任务、Skill、MCP、模型 |
| 11 | [spec-11-session-state-unread-and-caching.md](./spec-11-session-state-unread-and-caching.md) | 未读、已读、历史缓存、data heartbeat、会话标签 |
| 12 | [spec-12-agent-architect-and-diagnostics.md](./spec-12-agent-architect-and-diagnostics.md) | Agent 设计专家、工作区 API、诊断与 JSONL |
| 13 | [spec-13-integration-manifest-and-drift.md](./spec-13-integration-manifest-and-drift.md) | `openclaw-integration.manifest.json`、`openclaw:drift` |
| 14 | [spec-14-reference-sources-scripts.md](./spec-14-reference-sources-scripts.md) | `ai-reference-sources`、pull/manifest/dev 脚本 |
| 15 | [spec-15-testing-and-e2e.md](./spec-15-testing-and-e2e.md) | Vitest、Playwright、关键单测约定 |
| 16 | [spec-16-exec-and-plugin-approvals.md](./spec-16-exec-and-plugin-approvals.md) | Shell/插件审批、SSE 桥、`exec.approval.resolve` |
| 17 | [spec-17-agent-export-zip.md](./spec-17-agent-export-zip.md) | `GET /api/agents/[agentId]/export`、zip 布局、导入脚本、E2E 夹具与端口 |

## 维护约定

- 任何**影响行为**的代码改动（路由、协议字段、环境变量、UI 流程、数据模型）须在**同一任务收尾**更新对应 `spec-*.md`，**精度**与本文档集一致：须写明路径、请求/响应形状、错误码、与 OpenClaw 网关方法的对应关系（可引用 `ai-reference-sources/openclaw/...` 文件路径，避免易变行号）。
- 新增功能：新增一份 `spec-NN-*.md` 或扩写最接近的一份，并**回写本索引表**。
- 纯重构且对外行为不变：可在索引或相关 spec 中加一行「某日期确认行为未变」；若触及 `integrates` 清单，仍建议跑 `pnpm openclaw:drift` 并在 spec-13 记一笔。

## 全局不变量（复刻时须满足）

- **应用包名**：`apps/openclaw-chat`，Next **开发端口** `3005`（见该包 `package.json` 的 `dev`/`start`）。
- **传输分层（统一模式）**：**浏览器只使用 Next 的 HTTP/SSE**（`fetch`、`EventSource`、SSE 流）；**OpenClaw 侧仍由 Node 内池化 `OpenClawClient` 使用 WebSocket**（一条或按域拆分多条，仍为 WS）。聊天 SSE、审批 SSE 桥、其余 `/api/gateway/*` 代理均属同一模式（详见 spec-02「浏览器边界与传输分层」、spec-03、spec-16）。
- **网关协议**：通过 WebSocket JSON-RPC 帧（`type: req|res|event`）与本地 OpenClaw 网关通信；`OpenClawClient` 使用 `connect` 握手、`chat.send` + `event: chat` 流式增量等（详见 spec-02、spec-03）。
- **运行时**：涉及 `better-sqlite3`、`ws`、子进程 CLI 的 Route 使用 `export const runtime = "nodejs"`。
- **上游对照**：业务语义以仓库内实现为准；深度对齐时查阅本机 `ai-reference-sources/openclaw/`（见 spec-14）。
