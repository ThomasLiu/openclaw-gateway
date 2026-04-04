import { NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw";

export const dynamic = "force-dynamic";

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
        const result = await client.logsTail({ cursor, limit: 100 });
        if (result.entries && result.entries.length > 0) {
          for (const entry of result.entries) {
            sendLog(entry);
          }
          cursor = result.cursor;
        }
      } catch {
        sendLog({
          timestamp: new Date().toISOString(),
          level: "warn",
          message: "无法加载网关日志",
        });
      }

      // 每 3 秒轮询一次新日志
      const interval = setInterval(async () => {
        if (!client?.connected) {
          clearInterval(interval);
          return;
        }
        try {
          const result = await client.logsTail({ cursor, limit: 100 });
          if (result.entries && result.entries.length > 0) {
            for (const entry of result.entries) {
              sendLog(entry);
            }
            cursor = result.cursor;
          }
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
