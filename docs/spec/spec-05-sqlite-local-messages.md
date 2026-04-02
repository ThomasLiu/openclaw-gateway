# Spec 05：SQLite 本地消息存储

## 功能概述

当 **未绑定网关会话**（无 `sessionKey`）时，`POST /api/chat` 将用户消息写入本地 **SQLite**，`GET /api/chat` 在无 `sessionKey` 时从 SQLite 读取。绑定网关会话后 **不写 SQLite**，历史以网关 `chat.history` 为准（见 spec-03）。

## 实现位置

- `apps/openclaw-chat/src/lib/db/index.ts`（`import "server-only"`）。

## 数据库路径

| 来源 | 规则 |
| ---- | ---- |
| `DATABASE_PATH` | 若设置：绝对路径直接用；否则相对 **进程 cwd** 解析 |
| 默认 | `process.cwd()/data/chat.sqlite`，并 `mkdirSync(data, { recursive: true })` |

## Schema

```sql
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_agent ON messages (agent_id, created_at);
```

## API

- `getDb(): Database` — 单例 `better-sqlite3`。
- `insertMessage({ agent_id, role, content })` → `lastInsertRowid`。
- `listMessages(agentId, limit)` — **按 id DESC** 取最近 N 条（调用方反转成正序展示）。

## Next 配置

- `next.config.ts` 中 **`serverExternalPackages: ["better-sqlite3"]`**，避免打包问题。

## 复刻检查清单

- [ ] 仅服务端导入；客户端不得引用 `lib/db`。
- [ ] 与网关双源时不在 SQLite 存网关会话消息（避免分叉）。
