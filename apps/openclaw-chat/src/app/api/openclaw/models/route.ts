/**
 * GET /api/openclaw/models
 *
 * 获取可用模型列表
 *
 * runtime = "nodejs"
 * dynamic = "force-dynamic"
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";
import type { ModelInfo } from "@/lib/openclaw/types";

export async function GET(): Promise<NextResponse> {
  try {
    const client = await getOpenClawClient();
    const models = await client.modelsList();

    return NextResponse.json({ models } satisfies { models: ModelInfo[] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
