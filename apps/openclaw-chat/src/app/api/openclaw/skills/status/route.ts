/**
 * GET /api/openclaw/skills/status
 *
 * 获取技能状态列表
 *
 * runtime = "nodejs"
 * dynamic = "force-dynamic"
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";
import type { SkillStatus } from "@/lib/openclaw/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const agentId = req.nextUrl.searchParams.get("agentId") ?? undefined;

  try {
    const client = await getOpenClawClient();
    const skills = await client.skillsStatus();

    // 如果指定了 agentId，按 agentId 过滤
    const filtered = agentId
      ? skills.filter((s) => !s.id || s.id.includes(agentId))
      : skills;

    return NextResponse.json({ skills: filtered } satisfies { skills: SkillStatus[] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
