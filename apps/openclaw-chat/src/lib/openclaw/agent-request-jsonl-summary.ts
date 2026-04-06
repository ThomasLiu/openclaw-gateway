/**
 * agent-request-jsonl-summary.ts
 * JSONL 日志摘要生成工具
 */

import "server-only";

/** JSONL 日志条目 */
export interface JsonlEntry {
  /** 原始行文本 */
  raw: string;
  /** 解析后的 JSON 对象（若解析失败则为 null） */
  parsed: Record<string, unknown> | null;
  /** 行号 */
  lineNumber: number;
}

/**
 * 提取 JSONL 文本中的每行 JSON 对象
 *
 * @param text JSONL 格式文本
 * @returns JSONLEntry 数组（包含原始行、解析结果和行号）
 */
export function extractJsonlEntries(text: string): JsonlEntry[] {
  if (!text) return [];

  const lines = text.split("\n");
  const entries: JsonlEntry[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(line);
    } catch {
      // 解析失败，保留 null
    }

    entries.push({
      raw: line,
      parsed,
      lineNumber: i + 1,
    });
  }

  return entries;
}

/**
 * 获取 JSONL 行数
 *
 * @param text JSONL 格式文本
 * @returns 非空行数
 */
export function getJsonlEntryCount(text: string): number {
  return extractJsonlEntries(text).length;
}

/**
 * 解析 JSONL 日志并生成摘要
 *
 * @param text JSONL 格式文本
 * @returns 摘要对象
 */
export interface JsonlSummary {
  totalLines: number;
  parsedLines: number;
  failedLines: number;
  /** 按 event type 分组统计 */
  byType: Record<string, number>;
  /** 最早一条消息的时间戳 */
  firstTimestamp: string | null;
  /** 最新一条消息的时间戳 */
  lastTimestamp: string | null;
  /** 错误消息列表 */
  errors: Array<{ line: number; message: string }>;
}

export function parseJsonlSummary(text: string): JsonlSummary {
  const entries = extractJsonlEntries(text);

  const byType: Record<string, number> = {};
  let firstTimestamp: string | null = null;
  let lastTimestamp: string | null = null;
  const errors: Array<{ line: number; message: string }> = [];

  for (const entry of entries) {
    if (!entry.parsed) continue;

    // 统计类型
    const type = String(entry.parsed.type ?? entry.parsed.event ?? "unknown");
    byType[type] = (byType[type] ?? 0) + 1;

    // 时间戳
    const ts = String(
      (entry.parsed as Record<string, unknown>).timestamp ?? (entry.parsed as Record<string, unknown>).ts ?? (entry.parsed as Record<string, unknown>).createdAtMs ?? ""
    );
    if (ts) {
      if (!firstTimestamp || ts < firstTimestamp) firstTimestamp = ts;
      if (!lastTimestamp || ts > lastTimestamp) lastTimestamp = ts;
    }

    // 错误
    const parsed = entry.parsed as Record<string, unknown> | null;
    if (parsed?.error || parsed?.level === "error") {
      const errObj = parsed.error as Record<string, unknown> | string | null | undefined;
      let message = "Unknown error";
      if (typeof errObj === "string") {
        message = errObj;
      } else if (errObj && typeof errObj === "object") {
        message = String((errObj as Record<string, unknown>).message ?? errObj);
      }
      errors.push({ line: entry.lineNumber, message });
    }
  }

  return {
    totalLines: entries.length,
    parsedLines: entries.filter((e) => e.parsed !== null).length,
    failedLines: entries.filter((e) => e.parsed === null).length,
    byType,
    firstTimestamp,
    lastTimestamp,
    errors,
  };
}
