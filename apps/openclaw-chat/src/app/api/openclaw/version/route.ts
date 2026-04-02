import { NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/openclaw/version — CLI/gateway version info
export async function GET() {
  // Stub: actual version would be obtained from CLI or gateway
  return NextResponse.json({
    version: "0.0.0",
    gateway: "unknown",
    cli: "unknown",
  });
}
