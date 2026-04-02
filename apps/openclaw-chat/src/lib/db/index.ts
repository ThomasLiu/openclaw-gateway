/**
 * SQLite local message storage.
 *
 * Serves as the "local" side of the dual-source strategy:
 * - With sessionKey: messages live in OpenClaw gateway (chat.history)
 * - Without sessionKey: messages are stored here in SQLite
 *
 * IMPORTANT: This file must only be imported from server-side code.
 * The 'server-only' guard prevents accidental client-side usage.
 */
import "server-only";

import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

declare global {
  var __openclaw_db__: Database.Database | undefined;
}

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "chat.sqlite");

function ensureDataDir(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id   TEXT    NOT NULL,
      role       TEXT    NOT NULL,
      content    TEXT    NOT NULL,
      created_at TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_messages_agent
      ON messages (agent_id, created_at);
  `);
}

function getDb(): Database.Database {
  if (globalThis.__openclaw_db__) {
    return globalThis.__openclaw_db__;
  }
  ensureDataDir();
  const db = new Database(DB_PATH);
  createSchema(db);
  globalThis.__openclaw_db__ = db;
  return db;
}

export interface DbMessage {
  id: number;
  agent_id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface InsertMessageParams {
  agent_id: string;
  role: string;
  content: string;
}

export function insertMessage(params: InsertMessageParams): number {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO messages (agent_id, role, content) VALUES (@agent_id, @role, @content)"
  );
  const result = stmt.run(params);
  return Number(result.lastInsertRowid);
}

export function listMessages(agentId: string, limit: number = 200): DbMessage[] {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT * FROM messages WHERE agent_id = ? ORDER BY id DESC LIMIT ?"
  );
  const rows = stmt.all(agentId, limit) as DbMessage[];
  return rows;
}
