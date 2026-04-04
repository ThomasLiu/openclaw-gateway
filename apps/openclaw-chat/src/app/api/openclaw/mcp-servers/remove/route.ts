/**
 * POST /api/openclaw/mcp-servers/remove
 *
 * 从网关配置中移除 MCP 服务
 *
 * Body: { id: string, baseHash: string }
 *
 * 404: MCP 服务不存在
 * 409: baseHash 不匹配
 *
 * runtime = "nodejs"
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";
import {
  getMcpServerById,
  removeMcpServerFromConfig,
} from "@/lib/mcp-services-from-config";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const obj = body as Record<string, unknown>;

  if (typeof obj.id !== "string" || obj.id.trim() === "") {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  if (typeof obj.baseHash !== "string" || obj.baseHash.trim() === "") {
    return NextResponse.json({ error: "baseHash is required" }, { status: 400 });
  }

  const id = (obj.id as string).trim();

  try {
    const client = await getOpenClawClient();

    // 检查服务是否存在
    const config = await client.configGet();
    const server = getMcpServerById(config, id);

    if (!server) {
      return NextResponse.json(
        { error: `MCP server '${id}' not found` },
        { status: 404 }
      );
    }

    // 构造移除 patch 并应用
    const patch = removeMcpServerFromConfig(id);
    await client.configPatch(patch, (obj.baseHash as string).trim());

    return NextResponse.json({ ok: true, id });
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
