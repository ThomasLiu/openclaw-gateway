import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/pool";

export const runtime = "nodejs";

const THREAD_KEY = "default";

function normalizeSessionKey(agentId: string, sk?: string): string {
  const base = sk?.trim() || THREAD_KEY;
  if (base.startsWith("agent:")) return base;
  return `agent:${agentId}:chat:${base}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const agentId: string = body.agentId?.trim();
    const sessionKeyParam: string | undefined = body.sessionKey?.trim();
    const runId: string | undefined = body.runId?.trim();

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    const skParam = sessionKeyParam || THREAD_KEY;
    const finalSessionKey = normalizeSessionKey(agentId, skParam);

    const client = await getOpenClawClient();
    await client.abortChat({ sessionKey: finalSessionKey, runId });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
