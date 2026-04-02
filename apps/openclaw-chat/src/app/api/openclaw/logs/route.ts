import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// GET /api/openclaw/logs — streaming log viewer
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'log', message: '日志流已连接' })}\n\n`)
      );
      // Note: actual log tailing would read from a log file or gateway log stream
      // This stub provides the SSE infrastructure
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
