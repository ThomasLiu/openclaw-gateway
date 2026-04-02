# Spec 12：Agent 设计专家、工作区与诊断

## Agent 设计专家（Architect）

- **常量**：`OPENCLAW_AGENT_ARCHITECT_ID` 于 `lib/openclaw-agent-architect/constants.ts`。
- **确保**：`lib/openclaw-agent-architect/ensure-architect.ts` — `ensureOpenClawAgentArchitect()`；由 `POST /api/agent-architect/ensure` 调用。
- **状态**：`/api/agent-architect/status`（若存在）查询是否已就绪。

## 工作区 API

- **`/api/agent/workspace/[agentId]`**（`app/api/agent/workspace/[agentId]/route.ts`）：返回或校验该 Agent 工作区路径（与 `apps/openclaw-chat` 实现一致）；**仅**面向 OpenClaw 引导用 Markdown 根文件名（`WORKSPACE_MARKDOWN_BASENAMES` 等），`GET ?file=` 与 `PUT` 仍限制为允许列表内的 basename。

### 工作区目录树与任意相对路径文件（右栏「工作区」Tab）

- **路径解析**：`lib/openclaw/workspace-path.ts` 的 **`safeWorkspaceRelativePath(workspaceDir, rel)`** — 仅允许不含 `..` / `.` 段的 POSIX 相对路径，解析结果必须落在工作区根之下（与既有 `safeWorkspaceFilePath` 的单层 basename 规则互补）。
- **树列举**：`GET /api/agent/workspace/[agentId]/tree`（`app/api/agent/workspace/[agentId]/tree/route.ts`）
  - Query：`maxDepth`（默认 `10`，上限 `20`）。
  - 响应：`{ workspaceDir, agentId, tree: WorkspaceTreeNode[] }`，节点为嵌套 `{ name, relPath, type: 'file'|'dir', size?, children? }`。
  - 实现：`lib/openclaw/workspace-explore.ts` 的 `listWorkspaceTree`；默认跳过 `node_modules`、`.git`、`.next`、常见构建目录等以控制体积；单目录最多约 500 项。
- **读写文本文件**：`GET` / `PUT` **`/api/agent/workspace/[agentId]/file`**（`app/api/agent/workspace/[agentId]/file/route.ts`）
  - `GET`：`?path=` URL 编码的相对路径（POSIX）。成功：`{ workspaceDir, agentId, path, content }`。`413` 超大、`415` 探测为二进制（首段含 `\\0`）、`404` 非文件。
  - `PUT`：JSON `{ path, content }`，UTF-8，单文件上限与旧路由一致（约 2MiB）。
  - 写入前对已有路径做 `realpath` 校验（`assertWorkspaceTargetSafe`），降低符号链接逃逸风险。

## Agent 列表与 UI

- **`/api/agents`** 对 Architect 返回中文标签「Agent 设计专家」。
- **`AgentSidebar`** 中高亮与切换逻辑。

## Agent 请求诊断与日志

- **`lib/openclaw/agent-request-diagnostics.ts`**、**`agent-request-diagnostics-shared.ts`**：诊断聚合。
- **`lib/openclaw/agent-request-log-files.ts`**：日志文件路径与读取。
- **`lib/openclaw/agent-request-jsonl-summary.ts`**：JSONL 摘要；单测 `agent-request-jsonl-summary.test.ts`。
- **`lib/openclaw/agent-request-context-filters-persist.ts`**：上下文过滤器持久化。

## API Routes

- `GET/POST` `api/openclaw/agent-request-diagnostics`：诊断数据。
- `api/openclaw/agent-request-logs`：日志内容。

## 复刻检查清单

- [ ] Architect ID 在前后端常量一致。
- [ ] `ensure` 幂等：`alreadyExists`、workspace 路径返回字段与 UI 一致。
- [ ] 诊断与日志接口不泄露敏感绝对路径到错误 UI（若需脱敏，以源码为准）。
