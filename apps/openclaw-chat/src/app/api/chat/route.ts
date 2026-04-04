/**
 * GET /api/chat — 拉取会话消息历史
 * POST /api/chat — SSE 流式发送消息（通过 OpenClawClient）
 *
 * 运行时：nodejs（需要 WebSocket 和 ReadableStream 支持）
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";
import type { GatewayMessage, GatewayMessageContent } from "@/lib/openclaw/index";
import {
  listMessages,
  normalizeSqliteMessageRow,
  insertMessage,
} from "@/lib/db/index";

// ─── 类型定义 ────────────────────────────────────────────────────────────────

const THREAD_KEY = "default";

type ChatPostBody = {
  agentId?: string;
  text?: string;
  sessionKey?: string;
  attachments?: unknown;
};

// ─── gateway-history helpers（内联以避免 Turbopack 模块解析问题）─────────────

type GatewayMessageContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string }
  | { type: "thinking"; thinking: string }
  | Record<string, unknown>;

function extractText(content: GatewayMessageContent | GatewayMessageContent[]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((block) => {
      if (typeof block === "object" && block !== null && "text" in block) {
        return (block as { text: string }).text ?? "";
      }
      return "";
    })
    .join("");
}

function extractToolCalls(
  content: GatewayMessageContent | GatewayMessageContent[]
): Array<{ id: string; name: string; input: Record<string, unknown> }> | undefined {
  if (!Array.isArray(content)) return undefined;
  const calls = content
    .filter(
      (block): block is Extract<GatewayMessageContentBlock, { type: "tool_use" }> =>
        typeof block === "object" &&
        block !== null &&
        (block as { type?: string }).type === "tool_use"
    )
    .map((block) => ({
      id: block.id,
      name: block.name,
      input: block.input,
    }));
  return calls.length > 0 ? calls : undefined;
}

function extractToolResults(
  content: GatewayMessageContent | GatewayMessageContent[]
): Array<{ tool_use_id: string; content: string }> | undefined {
  if (!Array.isArray(content)) return undefined;
  const results = content
    .filter(
      (block): block is Extract<GatewayMessageContentBlock, { type: "tool_result" }> =>
        typeof block === "object" &&
        block !== null &&
        (block as { type?: string }).type === "tool_result"
    )
    .map((block) => ({
      tool_use_id: block.tool_use_id,
      content: block.content,
    }));
  return results.length > 0 ? results : undefined;
}

function gatewayHistoryToUiMessages(messages: GatewayMessage[]) {
  return messages.map((msg) => {
    const content =
      typeof msg.content === "string"
        ? msg.content
        : extractText(msg.content);
    return {
      id: msg.id,
      role: msg.role,
      content,
      timestamp: 0,
      toolCalls: extractToolCalls(msg.content),
      toolResults: extractToolResults(msg.content),
    };
  });
}

// ─── SSE 辅助 ─────────────────────────────────────────────────────────────────

function sseData(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

// ─── GET /api/chat ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId")?.trim();
    const sessionKey = searchParams.get("sessionKey")?.trim();
    const limitStr = searchParams.get("limit");

    // 校验 agentId
    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    const limit = limitStr
      ? Math.min(1000, Math.max(1, parseInt(limitStr, 10)))
      : 200;

    // 有 sessionKey → 走网关历史（不写 SQLite）
    if (sessionKey) {
      const client = await getOpenClawClient();
      const history = await client.fetchChatHistory(sessionKey, limit);
      const messages = gatewayHistoryToUiMessages(history);
      return NextResponse.json({ messages, source: "gateway", sessionKey });
    }

    // 无 sessionKey → 走 SQLite 本地存储
    const rows = listMessages(agentId, limit);
    // 转换并反转（SQL 返回 id DESC，需要转成正序）
    const messages = rows.reverse().map(normalizeSqliteMessageRow);
    return NextResponse.json({ messages, source: "sqlite" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST /api/chat ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ChatPostBody;
  try {
    body = (await request.json()) as ChatPostBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { agentId, text, sessionKey, attachments } = body;

  // 校验 agentId
  if (!agentId || !agentId.trim()) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 });
  }

  // 校验 text 或 attachments
  const trimmedText = text?.trim() ?? "";
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  if (!trimmedText && !hasAttachments) {
    return NextResponse.json(
      { error: "agentId and (text or image attachments) required" },
      { status: 400 }
    );
  }

  // 会话键规范
  const skParam = sessionKey?.trim() || THREAD_KEY;
  const finalSessionKey = skParam.startsWith("agent:")
    ? skParam
    : `agent:${agentId}:chat:${skParam}`;

  // 是否持久化到本地 SQLite（无 sessionKey 时）
  const persistSqlite = !sessionKey;

  // 创建 SSE 流
  const encoder = new TextEncoder();
  let aborted = false;
  let activeRunId: string | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        if (aborted) return;
        try {
          controller.enqueue(encoder.encode(sseData(obj)));
        } catch {
          // 流可能已关闭
        }
      };

      try {
        const client = await getOpenClawClient();

        // SQLite 模式：先写入用户消息
        if (persistSqlite) {
          insertMessage({
            agent_id: agentId,
            role: "user",
            content: trimmedText,
          });
        }

        // 累积 assistant 回复文本（用于 SQLite 持久化）
        let assistantText = "";

        // 事件处理
        const onDelta = (event: {
          sessionKey: string;
          runId: string;
          text: string;
          state: string;
        }) => {
          if (event.sessionKey !== finalSessionKey) return;
          assistantText += event.text;
          send({ type: "delta", text: event.text, runId: event.runId });
        };

        const onFinal = (event: {
          sessionKey: string;
          runId: string;
          state: string;
        }) => {
          if (event.sessionKey !== finalSessionKey) return;
          activeRunId = null;

          // SQLite 模式：写入 assistant 回复
          if (persistSqlite && assistantText.trim()) {
            insertMessage({
              agent_id: agentId,
              role: "assistant",
              content: assistantText,
            });
          }

          send({ type: "final", runId: event.runId });
          try {
            controller.close();
          } catch {
            // ignore
          }
        };

        const onError = (event: {
          sessionKey: string;
          runId: string;
          error: string;
          state: string;
        }) => {
          if (event.sessionKey !== finalSessionKey) return;
          activeRunId = null;
          send({ type: "error", error: event.error, runId: event.runId });
          try {
            controller.close();
          } catch {
            // ignore
          }
        };

        client.on("chat.delta", onDelta);
        client.on("chat.final", onFinal);
        client.on("chat.error", onError);

        // 发送消息（流式）
        const result = await client.sendChatMessageStreaming(
          finalSessionKey,
          trimmedText,
          agentId
        );
        activeRunId = result.runId;
        send({ type: "started", runId: result.runId });

        // 空闲超时：30 秒无活动则关闭
        let idleTimer: ReturnType<typeof setTimeout> | null = null;
        const resetIdle = () => {
          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = setTimeout(() => {
            aborted = true;
            send({ type: "error", error: "idle timeout" });
            try {
              controller.close();
            } catch {
              // ignore
            }
          }, 30_000);
        };
        resetIdle();

        // 监听 delta 事件重置空闲计时器
        const onDeltaResetIdle = (evt: { sessionKey: string }) => {
          if (evt.sessionKey === finalSessionKey) resetIdle();
        };
        client.on("chat.delta", onDeltaResetIdle);
      } catch (err) {
        aborted = true;
        const message = err instanceof Error ? err.message : String(err);
        send({ type: "error", error: message });
        try {
          controller.close();
        } catch {
          // ignore
        }
      }
    },

    cancel() {
      // 客户端断开连接
      aborted = true;
      if (activeRunId) {
        getOpenClawClient()
          .then((client) => client.abortChat(finalSessionKey, activeRunId!))
          .catch(() => {
            // ignore abort errors
          });
      }
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
