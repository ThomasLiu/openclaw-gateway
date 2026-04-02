import { NextRequest, NextResponse } from 'next/server';
import { getOpenClawClient } from '@/lib/openclaw/pool';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const baseHash: string = body.baseHash?.trim();
    if (!baseHash) return NextResponse.json({ error: 'baseHash required' }, { status: 400 });

    const kind: string = body.kind;
    const agentId: string | undefined = body.agentId?.trim();
    const subagents: unknown = body.subagents;

    const patch: Record<string, unknown> = {};
    if (kind === 'defaults') {
      patch.agents = { defaults: { subagents } };
    } else if (kind === 'tools') {
      patch.tools = { subagents };
    } else if (kind === 'agent') {
      if (!agentId)
        return NextResponse.json({ error: 'agentId required for kind=agent' }, { status: 400 });
      patch.agents = { list: [{ id: agentId, subagents }] };
    } else {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
    }

    const client = await getOpenClawClient();
    await client.configPatch({ patch, baseHash });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('hash')) {
      return NextResponse.json({ error: 'STALE_HASH' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
