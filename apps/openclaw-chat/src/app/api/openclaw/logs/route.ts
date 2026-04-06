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

      console.log("[SSE Logs] Attempting to connect to OpenClaw client...");
      try {
        client = await getOpenClawClient();
        console.log("[SSE Logs] Successfully connected to OpenClaw client");
      } catch (error) {
        console.error("[SSE Logs] Failed to connect to OpenClaw client:", error);
        sendLog({
          timestamp: new Date().toISOString(),
          level: "error",
          message: "无法连接网关，正在重试...",
        });
        // 连接失败时，3秒后重试
        setTimeout(async () => {
          console.log("[SSE Logs] Retrying to connect to OpenClaw client...");
          try {
            client = await getOpenClawClient();
            console.log("[SSE Logs] Successfully reconnected to OpenClaw client");
            sendLog({
              timestamp: new Date().toISOString(),
              level: "info",
              message: "已成功连接网关",
            });
            // 连接成功后，执行初始拉取
            try {
              console.log("[SSE Logs] Fetching initial logs...");
              const result = await (client as any).logsTail({ cursor, limit: 40 });
              console.log("[SSE Logs] Initial logs fetched:", result);
              const lines: string[] = result?.entries ?? result?.lines ?? [];
              console.log("[SSE Logs] Number of initial log lines:", lines.length);
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
              console.log("[SSE Logs] Initial cursor set to:", cursor);
            } catch (err) {
              console.error("[SSE Logs] Failed to load initial logs:", err);
              sendLog({
                timestamp: new Date().toISOString(),
                level: "warn",
                message: `无法加载网关日志: ${String(err)}`,
              });
            }

            // 每 3 秒轮询一次新日志
            console.log("[SSE Logs] Starting log polling every 3 seconds");
            const interval = setInterval(async () => {
              if (!client?.connected) {
                console.log("[SSE Logs] Client disconnected, stopping polling");
                clearInterval(interval);
                return;
              }
              try {
                console.log("[SSE Logs] Polling for new logs with cursor:", cursor);
                const result = await (client as any).logsTail({ cursor, limit: 40 });
                console.log("[SSE Logs] Polling result:", result);
                const lines: string[] = result?.entries ?? result?.lines ?? [];
                console.log("[SSE Logs] Number of new log lines:", lines.length);
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
                console.log("[SSE Logs] Updated cursor to:", cursor);
              } catch (err) {
                console.error("[SSE Logs] Failed to poll logs:", err);
                // 轮询失败静默忽略
              }
            }, 3000);
          } catch (error) {
            console.error("[SSE Logs] Failed to reconnect to OpenClaw client:", error);
            // 重试失败，继续重试
            sendLog({
              timestamp: new Date().toISOString(),
              level: "error",
              message: "重试连接网关失败，将继续重试...",
            });
            // 重新创建一个新的流来重试连接
            const newStream = new ReadableStream({ 
              async start(newController) {
                let newClient: Awaited<ReturnType<typeof getOpenClawClient>> | null = null;
                let newCursor = 0;

                function newSendLog(entry: { timestamp: string; level: string; message: string }) {
                  const data = JSON.stringify({
                    timestamp: entry.timestamp,
                    level: entry.level,
                    message: entry.message,
                  });
                  try {
                    newController.enqueue(encoder.encode(`data: ${data}\n\n`));
                  } catch {
                    // Stream closed
                  }
                }

                try {
                  console.log("[SSE Logs] Attempting to connect in new stream...");
                  newClient = await getOpenClawClient();
                  console.log("[SSE Logs] Successfully connected in new stream");
                  newSendLog({
                    timestamp: new Date().toISOString(),
                    level: "info",
                    message: "已成功连接网关",
                  });
                  // 连接成功后，执行初始拉取
                  try {
                    console.log("[SSE Logs] Fetching initial logs in new stream...");
                    const result = await (newClient as any).logsTail({ cursor: newCursor, limit: 40 });
                    console.log("[SSE Logs] Initial logs fetched in new stream:", result);
                    const lines: string[] = result?.entries ?? result?.lines ?? [];
                    console.log("[SSE Logs] Number of initial log lines in new stream:", lines.length);
                    for (const raw of lines) {
                      const parsed = parseLogLine(raw);
                      if (parsed) {
                        newSendLog({
                          timestamp: parsed.time ?? new Date().toISOString(),
                          level: parsed.level ?? "info",
                          message: parsed.message || parsed.raw,
                        });
                      }
                    }
                    newCursor = result?.cursor ?? 0;
                    console.log("[SSE Logs] Initial cursor set to in new stream:", newCursor);
                  } catch (err) {
                    console.error("[SSE Logs] Failed to load initial logs in new stream:", err);
                    newSendLog({
                      timestamp: new Date().toISOString(),
                      level: "warn",
                      message: `无法加载网关日志: ${String(err)}`,
                    });
                  }

                  // 每 3 秒轮询一次新日志
                  console.log("[SSE Logs] Starting log polling in new stream every 3 seconds");
                  const interval = setInterval(async () => {
                    if (!newClient?.connected) {
                      console.log("[SSE Logs] Client disconnected in new stream, stopping polling");
                      clearInterval(interval);
                      return;
                    }
                    try {
                      console.log("[SSE Logs] Polling for new logs in new stream with cursor:", newCursor);
                      const result = await (newClient as any).logsTail({ cursor: newCursor, limit: 40 });
                      console.log("[SSE Logs] Polling result in new stream:", result);
                      const lines: string[] = result?.entries ?? result?.lines ?? [];
                      console.log("[SSE Logs] Number of new log lines in new stream:", lines.length);
                      for (const raw of lines) {
                        const parsed = parseLogLine(raw);
                        if (parsed) {
                          newSendLog({
                            timestamp: parsed.time ?? new Date().toISOString(),
                            level: parsed.level ?? "info",
                            message: parsed.message || parsed.raw,
                          });
                        }
                      }
                      newCursor = result?.cursor ?? newCursor;
                      console.log("[SSE Logs] Updated cursor to in new stream:", newCursor);
                    } catch (err) {
                      console.error("[SSE Logs] Failed to poll logs in new stream:", err);
                      // 轮询失败静默忽略
                    }
                  }, 3000);

                  // 心跳保活
                  const heartbeat = setInterval(() => {
                    try {
                      newController.enqueue(encoder.encode(`: heartbeat\n\n`));
                    } catch {
                      clearInterval(heartbeat);
                      clearInterval(interval);
                    }
                  }, 15_000);
                } catch (error) {
                  console.error("[SSE Logs] Failed to connect in new stream:", error);
                  newSendLog({
                    timestamp: new Date().toISOString(),
                    level: "error",
                    message: "无法连接网关",
                  });
                  newController.close();
                }
              },
            });

            // 替换当前流
            controller.close();
          }
        }, 3000);
        return;
      }

      // 初始拉取（40 条）
      try {
        const result = await (client as any).logsTail({ cursor, limit: 40 });
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
          console.log("[SSE Logs] Client disconnected, stopping polling");
          clearInterval(interval);
          return;
        }
        try {
          console.log("[SSE Logs] Polling for new logs with cursor:", cursor);
          const result = await (client as any).logsTail({ cursor, limit: 40 });
          console.log("[SSE Logs] Polling result:", result);
          const lines: string[] = result?.entries ?? result?.lines ?? [];
          console.log("[SSE Logs] Number of new log lines:", lines.length);
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
          console.log("[SSE Logs] Updated cursor to:", cursor);
        } catch (err) {
          console.error("[SSE Logs] Failed to poll logs:", err);
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
