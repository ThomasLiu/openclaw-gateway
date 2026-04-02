import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/pool";

export const runtime = "nodejs";

// POST /api/gateway/sessions — sessions.create
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const agentId: string = body.agentId?.trim();
    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

    const client = await getOpenClawClient();
    const result = await client.sessionsCreate({ agentId, label: body.label?.trim() });

    return NextResponse.json({ ok: true, key: result.key });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

// GET /api/gateway/sessions — sessions.list
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? "100")));
  const activeMinutes = Number(searchParams.get("activeMinutes") ?? "0") || undefined;
  const search = searchParams.get("search") || undefined;
  const spawnedBy = searchParams.get("spawnedBy") || undefined;
  const agentId = searchParams.get("agentId") || undefined;

  try {
    const client = await getOpenClawClient();
    const rawSessions = await client.listSessions({
      includeGlobal: true,
      includeUnknown: true,
      includeDerivedTitles: true,
      includeLastMessage: true,
      limit,
      activeMinutes,
      search,
      spawnedBy,
      agentId,
    });

    return NextResponse.json({ sessions: rawSessions });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
