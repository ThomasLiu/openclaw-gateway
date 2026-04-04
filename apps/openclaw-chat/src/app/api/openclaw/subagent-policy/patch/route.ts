/**
 * POST /api/openclaw/subagent-policy/patch
 *
 * 更新子代理策略（merge-patch 模式）
 *
 * Body: {
 *   baseHash: string,       // 网关配置的当前 hash（用于乐观锁）
 *   kind: 'defaults' | 'tools' | 'agent',
 *   agentId?: string,      // kind=agent 时必填
 *   subagents: object | null  // null 表示移除
 * }
 *
 * 409 STALE_HASH: baseHash 不匹配
 * 400: 参数校验失败
 *
 * runtime = "nodejs"
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";
import {
  parseSubagentPolicyPatchBody,
  buildSubagentPolicyPatch,
  type SubagentPolicyKind,
} from "@/lib/subagent-policy";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 解析并校验参数
  let patchArgs: ReturnType<typeof parseSubagentPolicyPatchBody>;
  try {
    patchArgs = parseSubagentPolicyPatchBody(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const client = await getOpenClawClient();

    // 构建 merge-patch 对象
    const patch = buildSubagentPolicyPatch(
      patchArgs.kind as SubagentPolicyKind,
      patchArgs.agentId,
      patchArgs.subagents
    );

    // 调用网关 config.patch
    await client.configPatch(patch, patchArgs.baseHash);

    return NextResponse.json({ ok: true, kind: patchArgs.kind });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // 检测 baseHash 不匹配（409 STALE_HASH）
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
