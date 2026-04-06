/**
 * SQLite 数据库层单元测试
 *
 * 重要：lib/db/index.ts 导入了 'server-only'（无条件抛出错误），
 * 需要在此测试文件顶部用 vi.mock 拦截，否则无法运行测试。
 * vi.mock 会被 Vitest 提升到模块顶部，在 import 语句之前执行。
 */

// Mock server-only（在所有导入之前执行）
vi.mock("server-only", () => ({}));

// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import { vi } from "vitest";

// ─── 临时目录管理 ────────────────────────────────────────────────────────────

let tempDir: string;
let tempDbPath: string;

beforeEach(() => {
  // 每个测试前：清空模块缓存，强制重新加载（获得新的临时 DB）
  vi.resetModules();

  // 创建临时目录和数据库文件路径
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-test-db-"));
  tempDbPath = path.join(tempDir, "test.sqlite");

  // 设置环境变量（必须在重置模块后立即设置）
  process.env.DATABASE_PATH = tempDbPath;
});

afterEach(() => {
  // 关闭数据库连接（通过重置模块实现）
  vi.resetModules();

  // 清理环境变量
  delete process.env.DATABASE_PATH;

  // 清理临时文件
  try {
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  } catch {
    // ignore
  }
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  } catch {
    // ignore
  }
});

// ─── 测试套件 ───────────────────────────────────────────────────────────────

describe("lib/db: getDb() 单例", () => {
  it("getDb() 返回单例：多次调用返回同一实例", async () => {
    const { getDb } = await import("@/lib/db/index");
    const db1 = getDb();
    const db2 = getDb();
    expect(db1).toBe(db2);
    // 验证是 better-sqlite3 Database 实例
    expect(typeof db1.prepare).toBe("function");
    expect(typeof db1.exec).toBe("function");
  });

  it("getDb() 初始化后不会重新初始化", async () => {
    const { getDb } = await import("@/lib/db/index");
    const db1 = getDb();
    // 修改 pragma（只对当前连接生效）
    db1.pragma("journal_mode");
    const db2 = getDb();
    // 同一实例
    expect(db1).toBe(db2);
  });
});

describe("lib/db: Schema 初始化", () => {
  it("messages 表和 idx_messages_agent 索引在首次 getDb() 时创建", async () => {
    const { getDb } = await import("@/lib/db/index");
    const db = getDb();

    // 验证 messages 表存在且字段正确
    const tableInfo = db
      .prepare("PRAGMA table_info(messages)")
      .all() as Array<{ name: string; notnull: number }>;
    const columnNames = tableInfo.map((c) => c.name);

    expect(columnNames).toContain("id");
    expect(columnNames).toContain("agent_id");
    expect(columnNames).toContain("role");
    expect(columnNames).toContain("content");
    expect(columnNames).toContain("created_at");

    // 验证 agent_id 是 NOT NULL
    const agentIdCol = tableInfo.find((c) => c.name === "agent_id");
    expect(agentIdCol?.notnull).toBe(1);

    // 验证索引存在
    const indexes = db
      .prepare("PRAGMA index_list(messages)")
      .all() as Array<{ name: string }>;
    const hasAgentIndex = indexes.some((i) =>
      i.name.includes("idx_messages_agent")
    );
    expect(hasAgentIndex).toBe(true);
  });

  it("重复调用 getDb() 不会重复创建表（幂等性）", async () => {
    const { getDb } = await import("@/lib/db/index");
    const db1 = getDb();
    const db2 = getDb();
    // 两次调用不能导致错误
    expect(() => db1.exec("SELECT 1")).not.toThrow();
    expect(() => db2.exec("SELECT 1")).not.toThrow();
  });
});

describe("lib/db: insertMessage", () => {
  it("insertMessage 返回 lastInsertRowid（number 类型）", async () => {
    const { insertMessage } = await import("@/lib/db/index");
    const rowid = insertMessage({
      agent_id: "agent-001",
      role: "user",
      content: "Hello world",
    });

    expect(typeof rowid).toBe("number");
    expect(rowid).toBeGreaterThan(0);
  });

  it("insertMessage 数据正确写入数据库", async () => {
    const { getDb, insertMessage } = await import("@/lib/db/index");
    const db = getDb();

    const rowid = insertMessage({
      agent_id: "agent-002",
      role: "assistant",
      content: "How can I help you?",
    });

    const row = db
      .prepare("SELECT * FROM messages WHERE id = ?")
      .get(rowid) as {
      id: number;
      agent_id: string;
      role: string;
      content: string;
    };

    expect(row.agent_id).toBe("agent-002");
    expect(row.role).toBe("assistant");
    expect(row.content).toBe("How can I help you?");
  });

  it("created_at 使用 datetime('now') 默认值", async () => {
    const { insertMessage, listMessages } = await import("@/lib/db/index");
    insertMessage({ agent_id: "agent-time", role: "user", content: "time test" });

    const rows = listMessages("agent-time", 1);
    expect(rows.length).toBe(1);
    // SQLite datetime 格式：YYYY-MM-DD HH:MM:SS
    expect(rows[0].created_at).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
    );
  });

  it("支持 user 和 assistant 两种 role", async () => {
    const { insertMessage, listMessages } = await import("@/lib/db/index");
    insertMessage({ agent_id: "agent-roles", role: "user", content: "u1" });
    insertMessage({
      agent_id: "agent-roles",
      role: "assistant",
      content: "a1",
    });

    const rows = listMessages("agent-roles", 10);
    const roles = rows.map((r) => r.role);
    expect(roles).toContain("user");
    expect(roles).toContain("assistant");
  });
});

describe("lib/db: listMessages", () => {
  it("返回指定 agent_id 的消息，过滤其他 agent", async () => {
    const { insertMessage, listMessages } = await import("@/lib/db/index");

    insertMessage({ agent_id: "agent-A", role: "user", content: "msg-A" });
    insertMessage({ agent_id: "agent-B", role: "user", content: "msg-B" });
    insertMessage({
      agent_id: "agent-A",
      role: "user",
      content: "msg-A2",
    });

    const rows = listMessages("agent-A", 50);

    expect(rows.length).toBe(2);
    expect(rows.every((r) => r.agent_id === "agent-A")).toBe(true);
  });

  it("返回结果按 id DESC 排序（最新的在前）", async () => {
    const { insertMessage, listMessages } = await import("@/lib/db/index");

    const id1 = insertMessage({
      agent_id: "agent-D",
      role: "user",
      content: "first",
    });
    const id2 = insertMessage({
      agent_id: "agent-D",
      role: "user",
      content: "second",
    });
    const id3 = insertMessage({
      agent_id: "agent-D",
      role: "user",
      content: "third",
    });

    const rows = listMessages("agent-D", 50);

    // id DESC: id3 > id2 > id1
    expect(rows[0].id).toBe(id3);
    expect(rows[1].id).toBe(id2);
    expect(rows[2].id).toBe(id1);
  });

  it("支持 limit 参数", async () => {
    const { insertMessage, listMessages } = await import("@/lib/db/index");

    for (let i = 0; i < 5; i++) {
      insertMessage({
        agent_id: "agent-limit",
        role: "user",
        content: `msg-${i}`,
      });
    }

    const rows = listMessages("agent-limit", 3);
    expect(rows.length).toBe(3);
  });

  it("不存在的 agent 返回空数组", async () => {
    const { listMessages } = await import("@/lib/db/index");
    const rows = listMessages("non-existent-agent", 50);
    expect(rows).toEqual([]);
  });

  it("默认 limit 为 50", async () => {
    const { listMessages, getDb } = await import(
      "@/lib/db/index"
    );
    const db = getDb();

    // 插入 60 条消息（绕过 listMessages 的 limit 直接插入）
    const insert = db.prepare(
      "INSERT INTO messages (agent_id, role, content) VALUES (?, ?, ?)"
    );
    for (let i = 0; i < 60; i++) {
      insert.run("agent-limit-default", "user", `msg-${i}`);
    }

    // 不传 limit 参数
    const rows = listMessages("agent-limit-default");
    expect(rows.length).toBe(50);
  });
});

describe("lib/db: normalizeSqliteMessageRow", () => {
  it("snake_case 字段名正确转换为 camelCase", async () => {
    const { insertMessage, normalizeSqliteMessageRow, getDb } =
      await import("@/lib/db/index");
    const db = getDb();

    const rowid = insertMessage({
      agent_id: "agent-norm",
      role: "user",
      content: "test content",
    });

    const rawRow = db
      .prepare("SELECT * FROM messages WHERE id = ?")
      .get(rowid) as {
      id: number;
      agent_id: string;
      role: string;
      content: string;
      created_at: string;
    };

    const normalized = normalizeSqliteMessageRow(rawRow);

    // 确认原始数据有 snake_case 字段
    expect(rawRow.agent_id).toBe("agent-norm");
    expect(rawRow.created_at).toBeDefined();

    // 确认转换后有 camelCase 字段
    expect(normalized.id).toBe(rawRow.id);
    expect(normalized.agentId).toBe(rawRow.agent_id);
    expect(normalized.role).toBe(rawRow.role);
    expect(normalized.content).toBe(rawRow.content);
    expect(normalized.createdAt).toBe(rawRow.created_at);
  });
});

describe("lib/db: server-only 约束", () => {
  it("lib/db/index.ts 导入 'server-only'（通过检查源码）", async () => {
    const { readFileSync } = await import("fs");
    const { resolve } = await import("path");

    const dbIndexPath = resolve(__dirname, "../../../src/lib/db/index.ts");
    const content = readFileSync(dbIndexPath, "utf-8");
    expect(content).toContain('import "server-only"');
  });
});
