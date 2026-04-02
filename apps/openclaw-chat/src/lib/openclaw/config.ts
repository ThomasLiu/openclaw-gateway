/**
 * Gateway configuration resolver.
 *
 * Priority:
 *  1. OPENCLAW_GATEWAY_URL env var  → use it (normalize ws→http)
 *  2. ~/.openclaw/openclaw.json    → infer from gateway.port
 *  3. throw
 */
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { GatewayAuthConfig } from "@/components/chat-types";

export interface OpenClawJsonConfig {
  gateway?: {
    port?: number;
    auth?: {
      token?: string;
      password?: string;
    };
  };
  agents?: {
    list?: Array<{ id: string; label?: string }>;
  };
}

function normalizeHttpBase(url: string): string {
  return url.replace(/^ws:\/\//, "http://").replace(/^wss:\/\//, "https://");
}

function readOpenClawJson(): OpenClawJsonConfig | null {
  const home = os.homedir();
  const configPath = path.join(home, ".openclaw", "openclaw.json");
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as OpenClawJsonConfig;
  } catch {
    return null;
  }
}

/**
 * Resolves the gateway URL and credentials.
 * Throws if no configuration can be found.
 */
export function getGatewayConfig(): GatewayAuthConfig {
  const envUrl = process.env.OPENCLAW_GATEWAY_URL;
  const envToken = process.env.OPENCLAW_TOKEN;
  const envPassword = process.env.OPENCLAW_PASSWORD;

  if (envUrl) {
    const gatewayUrl = normalizeHttpBase(envUrl.trim());
    const token = envToken?.trim() || undefined;
    const password = envPassword?.trim() || undefined;

    // If no explicit credentials, try to read from openclaw.json fallback
    if (!token && !password) {
      const json = readOpenClawJson();
      if (json?.gateway?.auth) {
        return {
          gatewayUrl,
          token: json.gateway.auth.token,
          password: json.gateway.auth.password,
        };
      }
    }

    return { gatewayUrl, token, password };
  }

  // No env URL — must have ~/.openclaw/openclaw.json
  const json = readOpenClawJson();
  if (!json) {
    throw new Error(
      "OPENCLAW_GATEWAY_URL is not set and ~/.openclaw/openclaw.json not found. " +
        "Set OPENCLAW_GATEWAY_URL or install OpenClaw."
    );
  }

  const port = json.gateway?.port ?? 18789;
  return {
    gatewayUrl: `http://127.0.0.1:${port}`,
    token: json.gateway?.auth?.token,
    password: json.gateway?.auth?.password,
  };
}

/**
 * Read agent list from ~/.openclaw/openclaw.json agents.list.
 * Falls back to a single "main" agent.
 */
export function listAgentsFromOpenClawJson(): Array<{ id: string; label: string }> {
  const json = readOpenClawJson();
  const agents = json?.agents?.list;
  if (!agents || agents.length === 0) {
    return [{ id: "main", label: "main" }];
  }
  return agents.map((a) => ({ id: a.id, label: a.label ?? a.id }));
}
