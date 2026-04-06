/**
 * GET /api/openclaw/config
 *
 * 获取网关脱敏配置快照（含 hash）
 *
 * runtime = "nodejs"
 * dynamic = "force-dynamic"
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getOpenClawClient } from "@/lib/openclaw/index";

export async function GET(): Promise<NextResponse> {
  try {
    const client = await getOpenClawClient();
    const config = await client.configGet();

    // 脱敏：移除敏感字段
    const sanitized = sanitizeConfig(config);

    return NextResponse.json(sanitized);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** 脱敏网关配置：移除敏感字段 */
function sanitizeConfig(config: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE_KEYS = new Set([
    "password",
    "token",
    "apiKey",
    "api_key",
    "secret",
    "credential",
    "privateKey",
    "private_key",
  ]);

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    const lowerKey = key.toLowerCase();

    // 跳过敏感键
    if (
      SENSITIVE_KEYS.has(lowerKey) ||
      lowerKey.includes("password") ||
      lowerKey.includes("token") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("apikey")
    ) {
      result[key] = "[REDACTED]";
      continue;
    }

    // 递归脱敏对象
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizeConfig(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "object" && item !== null
          ? sanitizeConfig(item as Record<string, unknown>)
          : item
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}
