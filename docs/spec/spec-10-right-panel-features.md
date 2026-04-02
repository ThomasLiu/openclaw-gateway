# Spec 10：右侧面板（OpenClawRightPanel）

## Tab 定义（`components/right-panel/types.ts`）

```ts
export type RightPanelTabId =
  | "logs"
  | "agentRequest"
  | "scheduledTasks"
  | "skills"
  | "mcpServices"
  | "subagent"
  | "modelManagement"
  | "workspace"
  | "agent";

export const RIGHT_PANEL_TABS: ReadonlyArray<{ id: RightPanelTabId; label: string }> = [
  { id: "logs", label: "日志" },
  { id: "agentRequest", label: "Agent 请求" },
  { id: "scheduledTasks", label: "定时任务" },
  { id: "skills", label: "Skill" },
  { id: "mcpServices", label: "MCP" },
  { id: "subagent", label: "Subagent" },
  { id: "modelManagement", label: "模型管理" },
  { id: "workspace", label: "工作区" },
  { id: "agent", label: "agent信息" },
];
```

新增 Tab 须同时扩展 **类型**、**RIGHT_PANEL_TABS**、**`OpenClawRightPanel` 内容区**。

## 主容器

- **`OpenClawRightPanel.tsx`**：Tab 切换、布局、与 `ChatApp` 的 props 交互（当前会话、agentId 等）。

## 各 Tab 内容组件（文件名）

| Tab id | 组件文件 | 职责摘要 |
| -------- | -------- | -------- |
| logs | 与 `OpenClawLogsPanel` 或内嵌日志视图配合 | 拉取 `/api/openclaw/logs` 流 |
| agentRequest | `AgentRequestLogsTabContent.tsx` | JSONL/诊断摘要、`JsonlLogViewer` |
| scheduledTasks | `ScheduledTasksTabContent.tsx` + `use-scheduled-cron-tasks.ts` | `cron.list`、编辑、`ScheduledTaskJsonModal` |
| skills | `SkillsTabContent.tsx` + `SkillInstallScopeModal.tsx` | `skills.status` / install、推荐 `skill-recommendations.json` |
| mcpServices | `McpServicesTabContent.tsx` + `McpDeleteConfirmDialog.tsx` | 配置 MCP、删除确认 |
| subagent | `SubagentTabContent.tsx` + `lib/subagent-policy.ts` + `SubagentPolicyEditModal.tsx` | （1）全局 `agents.defaults.subagents` / `tools.subagents` / 按 `agents.list[].subagents` 展示已配置策略；（2）当前 Agent 合并后策略（`allowAgents` 等）；（3）**当前会话**子会话：`GET /api/gateway/sessions?spawnedBy=&agentId=`；子会话历史：`GET /api/chat`；直接编辑经 **`POST /api/openclaw/subagent-policy/patch`**；Agent 协助与 Skill 同模式（`onStartSubagentAssistWizard`）；`ChatApp` 提供 `onSelectSessionKey` |
| modelManagement | `ModelManagementTabContent.tsx` | `models.list`、默认模型、向导 prompt |
| workspace | `WorkspaceExplorerTabContent.tsx` + `WorkspaceFileEditModal.tsx` | 当前 Agent 工作区目录树：`GET /api/agent/workspace/[agentId]/tree`；点击文件打开弹窗：`GET`/`PUT /api/agent/workspace/[agentId]/file`；只读预览用 Monaco `Editor`，点「编辑」后切换为 Monaco `DiffEditor`（左=打开时基线、右=当前编辑，类 git diff）；依赖 `@monaco-editor/react` |
| agent | 展示 agent 元信息 | 与 `/api/agents`、工作区路径等 |

## 辅助组件

- **`RightPanelTabBar.tsx`**：Tab 切换条；Tab 较多时 **横向滚动**（`overflow-x-auto`、`min-w-0`），避免撑开右栏宽度导致整页横向滚动。右栏容器 `OpenClawRightPanel` 的 `<aside>` 使用 **`min-w-0` + `overflow-hidden`**，与 flex 子项默认 `min-width:auto` 对抗。
- **`JsonlLogViewer.tsx`**：日志 JSONL 查看。
- **`ScheduledTaskJsonModal.tsx`**：定时任务 JSON 详情。

## 定时任务 Hook

- **`use-scheduled-cron-tasks.ts`**：拉取、刷新、错误状态；与 `lib/openclaw/cron-ui.ts` 类型对齐。

## 复刻检查清单

- [ ] 每个 Tab 请求的 API 与 spec-06 一致。
- [ ] `SkillInstallScopeModal` 与 `skill-install-prompt` 的流程一致。
- [ ] MCP 删除走 `merge-patch` 语义与 `mcp-servers/remove` 路由。
