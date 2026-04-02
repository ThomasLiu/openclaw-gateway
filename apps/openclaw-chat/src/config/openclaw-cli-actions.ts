/**
 * OpenClaw CLI action whitelist for /api/openclaw/cli-exec route.
 *
 * Actions not in this list are rejected with 400.
 */
const ALLOWED_ACTIONS = new Set([
  'status',
  'version',
  'config show',
  'models list',
  'skills list',
  'agents list',
  'sessions list',
]);

export function isOpenClawCliExecAction(action: string): boolean {
  return ALLOWED_ACTIONS.has(action.trim().toLowerCase());
}

export function getOpenClawCliExecArgv(action: string, params?: unknown): string[] {
  const normalized = action.trim();
  const parts = normalized.split(/\s+/);
  const argv: string[] = [];

  if (params && typeof params === 'object') {
    for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
      if (value === true) argv.push(`--${key}`);
      else if (typeof value === 'string' && value) argv.push(`--${key}`, value);
    }
  }

  return [...parts, ...argv];
}
