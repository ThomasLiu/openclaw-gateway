#!/usr/bin/env node
/**
 * import.mjs — Import an exported OpenClaw agent into the local configuration.
 *
 * Usage:
 *   node import.mjs                          # TTY prompt for secrets
 *   node import.mjs --secrets-file <path>    # Non-interactive secrets
 *   node import.mjs --force                   # Overwrite existing agent
 *   node import.mjs --dry-run                 # Validate without writing
 *
 * Environment:
 *   OPENCLAW_CONFIG_PATH  — path to openclaw.json (default: ~/.openclaw/openclaw.json)
 *   OPENCLAW_STATE_DIR    — state directory (default: ~/.openclaw)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, readFile, readdir, stat } from 'fs';
import { join, dirname, resolve, isAbsolute } from 'path';
import { homedir } from 'os';
import { createInterface } from 'readline';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const flags = {
  force: args.includes('--force'),
  dryRun: args.includes('--dry-run'),
  secretsFile: null as string | null,
  zipDir: null as string | null, // if importing from extracted zip dir
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--secrets-file' && args[i + 1]) {
    flags.secretsFile = args[++i];
  }
  if (args[i] === '--zip-dir' && args[i + 1]) {
    flags.zipDir = args[++i];
  }
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const CONFIG_PATH =
  process.env.OPENCLAW_CONFIG_PATH ?? join(homedir(), '.openclaw', 'openclaw.json');
const STATE_DIR = process.env.OPENCLAW_STATE_DIR ?? join(homedir(), '.openclaw');

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Load manifest & secrets-required
// ---------------------------------------------------------------------------

function loadJson(filepath) {
  return JSON.parse(readFileSync(filepath, 'utf-8'));
}

const zipRoot = flags.zipDir ?? (() => {
  // Default: script is inside the zip, so it lives next to manifest.json
  return dirname(__filename);
})();

const manifestPath = join(zipRoot, 'manifest.json');
const secretsRequiredPath = join(zipRoot, 'secrets-required.json');

if (!existsSync(manifestPath)) {
  console.error(`Error: manifest.json not found at ${manifestPath}`);
  console.error('Run this script from inside the extracted zip or use --zip-dir');
  process.exit(1);
}

const manifest = loadJson(manifestPath);
const secretsRequired = existsSync(secretsRequiredPath)
  ? loadJson(secretsRequiredPath)
  : [];

console.log(`Importing agent: ${manifest.agentId}`);
console.log(`Format version: ${manifest.formatVersion}`);
console.log(`Exported at: ${manifest.exportedAt}`);

// ---------------------------------------------------------------------------
// Load secrets
// ---------------------------------------------------------------------------

let secrets = {};

if (secretsRequired.length > 0) {
  if (flags.secretsFile) {
    // Load from file
    try {
      secrets = loadJson(flags.secretsFile);
    } catch {
      console.error(`Error: Could not read secrets file: ${flags.secretsFile}`);
      process.exit(1);
    }
  } else if (process.stdin.isTTY) {
    // TTY prompt
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const prompt = (q) =>
      new Promise((res) => rl.question(q, res));

    console.log('\nSecrets required for this agent. Enter values (press Enter to skip):\n');
    for (const entry of secretsRequired) {
      const value = await prompt(`  ${entry.label} (${entry.jsonPath}) [${entry.kind}]: `);
      if (value.trim()) {
        secrets[entry.id] = value.trim();
      }
    }
    rl.close();
    console.log('');
  }
  // else: non-interactive, non-TTY — secrets remain empty (will use placeholders)
}

// ---------------------------------------------------------------------------
// Load config pieces from zip
// ---------------------------------------------------------------------------

function loadConfigFile(name) {
  const p = join(zipRoot, 'config', name);
  return existsSync(p) ? loadJson(p) : undefined;
}

const agentListEntry = loadConfigFile('agent-list-entry.json');
const agentsDefaults = loadConfigFile('agents-defaults.json');
const bindings = loadConfigFile('bindings.json');
const hooksMappings = loadConfigFile('hooks-mappings.json');
const mcp = loadConfigFile('mcp.json');
const skillsRoot = loadConfigFile('skills-root.json');
const toolsRoot = loadConfigFile('tools-root.json');
const models = loadConfigFile('models.json');

// ---------------------------------------------------------------------------
// Restore secrets into the agent config
// ---------------------------------------------------------------------------

function restoreSecretsInObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(restoreSecretsInObject);

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.startsWith('__OPENCLAW_IMPORT_REQUIRED__:')) {
      const id = value.replace('__OPENCLAW_IMPORT_REQUIRED__:', '');
      result[key] = secrets[id] ?? value; // keep placeholder if not provided
    } else if (typeof value === 'object') {
      result[key] = restoreSecretsInObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

const restoredAgent = restoreSecretsInObject(agentListEntry);

// ---------------------------------------------------------------------------
// Merge into openclaw.json
// ---------------------------------------------------------------------------

function backupConfig() {
  if (existsSync(CONFIG_PATH)) {
    const backup = CONFIG_PATH + `.import-backup-${Date.now()}.json`;
    cpSync(CONFIG_PATH, backup);
    console.log(`Backed up config to: ${backup}`);
  }
}

function mergeAgentsList(existing, newEntry) {
  const list = Array.isArray(existing) ? [...existing] : [];
  const idx = list.findIndex((a) => a.id === newEntry.id);
  if (idx >= 0) {
    if (!flags.force) {
      console.error(
        `Agent '${newEntry.id}' already exists. Use --force to overwrite.`
      );
      process.exit(1);
    }
    list[idx] = newEntry;
  } else {
    list.push(newEntry);
  }
  return list;
}

if (!flags.dryRun) {
  backupConfig();
}

let config = {};
if (existsSync(CONFIG_PATH)) {
  try {
    config = loadJson(CONFIG_PATH);
  } catch {
    console.error(`Warning: Could not parse existing config, starting fresh.`);
  }
}

// Merge agents.list
if (restoredAgent) {
  config.agents = config.agents ?? {};
  config.agents.list = mergeAgentsList(config.agents.list ?? [], restoredAgent);
}

// Merge agents.defaults (deep merge)
if (agentsDefaults) {
  config.agents = config.agents ?? {};
  config.agents.defaults = { ...(config.agents.defaults ?? {}), ...agentsDefaults };
}

// Merge bindings
if (bindings) {
  config.bindings = { ...(config.bindings ?? {}), ...bindings };
}

// Merge hooks.mappings
if (hooksMappings) {
  config.hooks = config.hooks ?? {};
  config.hooks.mappings = { ...(config.hooks.mappings ?? {}), ...hooksMappings };
}

// Merge mcp
if (mcp) {
  config.mcp = { ...(config.mcp ?? {}), ...mcp };
}

// Merge skills-root
if (skillsRoot) {
  config.skills = { ...(config.skills ?? {}), ...skillsRoot };
}

// Merge tools-root
if (toolsRoot) {
  config.tools = { ...(config.tools ?? {}), ...toolsRoot };
}

// Merge models
if (models) {
  config.models = { ...(config.models ?? {}), ...models };
}

// Write config
if (!flags.dryRun) {
  ensureDir(dirname(CONFIG_PATH));
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  console.log(`Updated: ${CONFIG_PATH}`);
} else {
  console.log('[dry-run] Would write config:');
  console.log(JSON.stringify(config, null, 2));
}

// ---------------------------------------------------------------------------
// Copy workspace and skill directories
// ---------------------------------------------------------------------------

async function copyDir(src, dest) {
  ensureDir(dest);
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      cpSync(srcPath, destPath);
    }
  }
}

const workspaceDest = join(STATE_DIR, 'agents', manifest.agentId, 'workspace');
const skillsDest = join(workspaceDest, 'skills');

// Copy workspace files (excluding skills subfolder — handled separately)
const workspaceSrc = join(zipRoot, 'workspace');
if (existsSync(workspaceSrc)) {
  if (!flags.dryRun) {
    ensureDir(workspaceDest);
    const entries = await readdir(workspaceSrc, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'skills') continue; // skip; handled below
      const srcPath = join(workspaceSrc, entry.name);
      const destPath = join(workspaceDest, entry.name);
      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath);
      } else {
        cpSync(srcPath, destPath);
      }
    }
    console.log(`Copied workspace files to: ${workspaceDest}`);
  } else {
    console.log(`[dry-run] Would copy workspace files to: ${workspaceDest}`);
  }
}

// Copy skill directories
const skillsSrcRoot = join(zipRoot, 'skills');
if (existsSync(skillsSrcRoot)) {
  const skillEntries = await readdir(skillsSrcRoot, { withFileTypes: true });
  for (const entry of skillEntries) {
    if (!entry.isDirectory()) continue;
    const srcPath = join(skillsSrcRoot, entry.name);
    const destPath = join(skillsDest, entry.name);
    if (!flags.dryRun) {
      await copyDir(srcPath, destPath);
      console.log(`Copied skill '${entry.name}' to: ${destPath}`);
    } else {
      console.log(`[dry-run] Would copy skill '${entry.name}' to: ${destPath}`);
    }
  }
}

// Copy agent-dir
const agentDirSrc = join(zipRoot, 'agent-dir');
if (existsSync(agentDirSrc)) {
  const agentDirDest = join(STATE_DIR, 'agents', manifest.agentId);
  if (!flags.dryRun) {
    await copyDir(agentDirSrc, agentDirDest);
    console.log(`Copied agent directory to: ${agentDirDest}`);
  } else {
    console.log(`[dry-run] Would copy agent directory to: ${agentDirDest}`);
  }
}

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------

if (flags.dryRun) {
  console.log('\n[dry-run] Dry run complete. No files were modified.');
} else {
  console.log(`\nImport complete for agent: ${manifest.agentId}`);
  if (Object.keys(secrets).length < secretsRequired.length) {
    console.log(
      `\nWarning: ${secretsRequired.length - Object.keys(secrets).length} secret(s) were not provided.`
    );
    console.log('Placeholders remain in the config. Edit openclaw.json to fill them in.');
  }
}
