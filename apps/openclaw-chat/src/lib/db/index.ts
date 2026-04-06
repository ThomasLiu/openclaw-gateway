/**
 * SQLite 本地消息存储模块
 *
 * 当未绑定网关会话（无 sessionKey）时，消息存储在本地 SQLite。
 * 有 sessionKey 时，消息走网关，不写本地 SQLite。
 *
 * @module lib/db
 */

import "server-only";

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// ─── Types ─────────────────────────────────────────────────────────────────

/** SQLite messages 表行 */
export interface SqliteMessageRow {
  id: number;
  agent_id: string;
  role: string;
  content: string;
  created_at: string;
}

/** 插入消息参数 */
export interface InsertMessageParams {
  agent_id: string;
  role: string;
  content: string;
}

/** 导出的消息格式（camelCase） */
export interface ExportedMessage {
  id: number;
  agentId: string;
  role: string;
  content: string;
  createdAt: string;
}

// ─── Database Path Resolution ────────────────────────────────────────────────

/**
 * 获取数据库文件路径
 *
 * - DATABASE_PATH 环境变量：若设置，使用绝对路径
 * - 默认：process.cwd()/data/chat.sqlite
 */
function getDatabasePath(): string {
  const envPath = process.env.DATABASE_PATH;
  if (envPath) {
    return envPath;
  }

  // 默认路径：process.cwd()/data/chat.sqlite
  const dataDir = path.join(process.cwd(), "data");
  return path.join(dataDir, "chat.sqlite");
}

// ─── Schema Initialization ───────────────────────────────────────────────────

/** 初始化数据库 Schema */
function initializeSchema(db: Database.Database): void {
  // messages 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 索引：按 agent_id + created_at 加速查询
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_agent
    ON messages (agent_id, created_at)
  `);
}

// ─── Singleton Database Instance ────────────────────────────────────────────

/** Module-level 单例 */
let _db: Database.Database | null = null;

/**
 * 获取数据库单例
 *
 * 首次调用时初始化，后续调用返回同一实例。
 * 自动创建 data 目录和 Schema。
 */
export function getDb(): Database.Database {
  if (_db) {
    return _db;
  }

  const dbPath = getDatabasePath();
  const dbDir = path.dirname(dbPath);

  // 确保目录存在
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // 初始化数据库
  _db = new Database(dbPath);
  _db.pragma("journal_mode = WAL");

  // 初始化 Schema
  initializeSchema(_db);

  return _db;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * 插入消息到本地 SQLite
 *
 * @param params - { agent_id, role, content }
 * @returns lastInsertRowid
 */
export function insertMessage(params: InsertMessageParams): number {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT INTO messages (agent_id, role, content)
    VALUES (@agent_id, @role, @content)
  `);

  const result = stmt.run({
    agent_id: params.agent_id,
    role: params.role,
    content: params.content,
  });

  return result.lastInsertRowid as number;
}

/**
 * 列出指定 agent 的消息（按 id DESC，取最近 N 条）
 *
 * @param agentId - Agent ID
 * @param limit - 返回条数限制，默认 50
 * @returns SqliteMessageRow 数组（按 id DESC 排序，调用方需反转）
 */
export function listMessages(
  agentId: string,
  limit = 50
): SqliteMessageRow[] {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT id, agent_id, role, content, created_at
    FROM messages
    WHERE agent_id = ?
    ORDER BY id DESC
    LIMIT ?
  `);

  return stmt.all(agentId, limit) as SqliteMessageRow[];
}

/**
 * 将 SqliteMessageRow 转换为导出的消息格式（camelCase）
 */
export function normalizeSqliteMessageRow(row: SqliteMessageRow): ExportedMessage {
  return {
    id: row.id,
    agentId: row.agent_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}
