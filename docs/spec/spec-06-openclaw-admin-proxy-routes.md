# Spec 06：`/api/openclaw/*` 管理代理与其它网关相关 API

## 说明

以下 Route 均 **`runtime = "nodejs"`**，多数通过 **`getOpenClawClient()`** 调网关 RPC，或读本地文件/子进程。路径均相对于 `apps/openclaw-chat/src/app/api/`。

## 配置与模型

| 路径 | 方法 | 作用 |
| ---- | ---- | ---- |
| `openclaw/config/route.ts` | **GET** | `getOpenClawClient()` → `configGet()`，返回网关脱敏配置快照（含 `hash`）；`dynamic = force-dynamic`；失败 `500` `{ error }` |
| `openclaw/subagent-policy/patch/route.ts` | **POST** | Body：`baseHash`、`kind`（`defaults` \| `tools` \| `agent`）、`agentId?`（`kind=agent` 必填）、`subagents`（对象或 `null` 移除）；构造 merge-patch 后 `config.patch`；`409 STALE_HASH`；**库**：`lib/subagent-policy.ts` |
| `openclaw/default-model/route.ts` | GET/POST | 默认模型读写，配合 `lib/openclaw/default-model-from-config.ts` |
| `openclaw/models/route.ts` | GET | `models.list` → `ModelManagementTabContent` / `add-model-wizard-prompt` |

## MCP

| 路径 | 作用 |
| ---- | ---- |
| `openclaw/mcp-servers/remove/route.ts` | 从配置移除 MCP 服务；与 merge-patch 语义对齐 upstream |

**库**：`lib/mcp-services-from-config.ts`、`lib/mcp-add-prompt.ts`。

## Skills

| 路径 | 作用 |
| ---- | ---- |
| `openclaw/skills/status/route.ts` | `skills.status` |
| `openclaw/skills/install/route.ts` | `skills.install` |
| `openclaw/skills/search/route.ts` | 技能搜索（若实现） |
| `openclaw/skills/session/route.ts` | 会话级技能 |
| `openclaw/skills/dev-tool-presence/route.ts` | 开发工具存在探测；`lib/dev-tool-presence.ts` |

## Cron

| 路径 | 作用 |
| ---- | ---- |
| `openclaw/cron/route.ts` | `cron.list` / update / remove 等（与 `lib/openclaw/cron-ui.ts`、右栏「定时任务」一致） |

## CLI 执行（白名单）

| 路径 | 作用 |
| ---- | ---- |
| `openclaw/cli-exec/route.ts` | `POST`：白名单子命令，`spawn` 流式输出 stdout/stderr；`OPENCLAW_CLI_EXEC_DISABLED=1` → `503`；`maxDuration = 600`；`dynamic = force-dynamic` |

**配置**：`config/openclaw-cli-actions.ts` — `isOpenClawCliExecAction`、`getOpenClawCliExecArgv`；二进制 `OPENCLAW_CLI_PATH` 或默认 `openclaw`。

## 日志与版本 / 更新

| 路径 | 作用 |
| ---- | ---- |
| `openclaw/logs/route.ts` | 流式读日志（如 tail） |
| `openclaw/version/route.ts` | CLI/网关版本信息 |
| `openclaw/update/route.ts` | 更新检查或触发 |

## Agent 请求诊断

| 路径 | 作用 |
| ---- | ---- |
| `openclaw/agent-request-diagnostics/route.ts` | 诊断数据；`lib/openclaw/agent-request-diagnostics.ts` |
| `openclaw/agent-request-logs/route.ts` | Agent 请求日志列表/内容 |

## `GET /api/gateway/status`（`api/gateway/status/route.ts`）

- **不**复用连接池：每次 `new OpenClawClient(config)`，探测后 `disconnect()`。
- **超时**：`PROBE_MS = 12000`。
- **成功**：`{ ok: true, connected: true, source: "ws" }`。
- **失败**：尝试 `tryGatewayStatusViaCli()`（`lib/openclaw/cli-status.ts`）；若 CLI 报告网关仍 up，可返回 `source: "cli"` 与说明文案。
- **`dynamic = "force-dynamic"`**。

## 复刻检查清单

- [ ] 每个 Route 的 HTTP 方法、状态码、JSON 形状与 UI 调用处一致（搜 `fetch("/api/openclaw`）。
- [ ] `cli-exec` 仅允许白名单 action，禁止任意 shell。
- [ ] `config.patch` 类操作必须带 `baseHash`（网关要求）。
