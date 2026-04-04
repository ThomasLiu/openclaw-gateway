/**
 * POST /api/openclaw/update
 *
 * 更新检查或触发
 *
 * Body: { action: 'check' | 'install' }
 *
 * 返回 { available, currentVersion?, latestVersion? }
 *
 * 网关 update RPC 不存在时优雅降级
 *
 * runtime = "nodejs"
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";

type UpdateInfo = {
  available: boolean;
  currentVersion?: string;
  latestVersion?: string;
  message?: string;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const obj = body as Record<string, unknown>;
  const action = typeof obj.action === "string" ? obj.action.trim() : "check";

  if (action !== "check" && action !== "install") {
    return NextResponse.json(
      { error: "action must be 'check' or 'install'" },
      { status: 400 }
    );
  }

  try {
    const client = await getOpenClawClient();

    if (action === "check") {
      const info = await checkForUpdates(client);
      return NextResponse.json(info);
    } else {
      const info = await triggerUpdate(client);
      return NextResponse.json(info);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // 网关不支持 update RPC
    if (
      message.includes("not found") ||
      message.includes("method") ||
      message.includes("unrecognized")
    ) {
      return NextResponse.json(
        {
          available: false,
          message: "Gateway does not support update operations",
        } satisfies UpdateInfo,
        { status: 501 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function checkForUpdates(client: Awaited<ReturnType<typeof getOpenClawClient>>): Promise<UpdateInfo> {
  try {
    const resp = (await client.request("update.check")) as {
      available?: boolean;
      currentVersion?: string;
      latestVersion?: string;
    };

    return {
      available: resp?.available ?? false,
      currentVersion: resp?.currentVersion,
      latestVersion: resp?.latestVersion,
    };
  } catch {
    // 降级：无法检查更新
    return {
      available: false,
      message: "Unable to check for updates",
    };
  }
}

async function triggerUpdate(client: Awaited<ReturnType<typeof getOpenClawClient>>): Promise<UpdateInfo> {
  try {
    const resp = (await client.request("update.install")) as {
      success?: boolean;
      message?: string;
    };

    return {
      available: true,
      message: resp?.message ?? "Update triggered",
    };
  } catch {
    return {
      available: false,
      message: "Unable to trigger update",
    };
  }
}
