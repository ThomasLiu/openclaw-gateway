/**
 * GET /api/gateway/status
 *
 * 探测网关连接状态
 *
 * 特点：
 * - 每次 new OpenClawClient，不复用连接池
 * - 超时 PROBE_MS = 12000
 * - 失败后尝试 CLI 探测
 *
 * dynamic = "force-dynamic"
 * runtime = "nodejs"
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { OpenClawClient } from "@/lib/openclaw/client";
import { getGatewayConfig } from "@/lib/openclaw/config";
import { tryGatewayStatusViaCli } from "@/lib/openclaw/cli-status";

const PROBE_MS = 12_000;

type GatewayStatusResult =
  | { ok: true; connected: true; source: "ws"; latencyMs?: number }
  | { ok: true; connected: true; source: "cli"; message: string }
  | { ok: false; connected: false; error: string };

export async function GET(): Promise<NextResponse> {
  const result = await probeGateway();

  if (result.ok) {
    return NextResponse.json(result);
  } else {
    return NextResponse.json(result, { status: 503 });
  }
}

async function probeGateway(): Promise<GatewayStatusResult> {
  const config = getGatewayConfig();

  // WebSocket 探测
  const wsResult = await probeViaWebSocket(config);
  if (wsResult.connected) {
    return { ok: true, connected: true, source: "ws", latencyMs: wsResult.latencyMs };
  }

  // CLI 降级探测
  try {
    const cliResult = await tryGatewayStatusViaCli();
    if (cliResult.running) {
      return {
        ok: true,
        connected: true,
        source: "cli",
        message: cliResult.message ?? "Gateway is running (detected via CLI)",
      };
    }
  } catch {
    // CLI 探测也失败
  }

  return {
    ok: false,
    connected: false,
    error: wsResult.error ?? "Unable to connect to gateway",
  };
}

async function probeViaWebSocket(
  config: { gatewayUrl: string; token?: string; password?: string }
): Promise<{ connected: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now();
  const client = new OpenClawClient({
    gatewayUrl: config.gatewayUrl,
    token: config.token,
    password: config.password,
  });

  try {
    await Promise.race([
      client.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Probe timeout")), PROBE_MS)
      ),
    ]);

    const latencyMs = Date.now() - start;
    return { connected: true, latencyMs };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { connected: false, error };
  } finally {
    client.disconnect();
  }
}
