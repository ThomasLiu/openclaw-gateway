import { NextRequest, NextResponse } from 'next/server';
import { getOpenClawClient } from '@/lib/openclaw/pool';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const key: string = body.key?.trim();
    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });
    if (!('model' in body))
      return NextResponse.json({ error: 'model key required' }, { status: 400 });

    const model: string | null = body.model === null ? null : String(body.model);

    const client = await getOpenClawClient();
    await client.sessionsPatch({ key, model });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
