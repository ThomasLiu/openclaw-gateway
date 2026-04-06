/**
 * GET /api/openclaw/version
 *
 * 获取 CLI 和网关版本信息
 *
 * runtime = "nodejs"
 * dynamic = "force-dynamic"
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { getGatewayConfig } from "@/lib/openclaw/config";

type VersionResult = {
  cliVersion?: string;
  gatewayVersion?: string;
  cliError?: string;
  gatewayError?: string;
};

export async function GET(): Promise<NextResponse> {
  const result: VersionResult = {};

  // 获取 CLI 版本
  try {
    result.cliVersion = await getCliVersion();
  } catch (err) {
    result.cliError = err instanceof Error ? err.message : String(err);
  }

  // 获取网关版本
  try {
    const config = getGatewayConfig();
    // 通过网关 REST API 探测版本（如果网关支持）
    const gatewayApiUrl = `${config.gatewayUrl}/version`;
    const resp = await fetch(gatewayApiUrl, {
      signal: AbortSignal.timeout(5000),
    });
    if (resp.ok) {
      const data = (await resp.json()) as { version?: string };
      result.gatewayVersion = data.version;
    }
  } catch {
    // 网关 REST API 可能不存在，尝试 WS RPC
    try {
      const { getOpenClawClient } = await import("@/lib/openclaw/index");
      const client = await getOpenClawClient();
      const info = (await client.request("system.info")) as { version?: string };
      result.gatewayVersion = info?.version;
    } catch {
      result.gatewayError = "Unable to determine gateway version";
    }
  }

  return NextResponse.json(result);
}

/** 执行 openclaw --version 并返回版本字符串 */
function getCliVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    const cliPath = process.env.OPENCLAW_CLI_PATH ?? "openclaw";
    const proc = spawn(cliPath, ["--version"], { timeout: 5000 });
    let output = "";

    proc.stdout.on("data", (data) => {
      output += data.toString();
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to run '${cliPath}': ${err.message}`));
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`'${cliPath} --version' exited with code ${code}`));
      }
    });

    setTimeout(() => {
      proc.kill();
      reject(new Error("Version check timed out"));
    }, 5000);
  });
}
