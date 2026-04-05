/**
 * POST /api/openclaw/update
 *
 * 更新检查或触发
 *
 * Body: { action: 'check' | 'install' }
 *
 * action=check: 返回 { available, currentVersion?, latestVersion? }
 * action=install: 返回 SSE 流式输出，包含 CLI 更新日志
 *
 * 网关 update RPC 不存在时优雅降级到 CLI
 *
 * runtime = "nodejs"
 * dynamic = "force-dynamic"
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";
import { spawn } from "child_process";
import { getOpenClawCliPath } from "@/config/openclaw-cli-actions";

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

  // install 使用 SSE 流式输出
  if (action === "install") {
    return handleInstallUpdate();
  }

  // check 返回 JSON
  try {
    const client = await getOpenClawClient();
    const info = await checkForUpdates(client);
    return NextResponse.json(info);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

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

/** SSE 流式更新安装 */
function handleInstallUpdate(): NextResponse {
  const cliPath = getOpenClawCliPath();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let killed = false;

      // 尝试 openclaw update，如果失败则尝试 openclaw self-update
      const proc = spawn(cliPath, ["update"], {
        timeout: 300_000,
      });

      proc.on("error", (err) => {
        if (killed) return;
        killed = true;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", text: err.message })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", exitCode: -1 })}\n\n`));
          controller.close();
        } catch {
          // Stream closed
        }
      });

      proc.on("close", (code) => {
        if (killed) return;
        killed = true;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", exitCode: code ?? 0 })}\n\n`));
          controller.close();
        } catch {
          // Stream closed
        }
      });

      proc.stdout.on("data", (data) => {
        if (killed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "stdout", text: data.toString() })}\n\n`));
        } catch {
          // Stream closed
        }
      });

      proc.stderr.on("data", (data) => {
        if (killed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "stderr", text: data.toString() })}\n\n`));
        } catch {
          // Stream closed
        }
      });

      // 5 分钟超时
      setTimeout(() => {
        if (!killed) {
          killed = true;
          proc.kill();
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", text: "Update timed out after 5 minutes" })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", exitCode: 124 })}\n\n`));
            controller.close();
          } catch {
            // Stream closed
          }
        }
      }, 300_000);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
