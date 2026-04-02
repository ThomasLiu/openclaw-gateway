import { NextResponse } from 'next/server';
import { getOpenClawClient } from '@/lib/openclaw/pool';
import { subscribeExecApprovalBridge } from '@/lib/openclaw/exec-approval-bridge';

export const runtime = 'nodejs';

export async function GET() {
  // Ensure the WS pool is connected
  let client;
  try {
    client = await getOpenClawClient();
  } catch {
    return NextResponse.json({ error: 'Gateway unavailable' }, { status: 503 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send hello
      controller.enqueue(encoder.encode('data: hello\n\n'));

      // Ping every 30s
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode('data: ping\n\n'));
        } catch {
          clearInterval(pingInterval);
        }
      }, 30_000);

      // Subscribe to bridge events
      unsubscribe = subscribeExecApprovalBridge(({ event, payload }) => {
        try {
          const frame = encoder.encode(
            `data: ${JSON.stringify({ type: 'gateway', event, payload })}\n\n`
          );
          controller.enqueue(frame);
        } catch {
          // stream closed
        }
      });

      client.on('disconnected', () => {
        clearInterval(pingInterval);
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      unsubscribe?.();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
