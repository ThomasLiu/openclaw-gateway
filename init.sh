#!/usr/bin/env bash
# =============================================================================
# openclaw-gateway init.sh
# =============================================================================
# Installs dependencies and starts the development server.
# Run once after clone: chmod +x init.sh && ./init.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> openclaw-gateway: installing dependencies..."
cd "$SCRIPT_DIR"
pnpm install

echo ""
echo "==> openclaw-gateway: dependencies installed."
echo ""
echo "    To start the dev server:"
echo "    $ pnpm dev"
echo ""
echo "    Application will be available at http://localhost:3005"
echo "    Make sure OpenClaw gateway is running on port 18789 (or set OPENCLAW_GATEWAY_URL)."
