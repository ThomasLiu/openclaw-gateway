import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw";

export const dynamic = "force-dynamic";

// pino 日志行解析（与 openclaw logs 命令一致的解析逻辑）
type ParsedLogLine = {
  time?: string;
  level?: string;
  subsystem?: string;
  module?: string;
  message: string;
  raw: string;
};

function extractMessage(value: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const key of Object.keys(value)) {
    if (!/^\d+$/.test(key)) {
      continue;
    }
    const item = value[key];
    if (typeof item === "string") {
      parts.push(item);
    } else if (item != null) {
      parts.push(JSON.stringify(item));
    }
  }
  return parts.join(" ");
}

function parseMetaName(raw?: unknown): { subsystem?: string; module?: string } {
  if (typeof raw !== "string") {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      subsystem: typeof parsed.subsystem === "string" ? parsed.subsystem : undefined,
      module: typeof parsed.module === "string" ? parsed.module : undefined,
    };
  } catch {
    return {};
  }
}

function parseLogLine(raw: string): ParsedLogLine | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const meta = parsed._meta as Record<string, unknown> | undefined;
    const nameMeta = parseMetaName(meta?.name);
    const levelRaw = typeof meta?.logLevelName === "string" ? meta.logLevelName : undefined;
    return {
      time:
        typeof parsed.time === "string"
          ? parsed.time
          : typeof meta?.date === "string"
            ? meta.date
            : undefined,
      level: levelRaw ? levelRaw.toLowerCase() : undefined,
      subsystem: nameMeta.subsystem,
      module: nameMeta.module,
      message: extractMessage(parsed),
      raw,
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/openclaw/logs/history?cursor=0&limit=40
 *
 * 翻页查询历史日志（用于日志面板向上滚动时加载更老的日志）。
 * cursor 是上一次查询返回的 cursor（字节偏移），传 0 表示从头开始。
 * 返回 { entries: [...], cursor: number, hasMore: boolean }
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cursor = parseInt(searchParams.get("cursor") ?? "0", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "40", 10), 200);

  let client: Awaited<ReturnType<typeof getOpenClawClient>> | null = null;
  try {
    client = await getOpenClawClient();
  } catch {
    return NextResponse.json({ error: "无法连接网关" }, { status: 500 });
  }

  try {
    const result = await (client as any).logsTail({ cursor, limit });
    const lines: string[] = result?.entries ?? result?.lines ?? [];

    const entries = lines.map((raw: string) => {
      const parsed = parseLogLine(raw);
      return {
        timestamp: parsed?.time ?? new Date().toISOString(),
        level: parsed?.level ?? "info",
        message: parsed?.message || parsed?.raw || raw,
        raw,
      };
    });

    const newCursor = result?.cursor ?? cursor;
    // hasMore: 如果返回的条目数等于 limit，可能还有更多
    const hasMore = entries.length === limit;

    return NextResponse.json({
      entries,
      cursor: newCursor,
      hasMore,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `查询失败: ${String(err)}` },
      { status: 500 }
    );
  }
}
