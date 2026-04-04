/**
 * POST /api/openclaw/skills/install
 *
 * 安装技能
 *
 * Body: { skillId: string }
 *
 * 返回 202 Accepted（异步安装）
 *
 * runtime = "nodejs"
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const obj = body as Record<string, unknown>;

  if (typeof obj.skillId !== "string" || obj.skillId.trim() === "") {
    return NextResponse.json({ error: "skillId is required" }, { status: 400 });
  }

  const skillId = (obj.skillId as string).trim();

  try {
    const client = await getOpenClawClient();
    await client.skillsInstall(skillId);

    return NextResponse.json({ ok: true, skillId }, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
