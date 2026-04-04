/**
 * POST /api/chat/abort — 中止运行中的聊天
 *
 * 运行时：nodejs
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";

type AbortBody = {
  agentId?: string;
  sessionKey?: string;
  runId?: string;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: AbortBody;
  try {
    body = (await request.json()) as AbortBody;
  } catch {
    return NextResponse.json(
      { error: "invalid JSON body" },
      { status: 400 }
    );
  }

  const { agentId, sessionKey, runId } = body;

  if (!agentId || !agentId.trim()) {
    return NextResponse.json(
      { error: "agentId required" },
      { status: 400 }
    );
  }

  // 会话键规范：缺 sessionKey 等价于 default
  const skParam = sessionKey?.trim() || "default";
  const finalSessionKey = skParam.startsWith("agent:")
    ? skParam
    : `agent:${agentId}:chat:${skParam}`;

  try {
    const client = await getOpenClawClient();
    await client.abortChat(finalSessionKey, runId?.trim() || undefined);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
