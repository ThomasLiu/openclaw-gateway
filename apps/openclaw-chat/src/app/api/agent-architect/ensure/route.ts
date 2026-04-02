import { NextResponse } from 'next/server';
import { getOpenClawClient } from '@/lib/openclaw/pool';
import { ensureOpenClawAgentArchitect } from '@/lib/openclaw-agent-architect/ensure-architect';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const client = await getOpenClawClient();
    const result = await ensureOpenClawAgentArchitect(client);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
