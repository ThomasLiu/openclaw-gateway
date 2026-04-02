import { NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/pool";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const client = await getOpenClawClient();
    const config = await client.configGet();
    return NextResponse.json(config);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
