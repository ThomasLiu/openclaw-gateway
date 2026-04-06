/**
 * GET/POST /api/openclaw/skills/session
 *
 * 会话级技能管理
 *
 * GET: 获取会话激活的技能列表
 * POST: 更新会话的激活技能
 *
 * runtime = "nodejs"
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionKey = req.nextUrl.searchParams.get("sessionKey") ?? "";

  if (!sessionKey) {
    return NextResponse.json({ error: "sessionKey is required" }, { status: 400 });
  }

  try {
    const client = await getOpenClawClient();
    const result = (await client.request("skills.session.get", {
      sessionKey,
    })) as { skillIds?: string[] } | undefined;

    return NextResponse.json({
      skillIds: result?.skillIds ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message, skillIds: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const obj = body as Record<string, unknown>;

  if (typeof obj.sessionKey !== "string" || obj.sessionKey.trim() === "") {
    return NextResponse.json({ error: "sessionKey is required" }, { status: 400 });
  }

  const sessionKey = (obj.sessionKey as string).trim();
  const skillIds = Array.isArray(obj.skillIds) ? (obj.skillIds as string[]) : [];

  try {
    const client = await getOpenClawClient();
    await client.request("skills.session.patch", {
      sessionKey,
      skillIds,
    });

    return NextResponse.json({ ok: true, skillIds });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
