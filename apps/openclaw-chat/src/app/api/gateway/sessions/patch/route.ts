/**
 * POST /api/gateway/sessions/patch — 修改会话配置（如 model 覆盖）
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";

type PatchBody = {
  key?: string;
  model?: string | null;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { error: "invalid JSON body" },
      { status: 400 }
    );
  }

  const key = (body.key as string | undefined)?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "key is required" },
      { status: 400 }
    );
  }

  // model 键必须存在（可以为 null）
  if (!Object.prototype.hasOwnProperty.call(body, "model")) {
    return NextResponse.json(
      { error: "model key is required" },
      { status: 400 }
    );
  }

  try {
    const client = await getOpenClawClient();
    const result = await client.sessionsPatch(key, {
      model: body.model,
    });
    void result; // sessionsPatch 返回 void，网关返回结果忽略
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
