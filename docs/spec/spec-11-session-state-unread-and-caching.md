# Spec 11：会话状态、未读、缓存与 Heartbeat

## 未读与已读

- **`lib/session-unread.ts`**：`computeSessionUnreadByKey`、`aggregateUnreadByAgentId`、`mergeUnreadWithSnapshot`、`maxUiMessageId`；单测 `session-unread.test.ts`。
- **`lib/session-unread-snapshot.ts`**：`readUnreadSnapshot`、`writeUnreadSnapshot`、`removeUnreadSnapshotKey` — **localStorage** 持久化快照。
- **`lib/session-read-state.ts`**：`SessionReadMap`、`readSessionReadMap`、`patchSessionRead`、`getLastReadMessageId` 等 — 已读游标。

## 历史缓存

- **`lib/session-history-cache.ts`**：`makeSessionHistoryCacheKey`、内存缓存策略；单测 `session-history-cache.test.ts`。
- **`lib/fetch-chat-history-json.ts`**：`fetchChatHistoryJsonDeduped` + **`lib/inflight-dedupe.ts`** 防止并发重复请求。

## Data Heartbeat

- **`lib/data-heartbeat.ts`**：`subscribeDataHeartbeat` — 定时触发会话列表/状态刷新（具体间隔与回调以源码为准）；单测 `data-heartbeat.test.ts`。

## 会话列表标题

- **`lib/session-list-title-cache.ts`**：侧栏标题缓存与 pending 发送预览。
- **`lib/session-list-labels.ts`**：列表展示标签。

## UI 标志

- **`lib/session-ui-flags.ts`**：`computeSessionNeedsContinue`、提取 agentId 等；单测 `session-ui-flags.test.ts`。

## 会话列表标题与网关

- **`lib/gateway-session-label.ts`**：`makeUniqueSessionLabel` 等。
- **`lib/gateway-session-error.ts`**：`formatGatewayUserMessage` — 格式化错误到用户消息。

## 复刻检查清单

- [ ] 未读数字与 `maxUiMessageId`、已读游标一致。
- [ ] 刷新会话列表时 inflight 去重不重复打爆网关。
- [ ] Heartbeat 间隔合理，避免请求风暴（对照 gstack review 性能项）。
