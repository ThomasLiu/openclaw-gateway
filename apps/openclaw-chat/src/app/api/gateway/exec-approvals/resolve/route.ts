import { NextRequest, NextResponse } from 'next/server';
import { getOpenClawClient } from '@/lib/openclaw/pool';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const id: string = body.id?.trim();
    const decision: string = body.decision;
    const kind: string = body.kind ?? 'exec';

    if (!id || !decision) {
      return NextResponse.json({ error: 'id and decision required' }, { status: 400 });
    }

    const validDecisions = ['allow-once', 'allow-always', 'deny'];
    if (!validDecisions.includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }

    const client = await getOpenClawClient();

    if (kind === 'plugin') {
      await client.pluginApprovalResolve({ id, decision });
    } else {
      await client.execApprovalResolve({ id, decision });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
