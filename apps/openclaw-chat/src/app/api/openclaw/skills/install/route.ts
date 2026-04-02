import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/pool";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const name: string = body.name?.trim();
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const client = await getOpenClawClient();
    await client.skillsInstall({
      name,
      agentId: body.agentId?.trim(),
      scope: body.scope?.trim(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
