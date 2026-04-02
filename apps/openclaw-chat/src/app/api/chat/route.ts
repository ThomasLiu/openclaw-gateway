import { NextRequest, NextResponse } from 'next/server';
import { getOpenClawClient } from '@/lib/openclaw/pool';
import { insertMessage, listMessages } from '@/lib/db';
import type { UiMessage } from '@/components/chat-types';
import { extractAssistantTextFromGatewayMessage } from '@/lib/openclaw/client';

export const runtime = 'nodejs';

const THREAD_KEY = 'default';

function normalizeSessionKey(agentId: string, sk?: string): string {
  const base = sk?.trim() || THREAD_KEY;
  if (base.startsWith('agent:')) return base;
  return `agent:${agentId}:chat:${base}`;
}

function gatewayHistoryToUiMessages(history: unknown[]): UiMessage[] {
  return (history as unknown[]).map((item, i) => {
    const msg = item as Record<string, unknown>;
    return {
      id: String(msg.id ?? `msg-${i}`),
      role: (msg.role as UiMessage['role']) ?? 'assistant',
      content:
        typeof msg.content === 'string' ? msg.content : extractAssistantTextFromGatewayMessage(msg),
      createdAt: String(msg.createdAt ?? new Date().toISOString()),
    };
  });
}

// GET /api/chat — load messages
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const agentId = searchParams.get('agentId')?.trim();
  const sessionKey = searchParams.get('sessionKey')?.trim();
  let limit = Math.min(1000, Math.max(1, Number(searchParams.get('limit') ?? '200')));

  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 });
  }

  try {
    if (sessionKey) {
      const client = await getOpenClawClient();
      const history = await client.fetchChatHistory({ sessionKey, limit });
      return NextResponse.json({
        messages: gatewayHistoryToUiMessages(history),
        source: 'gateway',
        sessionKey,
      });
    }

    const rows = listMessages(agentId, limit);
    const messages: UiMessage[] = rows
      .slice()
      .reverse()
      .map((row) => ({
        id: String(row.id),
        role: row.role as UiMessage['role'],
        content: row.content,
        createdAt: row.created_at,
      }));
    return NextResponse.json({ messages, source: 'sqlite' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/chat — SSE streaming
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const agentId: string = body.agentId?.trim();
    const text: string | undefined = body.text?.trim();
    const sessionKeyParam: string | undefined = body.sessionKey?.trim();
    const attachments: unknown[] = Array.isArray(body.attachments) ? body.attachments : [];

    if (!agentId) {
      return NextResponse.json({ error: 'agentId required' }, { status: 400 });
    }

    const hasAttachments = attachments.length > 0;
    if (!text && !hasAttachments) {
      return NextResponse.json(
        { error: 'agentId and (text or image attachments) required' },
        { status: 400 }
      );
    }

    const persistSqlite = !sessionKeyParam;

    // Store user message in SQLite if no gateway session
    if (persistSqlite && text) {
      insertMessage({ agent_id: agentId, role: 'user', content: text });
    }

    const skParam = sessionKeyParam || THREAD_KEY;
    const finalSessionKey = normalizeSessionKey(agentId, skParam);

    const client = await getOpenClawClient();

    // Start streaming
    const runId = await client.sendChatMessageStreaming({
      sessionKey: finalSessionKey,
      text,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    // SSE stream
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        };

        // Subscribe to chat events
        const onDelta = (payload: { sessionKey: string; runId?: string; message?: unknown }) => {
          const deltaText = extractAssistantTextFromGatewayMessage(payload.message);
          if (deltaText) {
            send({ deltaText, runId: payload.runId });
          }
        };

        const onFinal = async (payload: {
          sessionKey: string;
          runId?: string;
          message?: unknown;
        }) => {
          // Persist assistant message to SQLite if local
          if (persistSqlite) {
            const content = extractAssistantTextFromGatewayMessage(payload.message);
            if (content) {
              insertMessage({ agent_id: agentId, role: 'assistant', content });
            }
          }
          send({ final: true, sessionKey: payload.sessionKey, runId: payload.runId });
        };

        const onError = (payload: { error?: string }) => {
          send({ error: payload.error ?? 'Stream error' });
        };

        client.on('chat.delta', onDelta);
        client.on('chat.final', onFinal);
        client.on('chat.error', onError);

        try {
          // Signal that stream has started
          send({ started: true, runId });
        } finally {
          // Cleanup when client disconnects
          req.signal.addEventListener('abort', async () => {
            client.off('chat.delta', onDelta);
            client.off('chat.final', onFinal);
            client.off('chat.error', onError);
            try {
              await client.abortChat({ sessionKey: finalSessionKey, runId });
            } catch {
              // ignore abort errors
            }
          });
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
