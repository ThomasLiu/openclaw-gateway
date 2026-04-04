/**
 * GET /api/openclaw/skills/search
 *
 * 搜索技能（从 ClawHub）
 *
 * Query: q（搜索关键词）
 *
 * 网关不支持 skills.search 时优雅降级返回空数组
 *
 * runtime = "nodejs"
 * dynamic = "force-dynamic"
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";

export type SkillSearchResult = {
  id: string;
  name?: string;
  description?: string;
  version?: string;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = req.nextUrl.searchParams.get("q") ?? "";

  if (!query.trim()) {
    return NextResponse.json({ results: [] }, { status: 200 });
  }

  try {
    const client = await getOpenClawClient();

    // 网关可能不支持 skills.search，捕获错误并降级
    let results: SkillSearchResult[] = [];
    try {
      const resp = (await client.request("skills.search", {
        query: query.trim(),
      })) as SkillSearchResult[] | { results: SkillSearchResult[] } | undefined;

      if (Array.isArray(resp)) {
        results = resp;
      } else if (resp && typeof resp === "object" && "results" in resp) {
        results = (resp as { results: SkillSearchResult[] }).results;
      }
    } catch {
      // 网关不支持 skills.search：优雅降级
      results = [];
    }

    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message, results: [] }, { status: 500 });
  }
}
