/**
 * GET /api/gateway/exec-approvals/stream
 * SSE 流式审批事件端点
 *
 * 行为：
 * - 连接前 await getOpenClawClient() 确保 WS 已建立
 * - 首包发送 hello
 * - 周期性 ping 保持连接
 * - 网关事件以 { type: 'gateway', event, payload } 写入 data:
 * - 503 当网关不可用
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getOpenClawClient, setApprovalBridgeBroadcaster } from "@/lib/openclaw/index";
import { subscribeExecApprovalBridge } from "@/lib/openclaw/exec-approval-bridge";

const ENCODER = new TextEncoder();

export async function GET(): Promise<Response> {
  // 确保 WS 连接已建立
  try {
    await getOpenClawClient();
  } catch {
    return NextResponse.json(
      { error: "Gateway unavailable" },
      { status: 503 }
    );
  }

  // 注册广播器（将审批事件写入 SSE）
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 发送 hello
      controller.enqueue(ENCODER.encode("data: {\"type\":\"hello\"}\n\n"));

      // 注册广播器
      const broadcaster = (event: { event: string; payload: Record<string, unknown> }) => {
        try {
          const sseData = JSON.stringify({ type: "gateway", ...event });
          controller.enqueue(ENCODER.encode(`data: ${sseData}\n\n`));
        } catch {
          // 流已关闭
        }
      };

      setApprovalBridgeBroadcaster(broadcaster as Parameters<typeof setApprovalBridgeBroadcaster>[0]);

      // 订阅审批桥接
      unsubscribe = subscribeExecApprovalBridge((approvalEvent) => {
        try {
          const { event, payload } = approvalEvent;
          const sseData = JSON.stringify({ type: "gateway", event, payload });
          controller.enqueue(ENCODER.encode(`data: ${sseData}\n\n`));
        } catch {
          // 流已关闭
        }
      });
    },

    cancel() {
      // 清理
      unsubscribe?.();
      setApprovalBridgeBroadcaster(() => {
        /* no-op */
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
