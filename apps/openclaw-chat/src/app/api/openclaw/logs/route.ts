import { NextResponse } from "next/server";
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
 * GET /api/openclaw/logs
 * SSE 流式网关日志
 */
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let client: Awaited<ReturnType<typeof getOpenClawClient>> | null = null;
      let cursor = 0;

      function sendLog(entry: { timestamp: string; level: string; message: string }) {
        const data = JSON.stringify({
          timestamp: entry.timestamp,
          level: entry.level,
          message: entry.message,
        });
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // Stream closed
        }
      }

      try {
        client = await getOpenClawClient();
      } catch {
        sendLog({
          timestamp: new Date().toISOString(),
          level: "error",
          message: "无法连接网关",
        });
        controller.close();
        return;
      }

      // 初始拉取（最近 100 条）
      try {
        // logs.tail 返回 { lines: string[], cursor, size, ... } 不是 entries
        const result = await (client as any).logsTail({ cursor, limit: 100 });
        const lines: string[] = result?.entries ?? result?.lines ?? [];
        for (const raw of lines) {
          const parsed = parseLogLine(raw);
          if (parsed) {
            sendLog({
              timestamp: parsed.time ?? new Date().toISOString(),
              level: parsed.level ?? "info",
              message: parsed.message || parsed.raw,
            });
          }
        }
        cursor = result?.cursor ?? 0;
      } catch (err) {
        sendLog({
          timestamp: new Date().toISOString(),
          level: "warn",
          message: `无法加载网关日志: ${String(err)}`,
        });
      }

      // 每 3 秒轮询一次新日志
      const interval = setInterval(async () => {
        if (!client?.connected) {
          clearInterval(interval);
          return;
        }
        try {
          const result = await (client as any).logsTail({ cursor, limit: 100 });
          const lines: string[] = result?.entries ?? result?.lines ?? [];
          for (const raw of lines) {
            const parsed = parseLogLine(raw);
            if (parsed) {
              sendLog({
                timestamp: parsed.time ?? new Date().toISOString(),
                level: parsed.level ?? "info",
                message: parsed.message || parsed.raw,
              });
            }
          }
          cursor = result?.cursor ?? cursor;
        } catch {
          // 轮询失败静默忽略
        }
      }, 3000);

      // 心跳保活
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          clearInterval(interval);
        }
      }, 15_000);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
