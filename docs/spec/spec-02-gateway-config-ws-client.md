# Spec 02：网关配置、WebSocket 客户端与连接池

## 功能概述

应用通过 **`OpenClawClient`**（`apps/openclaw-chat/src/lib/openclaw/client.ts`）与本地 OpenClaw 网关建立 **WebSocket**，完成握手后使用 JSON-RPC 风格请求（`type: "req"` / `type: "res"`）及 **`event: chat`** 流式事件。服务端通过 **`getOpenClawClient()`**（`lib/openclaw/pool.ts`）维护 **单例** 连接，避免多请求重复建连。

## 浏览器边界与传输分层（统一模式）

| 层级 | 协议 | 职责 |
| ---- | ---- | ---- |
| **浏览器 ↔ Next.js** | **HTTP**（JSON Route、`fetch`）与 **SSE**（`EventSource` 或 `ReadableStream` 的 `text/event-stream`） | UI 只认本应用 origin 下的 API；**不**直连 OpenClaw 网关 WebSocket。 |
| **Next.js（Node）↔ OpenClaw 网关** | **WebSocket**（单例池化，可按将来需要拆成多条连接，但仍是 WS） | `OpenClawClient` 发 `req`、收 `res` 与 `event`（`chat`、`exec.approval.*` 等）。 |

**同类桥接**（同一套「服务端订 WS → 浏览器用 SSE/HTTP」）：

- **聊天流式**：`POST /api/chat` 在 Route 内 `getOpenClawClient()`，订阅 `chat.delta` / `chat.final` / `chat.error`，再写入 **SSE** 响应体（见 [spec-03](./spec-03-api-chat-streaming-and-abort.md)）。
- **Shell/插件审批**：池化 WS 收到 `exec.approval.*` / `plugin.approval.*` → `exec-approval-bridge` → `GET /api/gateway/exec-approvals/stream`（**SSE**）；用户决策 → `POST /api/gateway/exec-approvals/resolve` → `execApprovalResolve`（仍走 WS `req`）（见 [spec-16](./spec-16-exec-and-plugin-approvals.md)）。
- **其余网关能力**（sessions、config、cron、skills 等）：一般为 **单次 JSON** Route，内部 **`getOpenClawClient()` + `request(method)`**，浏览器侧仅 `fetch` 对应 `/api/...`。

**不变量**：只要 OpenClaw 官方网关仍以 **WS JSON-RPC + 事件推送** 为主协议，本应用 **无法在浏览器层去掉「服务端 WS」**；能统一的是 **浏览器侧永远只面对 Next 的 HTTP/SSE**。

## 配置来源：`getGatewayConfig()`（`lib/openclaw/config.ts`）

### 类型

```ts
export type GatewayAuthConfig = {
  gatewayUrl: string;  // http(s) 基址，不含 path
  token?: string;
  password?: string;
};
```

### 解析优先级

1. **若设置 `OPENCLAW_GATEWAY_URL`（环境变量）**  
   - **URL**：`normalizeHttpBase`：若用户误写 `ws://` / `wss://`，会替换为 `http` / `https` 再用于构造 WS URL。  
   - **凭据**：`OPENCLAW_TOKEN` / `OPENCLAW_PASSWORD`；若未设置，则 **回退读取** `~/.openclaw/openclaw.json` 中 `gateway.auth`（与官方 Web UI 行为一致，避免「只配了 URL 却空 token」）。

2. **若未设置 `OPENCLAW_GATEWAY_URL`**  
   - 必须存在 `~/.openclaw/openclaw.json`。  
   - `gatewayUrl` = `http://127.0.0.1:${port}`，其中 `port = config.gateway?.port ?? 18789`。  
   - `token` / `password` 来自 `gateway.auth`。

3. **若既无 env URL 又无配置文件**  
   - `getGatewayConfig()` **抛错**（提示设置 `OPENCLAW_GATEWAY_URL` 或安装 OpenClaw）。

### Agent 列表（非网关 RPC，仅读配置）

`listAgentsFromOpenClawJson()`：读取 `openclaw.json` 中 `agents.list`；若不存在或为空则返回 `[{ id: "main" }]`。用于 `/api/agents` 与 UI Agent 侧栏。

## `OpenClawClient` 连接与握手

### WebSocket URL

- `gatewayUrl.replace(/^http/, "ws")` → `ws://` 或 `wss://`。

### 本地回环 Origin

若 URL 含 `localhost` 或 `127.0.0.1`，构造 `WebSocket` 时设置 `headers: { Origin: gatewayUrl }`（与部分网关校验一致）。

### 握手超时

- `OPENCLAW_WS_HANDSHAKE_TIMEOUT_MS`（默认 `25000`）：在收到 `connect.challenge` 并完成 `connect` 请求前若超时则关闭连接并 reject。

### 握手序列

1. 服务端收到 `type: "event"`, `event: "connect.challenge"`。
2. 客户端调用 `request("connect", { minProtocol: 3, maxProtocol: 3, client: { id: "openclaw-control-ui", version: "clawui-backend", mode: "webchat", platform: process.platform }, caps: [], auth: { token, password }, role: "operator", scopes: ["operator.admin", "operator.approvals", "operator.write", "operator.read"] })`。
3. 成功后 `connected = true`，`emit("connected")`。

**注意**：若连接在握手完成前被关闭，`connect()` 必须 reject（`WebSocket closed before connect completed`），否则池上单例会永久挂起。

### 请求/响应

- 发送：`{ type: "req", id: UUID, method, params }`。
- 响应：`{ type: "res", id, ok, payload? | error? }`。
- 超时默认 60s（`request` 第三个参数可覆盖）。

### `event: chat`（流式）

- `payload.state`: `"delta"` | `"final"` | `"error"`。
- `payload.sessionKey`、`payload.runId`。
- **正文提取**：优先 `extractAssistantTextFromGatewayMessage(payload.message)`，勿仅用 `content[0].text`（避免 final 空串）。
- 事件转发：`chat.delta`、`chat.final`、`chat.error`。

## 连接池：`getOpenClawClient()`（`pool.ts`）

- 使用 `globalThis` 上 **单例** `OpenClawClient`。
- `OPENCLAW_POOL_CONNECT_TIMEOUT_MS`（默认 `28000`）包裹 `connect()`，超时则 `disconnect` 并清空单例。
- `shouldReplaceOpenClawClientSingleton(client)`（`openclaw-client-singleton-guard.ts`）：若客户端缺新版方法（如 `configGet` / `modelsList`），则替换并抛错提示重启进程。
- `disconnected` 事件：清空单例引用以便下次重连。

## 客户端主要 RPC 方法（实现须与网关一致）

| 方法 | 网关 method | 备注 |
| ---- | ------------- | ---- |
| `sendChatMessageStreaming` | `chat.send` | 返回 `runId`；`sessionKey` 非 `agent:` 前缀时规范为 `agent:${agentId}:chat:${thread}` |
| `abortChat` | `chat.abort` | 可选 `runId` |
| `fetchChatHistory` | `chat.history` | |
| `listSessions` | `sessions.list` | 含 `includeDerivedTitles`、`includeLastMessage` 等 |
| `sessionsPreview` | `sessions.preview` | 批量 keys |
| `sessionsCreate` | `sessions.create` | |
| `sessionsDelete` | `sessions.delete` | |
| `sessionsPatch` | `sessions.patch` | |
| `modelsList` | `models.list` | |
| `configGet` | `config.get` | |
| `configPatch` | `config.patch` | 需 `baseHash` |
| `cronList` / `cronUpdate` / `cronRemove` | `cron.*` | |
| `skillsStatus` / `skillsInstall` | `skills.*` | |
| `sendChatMessageBlocking` | `chat.send` + `agent.wait` + `chat.history` | 非 UI 主路径 |
| `execApprovalResolve` / `pluginApprovalResolve` | `exec.approval.resolve` / `plugin.approval.resolve` | 人机审批；见 [spec-16](./spec-16-exec-and-plugin-approvals.md) |

### 网关事件（非 `chat`）

- `exec.approval.requested` / `exec.approval.resolved`、`plugin.approval.requested` / `plugin.approval.resolved`：由客户端转发至 `exec-approval-bridge`，再经 SSE 供浏览器展示审批 UI（见 spec-16）。

## 环境变量汇总（与本 spec 相关）

| 变量 | 作用 |
| ---- | ---- |
| `OPENCLAW_GATEWAY_URL` | 网关 HTTP 基址 |
| `OPENCLAW_TOKEN` / `OPENCLAW_PASSWORD` | 鉴权 |
| `OPENCLAW_WS_HANDSHAKE_TIMEOUT_MS` | 握手超时 |
| `OPENCLAW_POOL_CONNECT_TIMEOUT_MS` | 池连接超时 |

## 复刻检查清单

- [ ] WS 握手与 `connect` 载荷字段与网关一致（尤其 `client.id` 与 `scopes`）。
- [ ] `chat` 事件正文提取使用 `extractAssistantTextFromGatewayMessage`。
- [ ] 单例池在超时、断线、版本不匹配时正确丢弃客户端。
