/**
 * GET/POST /api/openclaw/default-model
 *
 * 读写默认模型配置
 *
 * GET: 读取当前默认模型
 * POST: 设置默认模型（Body: { modelId, baseHash }）
 *
 * runtime = "nodejs"
 * dynamic = "force-dynamic"
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";
import {
  getDefaultModelId,
  buildDefaultModelPatch,
} from "@/lib/openclaw/default-model-from-config";

export async function GET(): Promise<NextResponse> {
  try {
    const client = await getOpenClawClient();
    const config = await client.configGet();
    const defaultModel = getDefaultModelId(config);

    return NextResponse.json({ defaultModel: defaultModel ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
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

  if (typeof obj.modelId !== "string" || obj.modelId.trim() === "") {
    return NextResponse.json({ error: "modelId is required" }, { status: 400 });
  }

  if (typeof obj.baseHash !== "string" || obj.baseHash.trim() === "") {
    return NextResponse.json({ error: "baseHash is required" }, { status: 400 });
  }

  try {
    const client = await getOpenClawClient();
    const patch = buildDefaultModelPatch((obj.modelId as string).trim());
    await client.configPatch(patch, (obj.baseHash as string).trim());

    return NextResponse.json({ ok: true, defaultModel: obj.modelId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (
      message.includes("STALE_HASH") ||
      message.includes("hash") ||
      message.includes("conflict") ||
      message.toLowerCase().includes("basehash")
    ) {
      return NextResponse.json({ error: "STALE_HASH", message }, { status: 409 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
