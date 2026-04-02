/**
 * Load and parse the OpenClaw JSON configuration file.
 * Respects OPENCLAW_CONFIG_PATH env var, falls back to ~/.openclaw/openclaw.json.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface OpenClawJsonObject {
  [key: string]: unknown;
}

export function loadOpenClawJsonObject(): OpenClawJsonObject {
  const configPath =
    process.env.OPENCLAW_CONFIG_PATH ?? path.join(os.homedir(), '.openclaw', 'openclaw.json');

  if (!fs.existsSync(configPath)) {
    throw new Error(`OpenClaw config not found at: ${configPath}`);
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  try {
    return JSON.parse(raw) as OpenClawJsonObject;
  } catch {
    throw new Error(`Failed to parse OpenClaw config as JSON: ${configPath}`);
  }
}
