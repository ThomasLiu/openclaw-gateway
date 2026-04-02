import { NextRequest, NextResponse } from "next/server";
import * as path from "path";
import * as os from "os";

export const runtime = "nodejs";

/**
 * GET /api/agent/workspace/[agentId] — resolve workspace path for agent
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const stateDir = process.env.OPENCLAW_STATE_DIR ?? path.join(os.homedir(), ".openclaw", "agents");
  const workspaceDir = path.join(stateDir, decodeURIComponent(agentId), "workspace");
  return NextResponse.json({ workspaceDir, agentId });
}
