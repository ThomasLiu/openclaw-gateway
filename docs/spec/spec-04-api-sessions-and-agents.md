# Spec 04：`/api/gateway/sessions` 与 `/api/agents`

## `/api/gateway/sessions`（`app/api/gateway/sessions/route.ts`）

**运行时**：`nodejs`。

### `POST` — `sessions.create` 代理

- **用途**：供侧栏「新会话」等**显式**创建；**不会**在切换 Agent 或列表为空时由前端自动调用（见 `ChatApp.tsx`）。
- **Body**：`{ agentId?: string; label?: string }`。
- **校验**：`agentId` 必填 trim；JSON 非法 → `400`。
- **行为**：`getOpenClawClient()` → `client.sessionsCreate({ agentId, label? })`。
- **成功**：`{ ok: true, key }`（会话 key）。
- **失败**：`500` `{ error }`。

### `GET` — `sessions.list` + 规范化 + 可选 enrich

- **Query**：`limit`（默认 100，最大 200）、`activeMinutes`（可选正数）、`search`（可选）、`spawnedBy`（可选；父会话 key，列出由该会话派生的子会话）、`agentId`（可选；仅列出该 Agent 作用域内会话）。
- **行为**：  
  - `client.listSessions({ includeGlobal: true, includeUnknown: true, limit, includeDerivedTitles: true, includeLastMessage: true, activeMinutes?, search?, spawnedBy?, agentId? })`。  
  - 将原始 `sessions` 数组每项 `normalizeGatewaySessionRow`。  
  - 对缺 **preview** 或 **title** 的项批量 `chunkKeys` + `sessionsPreview`（每批最多 64 keys）调用 `enrichSessionsFromPreview`。

**相关库**：`lib/gateway-session-normalize.ts`、`lib/gateway-session-label.ts`、`lib/gateway-session-error.ts`（格式化错误展示）。

**`normalizeGatewaySessionRow` 额外字段**（与 `GatewaySessionRow` / `chat-types` 一致）：`model`、`modelProvider`、`spawnedBy`、`subagentRole`（来自网关 `sessions.list` 行）。

### `POST` — `sessions.patch` 代理（`app/api/gateway/sessions/patch/route.ts`）

- **Body**：`{ key: string; model: string | null }`（`model` 必填键；`null` 表示清除会话级模型覆盖）。
- **校验**：`key` trim 非空；JSON 非法 → `400`；缺 `model` 键 → `400`。
- **行为**：`getOpenClawClient()` → `client.sessionsPatch({ key, model })`（与 OpenClaw 控制 UI 一致）。
- **成功**：转发网关 `SessionsPatchResult` JSON。
- **失败**：`500` `{ error }`。
- **上游**：`ai-reference-sources/openclaw/src/gateway/server-methods/sessions.ts` — `sessions.patch`；参数 schema 见 `ai-reference-sources/openclaw/src/gateway/protocol/schema/sessions.ts` — `SessionsPatchParamsSchema`（`model` 为可选 `NonEmptyString | null`）。

## `/api/agents`（`app/api/agents/route.ts`）

- **GET**：`listAgentsFromOpenClawJson()`，映射为 `{ agents: [{ id, label }] }`。
- **标签**：若 `id === OPENCLAW_AGENT_ARCHITECT_ID`（Agent 设计专家常量），`label` 为中文「Agent 设计专家」，否则 `label === id`。
- **错误**：`500` `{ error }`。

## 相关：`GET /api/agents/[agentId]/export`

单 Agent 配置与 workspace/技能目录 zip 导出（响应 `application/zip`），见 [spec-17-agent-export-zip.md](./spec-17-agent-export-zip.md)。

## 会话 key 与 Agent 作用域（全局约定）

- UI 与 `ChatApp` 使用 `sessionKeyBelongsToAgent`、`extractAgentIdFromSessionKey` 等（`lib/chat-session-agent.ts` 等）判断会话是否属于当前 Agent。
- **Cron 会话**过滤：`isCronSessionKey`（`lib/chat-session-filters.ts`）。

## 复刻检查清单

- [ ] `sessions.list` 参数与网关 `server-methods/sessions.ts` 一致。
- [ ] `normalizeGatewaySessionRow` 输出字段与 UI `GatewaySessionRow` / `chat-types` 对齐。
- [ ] enrich 批大小与网关 `sessions.preview` 限制一致（64）。
