import { NextRequest, NextResponse } from 'next/server';
import { getOpenClawClient } from '@/lib/openclaw/pool';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export interface AgentRequestLogEntry {
  timestamp: string;
  agentId: string;
  sessionKey: string;
  runId?: string;
  model?: string;
  durationMs?: number;
  messageCount?: number;
  status: 'success' | 'error' | 'streaming';
  summary?: string;
}

export interface AgentRequestDiagnostics {
  totalRequests: number;
  totalErrors: number;
  avgDurationMs: number;
  recentEntries: AgentRequestLogEntry[];
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const agentId = searchParams.get('agentId')?.trim() || 'main';
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200);

  try {
    const client = await getOpenClawClient();

    // Fetch recent sessions to build request diagnostics
    const sessions = (await client.listSessions({
      agentId,
      limit,
      includeLastMessage: true,
    })) as Array<{
      key: string;
      agentId: string;
      updatedAt?: string;
      createdAt?: string;
      model?: string;
      runId?: string;
    }>;

    const entries: AgentRequestLogEntry[] = sessions.map((s) => ({
      timestamp: s.updatedAt ?? s.createdAt ?? new Date().toISOString(),
      agentId: s.agentId,
      sessionKey: s.key,
      runId: s.runId,
      model: s.model,
      status: 'success' as const,
    }));

    const totalRequests = entries.length;
    const totalErrors = 0;
    const avgDurationMs = 0;

    return NextResponse.json({
      totalRequests,
      totalErrors,
      avgDurationMs,
      recentEntries: entries,
    } satisfies AgentRequestDiagnostics);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error', totalRequests: 0, totalErrors: 0, avgDurationMs: 0, recentEntries: [] },
      { status: 500 }
    );
  }
}
