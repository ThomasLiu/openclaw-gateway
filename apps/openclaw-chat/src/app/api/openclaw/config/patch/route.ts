import { NextRequest, NextResponse } from 'next/server';
import { getOpenClawClient } from '@/lib/openclaw/pool';

export const runtime = 'nodejs';

/**
 * PATCH /api/openclaw/config/patch
 *
 * Body: { baseHash: string; modelId: string; agentId?: string }
 *
 * Changes the default model for the global agent defaults or for a specific agent.
 * Uses config.patch which requires the current baseHash for optimistic locking.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const baseHash: string = body.baseHash?.trim();
    if (!baseHash) return NextResponse.json({ error: 'baseHash required' }, { status: 400 });

    const modelId: string = body.modelId?.trim();
    if (!modelId) return NextResponse.json({ error: 'modelId required' }, { status: 400 });

    const agentId: string | undefined = body.agentId?.trim();

    // Build the patch structure
    const patch: Record<string, unknown> = {};

    if (agentId) {
      // Patch model for a specific agent
      patch.agents = { list: [{ id: agentId, model: { primary: modelId } }] };
    } else {
      // Patch global default model
      patch.agents = { defaults: { model: { primary: modelId } } };
    }

    const client = await getOpenClawClient();
    await client.configPatch({ patch, baseHash });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.toLowerCase().includes('hash') || msg.includes('STALE')) {
      return NextResponse.json({ error: 'STALE_HASH' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
