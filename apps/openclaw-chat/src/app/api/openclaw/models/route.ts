import { NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/pool";

export const runtime = "nodejs";

export async function GET() {
  try {
    const client = await getOpenClawClient();
    const models = await client.modelsList();
    return NextResponse.json({ models });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
