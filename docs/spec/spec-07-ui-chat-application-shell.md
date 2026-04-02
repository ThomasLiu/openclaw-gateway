# Spec 07：聊天应用壳层（ChatApp、侧栏、标题栏）

## 功能概述

`apps/openclaw-chat/src/app/page.tsx` 仅渲染 `<ChatApp />`。  
`ChatApp.tsx` 为 **客户端组件**（`"use client"`），负责：

- **三栏布局**：左侧 Agent、中间会话列表、主区聊天、可选右侧 OpenClaw 日志/详情。
- **状态**：当前 `agentId`、`sessionKey`、消息列表、流式状态、网关连接、未读、CLI 版本等。
- **数据**：`fetch` `/api/gateway/sessions`、`/api/chat`、`/api/agents` 等；历史去重 `fetchChatHistoryJsonDeduped`；`subscribeDataHeartbeat` 定时刷新。
- **动态导入**：`ChatPanel`、`OpenClawLogsPanel` 等 **`ssr: false`**，避免 hydration mismatch（注释说明 Turbopack 热更新场景）。

## 主要子组件

| 组件 | 职责 |
| ---- | ---- |
| `AppTitleBar` | 顶栏：网关状态、命令入口、CLI 模态等 |
| `AgentSidebar` | Agent 列表切换、`OPENCLAW_AGENT_ARCHITECT_ID` 特殊标签；第二行与 `SessionSidebar` 会话行一致：取该 Agent 下 `gatewaySessions` 中 **`updatedAt` 最新**的一条（`pickLatestSessionRowForAgent`），左侧为 `sessionListPreviewLine`（无则「暂无消息」），右侧为 `formatSessionListRowTime`（`useNowTick` 驱动相对时间） |
| `SessionSidebar` | 会话列表、新建、删除、搜索、未读角标、Cron 会话标识；流式中行为 `StreamingWaveBar`（`globals.css` `.oc-stream-wave-bar`），仅「运行中」且非「待续跑」时行内 `pl-4`，避免文字贴齐浅绿波动区左缘 |
| `ChatPanel` | 消息区 +  composer（动态导入） |
| `OpenClawLogsPanel` | 日志侧栏（动态导入） |
| `GatewayAlertDialog` | 网关错误/告警弹窗 |

## 会话选择逻辑（须对照源码）

- `lib/chat-session-pick.ts`：`pickSessionForAgent`、`pickLatestEmptySessionForAgent`、`pickLatestSessionWithMessages`、`pickLatestSessionRowForAgent`（Agent 侧栏第二行预览）。
- **localStorage** key：`sessionKeyStorageKey(agentId)` 等。
- **标题缓存**：`session-list-title-cache.ts` — `deriveSessionTitleForSidebarIncludingPending`、`writeCachedSessionListTitle`。

## 与聊天发送相关的 Prompt 构建（注入到用户消息）

- **加模型向导**：`buildAddModelWizardUserPrompt`（`lib/add-model-wizard-prompt.ts`）。
- **定时任务向导 / AI 辅助**：`lib/cron-chat-prompts.ts`。
- **MCP 添加**：`lib/mcp-add-prompt.ts`。
- **Skill 安装**：`lib/skill-install-prompt.ts` + `SkillInstallScopeModal`。
- **会话记忆删除**：`session-memory-delete.ts` — 检测用户确认、日志 `debug-memory-delete.ts`。

## Agent 设计专家（Architect）

- 常量 `OPENCLAW_AGENT_ARCHITECT_ID`（`lib/openclaw-agent-architect/constants.ts`）。
- `POST /api/agent-architect/ensure` 确保工作区存在（`ensureOpenClawAgentArchitect`）。
- 工作区路径 API：`/api/agent/workspace/[agentId]`。

## 样式基线

- `app/globals.css` + Tailwind v4（`@tailwindcss/postcss`）。
- 深色主题为主（如 `bg-zinc-950`）。

## 复刻检查清单

- [ ] `ChatPanel` 必须 `dynamic(..., { ssr: false })` 若项目仍要求避免 hydration 问题。
- [ ] 会话切换时 `sessionKey` 与 `agentId` 一致性校验（`sessionKeyBelongsToAgent`）。
- [ ] 网关不可用时 UI 有明确告警（`GatewayAlertDialog`、标题栏状态）。
