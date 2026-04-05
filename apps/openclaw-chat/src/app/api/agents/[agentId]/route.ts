/**
 * /api/agents/[agentId] — Agent 管理 API
 *
 * DELETE - 删除指定 Agent
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
): Promise<NextResponse> {
  try {
    const { agentId } = await params;

    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    // 不能删除 main agent
    if (agentId === "main") {
      return NextResponse.json({ error: "Cannot delete the main agent" }, { status: 400 });
    }

    const client = await getOpenClawClient();

    // 调用 gateway 的 agents.delete 方法
    await client.request("agents.delete", { agentId });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
