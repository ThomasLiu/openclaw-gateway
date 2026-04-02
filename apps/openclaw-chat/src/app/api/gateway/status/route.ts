import { NextResponse } from 'next/server';
import { getGatewayConfig } from '@/lib/openclaw/config';
import { OpenClawClient } from '@/lib/openclaw/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PROBE_MS = 12_000;

async function tryProbe(config: {
  gatewayUrl: string;
  token?: string;
  password?: string;
}): Promise<{ ok: boolean; connected: boolean; source: string }> {
  const client = new OpenClawClient(config);
  try {
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), PROBE_MS)),
    ]);
    client.disconnect();
    return { ok: true, connected: true, source: 'ws' };
  } catch {
    // fall through to CLI probe
    return { ok: true, connected: false, source: 'cli' };
  }
}

export async function GET() {
  try {
    const config = getGatewayConfig();
    const result = await tryProbe(config);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, connected: false, error: msg }, { status: 200 });
  }
}
