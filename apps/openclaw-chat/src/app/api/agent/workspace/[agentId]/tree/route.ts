/**
 * GET /api/agent/workspace/[agentId]/tree
 * 列举工作区目录树
 *
 * Query 参数：
 * - maxDepth: 最大深度（默认 10，上限 20）
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { resolveAgentWorkspaceDir } from "@/lib/openclaw/workspace-path";
import { listWorkspaceTree } from "@/lib/openclaw/workspace-explore";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
): Promise<NextResponse> {
  try {
    const { agentId } = await params;
    const decodedAgentId = decodeURIComponent(agentId);

    // 解析 maxDepth 参数
    const maxDepthStr = req.nextUrl.searchParams.get("maxDepth");
    const maxDepth = maxDepthStr ? parseInt(maxDepthStr, 10) : 10;

    if (isNaN(maxDepth) || maxDepth < 1) {
      return NextResponse.json(
        { error: "maxDepth must be a positive integer" },
        { status: 400 }
      );
    }

    const workspaceDir = await resolveAgentWorkspaceDir(decodedAgentId);
    const tree = await listWorkspaceTree(workspaceDir, maxDepth);

    return NextResponse.json({
      workspaceDir,
      agentId: decodedAgentId,
      tree,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
