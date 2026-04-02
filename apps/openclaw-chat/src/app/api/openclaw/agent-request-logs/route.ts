import { NextRequest, NextResponse } from 'next/server';
import { getOpenClawClient } from '@/lib/openclaw/pool';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function formatSessionEvent(session: Record<string, unknown>): string {
  const timestamp = (session.updatedAt ?? session.createdAt ?? new Date().toISOString()) as string;
  const key = (session.key ?? '') as string;
  const agentId = (session.agentId ?? '') as string;
  const model = (session.model ?? 'unknown') as string;
  const ts = timestamp ? new Date(timestamp).toLocaleTimeString() : '??:??:??';
  return `[${ts}] ${agentId}/${model} → ${key}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const agentId = searchParams.get('agentId')?.trim() || undefined;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // ignore enqueue errors
        }
      };

      send({ type: 'status', message: 'Agent 请求日志流已连接' });

      try {
        const client = await getOpenClawClient();

        // Send recent sessions as initial batch
        const sessions = (await client.listSessions({
          agentId,
          limit: 20,
          includeLastMessage: false,
        })) as Record<string, unknown>[];

        for (const session of sessions.slice(0, 10)) {
          send({
            type: 'session',
            line: formatSessionEvent(session),
            sessionKey: session.key,
            agentId: session.agentId,
            model: session.model,
            timestamp: session.updatedAt ?? session.createdAt,
          });
        }

        if (sessions.length > 10) {
          send({ type: 'info', message: `共 ${sessions.length} 条会话，显示最近 10 条` });
        }
      } catch (err) {
        send({
          type: 'error',
          message: `加载失败：${err instanceof Error ? err.message : 'Unknown error'}`,
        });
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
