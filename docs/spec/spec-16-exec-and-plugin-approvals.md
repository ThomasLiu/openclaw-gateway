# Spec 16：Shell / 插件执行审批（人机确认）

## 功能概述

OpenClaw 网关在 Agent 执行 shell 或部分插件动作前，可按安全策略（如 allowlist 未命中）通过 **`exec.approval.request`** 暂停并广播 **`exec.approval.requested`**；用户通过控制端 **`exec.approval.resolve`** 选择 `allow-once` | `allow-always` | `deny`。插件类审批使用 **`plugin.approval.*`** 平行协议。

上游参考：

- 网关 RPC：`ai-reference-sources/openclaw/src/gateway/server-methods/exec-approval.ts`、`plugin-approval.ts`
- 官方控制 UI 视图：`ai-reference-sources/openclaw/ui/src/ui/views/exec-approval.ts`、`app-gateway.ts`（事件路由）

本应用 **`OpenClawClient` 仅在 Node 服务端连接池**（`getOpenClawClient()`）中持有 WebSocket，浏览器无法直接收网关事件。因此增加 **SSE 桥** 与 **HTTP 代理解析**，行为与官方 UI 对齐。该分层与聊天 SSE 同属 **「浏览器只认 Next HTTP/SSE；网关侧 WS 池化」** 的统一模式（见 [spec-02](./spec-02-gateway-config-ws-client.md)「浏览器边界与传输分层」）。

## 服务端：`OpenClawClient`（`apps/openclaw-chat/src/lib/openclaw/client.ts`）

- 在 WS `message` 中识别 `type: "event"` 且 `event` 为：
  - `exec.approval.requested` / `exec.approval.resolved`
  - `plugin.approval.requested` / `plugin.approval.resolved`
- 将 `payload`（或 `data`）转发给 `broadcastExecApprovalBridge`（`lib/openclaw/exec-approval-bridge.ts`），供多订阅者消费。
- 新增 RPC 封装：
  - `execApprovalResolve({ id, decision })` → `exec.approval.resolve`
  - `pluginApprovalResolve({ id, decision })` → `plugin.approval.resolve`

单例守卫（`openclaw-client-singleton-guard.ts`）将上述两方法纳入「新版客户端」探测，避免 HMR 留下旧实例。

## 桥接：`exec-approval-bridge.ts`

- `subscribeExecApprovalBridge(listener)`：SSE Route 在 `start` 时订阅，`cancel` 时取消。
- `broadcastExecApprovalBridge({ event, payload })`：WS 收到网关事件时调用。

## HTTP API

| 路由 | 方法 | 行为 |
| ---- | ---- | ---- |
| `/api/gateway/exec-approvals/stream` | GET | **SSE**（`text/event-stream`）。连接前 `await getOpenClawClient()` 确保池化 WS 已建立；首包 `hello`；周期性 `ping`；网关事件以 `{ type: "gateway", event, payload }` 写入 `data:`。503 当网关不可用。 |
| `/api/gateway/exec-approvals/resolve` | POST | JSON：`{ id: string, decision: "allow-once" \| "allow-always" \| "deny", kind?: "exec" \| "plugin" }`。默认 `kind: "exec"`；插件队列项传 `plugin`。内部调用对应 `OpenClawClient` 方法。 |

`runtime = "nodejs"`（与池化 `ws` 一致）。

## 前端：`ExecApprovalOverlay.tsx`

- 挂载于 `ChatApp` 根节点；`z-index` 须**高于**顶栏（`AppTitleBar` 为 `z-200`）与「常用指令」下拉（`z-300`），否则全屏遮罩可能被顶栏层截获点击；当前为 **`z-[340]`**。
- `EventSource` 订阅上述 SSE；解析 `type === "gateway"` 的消息，用 `lib/exec-approval-gateway.ts` 中与上游一致的 **`parseExecApprovalRequested` / `parsePluginApprovalRequested` / `parseExecApprovalResolved`** 维护 FIFO 队列（多条时展示 **N pending**）。
- 按钮 **Allow once / Always allow / Deny** → POST `/api/gateway/exec-approvals/resolve`。
- 过期时间与官方一致：按 `expiresAtMs` 定时从队列移除；收到 `*.resolved` 时移除。

## 复刻检查清单

- [ ] 网关侧 `hasExecApprovalClients` 将会话算作审批端：连接使用 `scopes` 含 `operator.admin`（与既有 `connect` 一致）。
- [ ] 无浏览器直连网关 WS；审批仅经 SSE + POST。
- [ ] 插件与 exec 使用正确的 `resolve` method 与 `kind`。
