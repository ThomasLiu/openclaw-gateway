# Spec 03：`/api/chat` 与流式中止

## 功能概述

- **`GET /api/chat`**：拉取会话消息列表；可选从 **网关 `chat.history`** 或 **本地 SQLite** 读取（双源策略见 spec-05）。
- **`POST /api/chat`**：**Server-Sent Events (SSE)** 流式推送助手输出；底层通过 `OpenClawClient` 的 `chat.send` 与 `event: chat` 订阅（**浏览器不直连网关 WS**，见 spec-02「浏览器边界与传输分层」）。
- **`POST /api/chat/abort`**：显式调用网关 `chat.abort`（不依赖 SSE 请求的 `AbortSignal` 可靠性）。

**实现文件**：`apps/openclaw-chat/src/app/api/chat/route.ts`、`app/api/chat/abort/route.ts`。  
**运行时**：`export const runtime = "nodejs"`。

## `GET /api/chat`

### Query 参数

| 参数 | 必填 | 说明 |
| ---- | ---- | ---- |
| `agentId` | 是 | 非空 trim |
| `sessionKey` | 否 | 若存在，走网关历史 |
| `limit` | 否 | 默认 200，clamp 到 `[1, 1000]` |

### 分支

1. **有 `sessionKey`**  
   - `getOpenClawClient()` → `client.fetchChatHistory(sessionKey, historyLimit)` → `gatewayHistoryToUiMessages(history)`。  
   - 响应：`{ messages, source: "gateway", sessionKey }`。

2. **无 `sessionKey`**  
   - `listMessages(agentId, 200)`（SQLite），反转为时间正序。  
   - 响应：`{ messages, source: "sqlite" }`。

### 错误

- 缺 `agentId` → `400` `{ error: "agentId required" }`。
- 网关或 DB 失败 → `500` `{ error: message }`。

## `POST /api/chat`（SSE）

### 请求体（JSON）

```ts
{
  agentId: string;
  text?: string;
  sessionKey?: string;
  attachments?: unknown;  // 解析见 spec-09 / chat-attachment
}
```

### 校验

- `agentId` 必填 trim。
- `text` trim 后可为空 **当且仅当** 存在有效图片附件；否则 `400`：`agentId and (text or image attachments) required`。

### 持久化策略（SQLite）

- **`sessionKey` 存在**：`persistSqlite = false` — **不写本地 SQLite**，避免与 `chat.history` 双源不一致。
- **无 `sessionKey`**：用户消息写入 SQLite（内容含附件占位文案，如 `[图片 N 张]`）。

### 会话键规范（中止与网关）

- 内部 `THREAD_KEY = "default"`。
- `skParam = sessionKeyParam?.trim() || THREAD_KEY`。
- `finalSessionKeyForAbort`：若 `skParam` 已以 `agent:` 开头则原样，否则 `agent:${agentId}:chat:${skParam}`。

### 流实现要点

- `ReadableStream` + `TextEncoder`，SSE 行格式：`data: ${JSON.stringify(obj)}\n\n`（见 `sseData`）。
- 订阅 `client` 的 `chat.delta` / `chat.final` / `chat.error`；在 `chat.final` 时合并 assistant meta、tool cards（`extractToolCards` 等）。
- 客户端断开：`req.signal` 与 `ReadableStream` cancel 共用 `abortFromClient`，调用 `client.abortChat({ sessionKey, runId })`（有 `runId` 时）。
- 若存在 `sessionKey`，先发 `sendChatMessageStreaming`（含 `attachments` 时传入 image 块）。
- 向客户端发送的 JSON 对象需包含：流式增量文本、最终消息、错误对象等（以代码中 `send({...})` 字段为准）。

### 空闲超时

- 实现中存在 `idleTimeout` 等逻辑防止悬挂（具体毫秒数以源码为准）。

## `POST /api/chat/abort`

### 请求体

```ts
{
  agentId: string;
  sessionKey?: string;
  runId?: string;
}
```

### 行为

- `agentId` 必填。
- `sessionKey` 缺省等价于 `default` 线程键；`finalSessionKey` 规则与 POST `/api/chat` 一致。
- `getOpenClawClient()` → `abortChat({ sessionKey, runId })`（`runId` 可选）。

### 响应

- 成功：`{ ok: true }`。
- 失败：`500` `{ error: message }`。

## 与 OpenClaw 上游对照

- `chat.send` / `chat.abort` / `chat.history` 语义见 `ai-reference-sources/openclaw` 中 `ui/src/ui/controllers/chat.ts` 与 `src/gateway/server-methods/` 下对应实现。

## 复刻检查清单

- [ ] GET 在有/无 `sessionKey` 时 `source` 字段正确。
- [ ] POST 带 `sessionKey` 时不写 SQLite。
- [ ] SSE 与 `chat.delta`/`final`/`error` 一致；abort 同时处理 `req.signal` 与 stream cancel。
- [ ] `POST /api/chat/abort` 在 `runId` 缺失时仍可调用仅 `sessionKey` 的中止（若网关支持）。
