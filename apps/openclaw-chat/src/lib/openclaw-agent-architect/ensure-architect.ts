/**
 * ensureOpenClawAgentArchitect — ensures the Architect agent exists in the gateway config.
 */
import type { OpenClawClient } from '@/lib/openclaw/client';
import { OPENCLAW_AGENT_ARCHITECT_ID } from './constants';

export interface EnsureArchitectResult {
  alreadyExists: boolean;
  workspacePath?: string;
}

export async function ensureOpenClawAgentArchitect(
  client: OpenClawClient
): Promise<EnsureArchitectResult> {
  const config = (await client.configGet()) as {
    agents?: { list?: Array<{ id: string }> };
    hash?: string;
  };

  const agents = config.agents?.list ?? [];
  const exists = agents.some((a) => a.id === OPENCLAW_AGENT_ARCHITECT_ID);

  if (exists) {
    return { alreadyExists: true };
  }

  // Add architect to agents list via config.patch
  await client.configPatch({
    patch: {
      agents: {
        list: [...agents, { id: OPENCLAW_AGENT_ARCHITECT_ID }],
      },
    },
    baseHash: String(config.hash ?? ''),
  });

  return { alreadyExists: false };
}
