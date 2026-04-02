import { NextRequest, NextResponse } from 'next/server';
import { getOpenClawClient } from '@/lib/openclaw/pool';

export const runtime = 'nodejs';

function serializeError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (typeof msg === 'string' && msg !== '[object Object]') return msg;
    try { return JSON.stringify(err); } catch { return String(err); }
  }
  try { return JSON.stringify(err); } catch { return String(err); }
}

export async function GET() {
  try {
    const client = await getOpenClawClient();
    const crons = await client.cronList();
    return NextResponse.json({ crons });
  } catch (err) {
    return NextResponse.json({ error: serializeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const client = await getOpenClawClient();

    if (body.action === 'update') {
      await client.cronUpdate(body.params);
    } else if (body.action === 'remove') {
      await client.cronRemove({ id: body.id });
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: serializeError(err) }, { status: 500 });
  }
}
