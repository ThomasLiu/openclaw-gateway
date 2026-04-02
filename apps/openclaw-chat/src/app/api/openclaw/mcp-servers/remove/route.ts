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
    // MCP removal is a config patch operation
    const config = (await client.configGet()) as Record<string, unknown>;
    const mcp = (config.mcp as Record<string, unknown>) ?? {};
    const servers = (mcp.servers as Record<string, unknown>) ?? {};
    delete servers[name];

    await client.configPatch({
      patch: { mcp: { ...mcp, servers } },
      baseHash: String((config as { hash?: string }).hash ?? ""),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
