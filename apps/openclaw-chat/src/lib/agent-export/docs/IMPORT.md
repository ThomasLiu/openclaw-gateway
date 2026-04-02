# OpenClaw Agent Import Guide

## Quick Start

```bash
# Extract the export zip
unzip openclaw-agent-<agentId>-export.zip -d /tmp/my-agent-export
cd /tmp/my-agent-export

# Interactive import (will prompt for secrets)
node import.mjs

# Non-interactive import with secrets file
node import.mjs --secrets-file /path/to/secrets.json

# Force overwrite existing agent
node import.mjs --force

# Dry run (validate without writing)
node import.mjs --dry-run
```

## Secrets File Format

Create a `secrets.json` with the required secret IDs:

```json
{
  "apiKey": "your-actual-api-key",
  "minimax_token": "your-token-here"
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCLAW_CONFIG_PATH` | `~/.openclaw/openclaw.json` | Target config file |
| `OPENCLAW_STATE_DIR` | `~/.openclaw` | State directory for agent workspaces |

## Troubleshooting

### "Agent already exists"
Use `--force` to overwrite the existing agent with the same ID.

### "Could not read secrets file"
Ensure the secrets file is valid JSON and the path is correct.

### Missing secrets after import
Edit `~/.openclaw/openclaw.json` and replace `__OPENCLAW_IMPORT_REQUIRED__:<id>` placeholders with actual values.

### Skills not appearing
Skills are copied to `<workspace>/skills/<name>/`. Ensure the agent's workspace is correctly configured in `openclaw.json`.
