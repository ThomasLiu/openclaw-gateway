/**
 * Gateway configuration loading.
 * Priority:
 * 1. Environment variables (OPENCLAW_GATEWAY_URL, OPENCLAW_TOKEN, OPENCLAW_PASSWORD)
 * 2. ~/.openclaw/openclaw.json fallback
 * 3. Throw error if neither is available
 */

export type GatewayAuthConfig = {
  gatewayUrl: string; // http(s) base, no path
  token?: string;
  password?: string;
};

/** Normalize ws:// → http:// and wss:// → https:// */
export function normalizeHttpBase(url: string): string {
  return url.replace(/^ws:\/\//, "http://").replace(/^wss:\/\//, "https://");
}

/** Check if a URL contains localhost or 127.0.0.1 */
export function isLocalhostUrl(url: string): boolean {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

/** Read the openclaw.json config file */
function readOpenClawJson(): Record<string, unknown> | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readFileSync } = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { join } = require("path") as typeof import("path");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { homedir } = require("os") as { homedir: () => string };
    const configPath = join(homedir(), ".openclaw", "openclaw.json");
    const content = readFileSync(configPath, "utf-8");
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

interface OpenClawJsonGateway {
  url?: string;
  port?: number;
  auth?: {
    token?: string;
    password?: string;
  };
}

interface OpenClawJsonAgents {
  list?: Array<{ id: string; name?: string }>;
}

/**
 * Get gateway configuration.
 * Throws if no configuration can be found.
 */
export function getGatewayConfig(): GatewayAuthConfig {
  // Priority 1: Environment variables
  const envUrl = process.env.OPENCLAW_GATEWAY_URL;
  const envToken = process.env.OPENCLAW_TOKEN;
  const envPassword = process.env.OPENCLAW_PASSWORD;

  if (envUrl) {
    const gatewayUrl = normalizeHttpBase(envUrl);
    // If token/password not in env, try to read from openclaw.json
    if (envToken || envPassword) {
      return { gatewayUrl, token: envToken, password: envPassword };
    }
    const jsonConfig = readOpenClawJson();
    if (jsonConfig) {
      const gw = jsonConfig.gateway as OpenClawJsonGateway | undefined;
      return {
        gatewayUrl,
        token: envToken ?? gw?.auth?.token,
        password: envPassword ?? gw?.auth?.password,
      };
    }
    return { gatewayUrl, token: envToken, password: envPassword };
  }

  // Priority 2: ~/.openclaw/openclaw.json
  const jsonConfig = readOpenClawJson();
  if (!jsonConfig) {
    throw new Error(
      "No gateway configuration found. Set OPENCLAW_GATEWAY_URL environment variable or ensure ~/.openclaw/openclaw.json exists."
    );
  }

  const gw = jsonConfig.gateway as OpenClawJsonGateway | undefined;
  const port = gw?.port ?? 18789;
  const gatewayUrl = `http://127.0.0.1:${port}`;

  return {
    gatewayUrl,
    token: gw?.auth?.token,
    password: gw?.auth?.password,
  };
}

/** List agents from openclaw.json */
export type AgentInfo = { id: string; name?: string };

export function listAgentsFromOpenClawJson(): AgentInfo[] {
  const jsonConfig = readOpenClawJson();
  if (!jsonConfig) {
    return [{ id: "main" }];
  }

  const agents = jsonConfig.agents as OpenClawJsonAgents | undefined;
  const list = agents?.list;

  if (!list || list.length === 0) {
    return [{ id: "main" }];
  }

  return list.map((a) => ({ id: a.id, name: a.name }));
}
