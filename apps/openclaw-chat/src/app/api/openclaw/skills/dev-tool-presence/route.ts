/**
 * GET /api/openclaw/skills/dev-tool-presence
 *
 * 开发工具存在性探测
 *
 * Query: tool（可选，检测特定工具；无参数则检测所有常用工具）
 *
 * runtime = "nodejs"
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { checkDevTools, type ToolPresence } from "@/lib/dev-tool-presence";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const toolParam = req.nextUrl.searchParams.get("tool");

  // 解析工具参数（支持 tool=a,b,c 格式）
  let tools: string[] | undefined;
  if (toolParam) {
    tools = toolParam.split(",").map((t) => t.trim()).filter(Boolean);
  }

  try {
    const results = await checkDevTools(tools);
    return NextResponse.json({ tools: results } satisfies { tools: ToolPresence[] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message, tools: [] }, { status: 500 });
  }
}
