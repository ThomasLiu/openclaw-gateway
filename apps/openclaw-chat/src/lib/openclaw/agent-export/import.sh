#!/usr/bin/env bash
# =============================================================================
# import.sh - OpenClaw Agent 导入脚本（Bash wrapper）
# =============================================================================
#
# 用法：
#   ./import.sh [--force] [--secrets-file <path>] [zip-file]
#
# 选项：
#   --force             覆盖已存在的同名 Agent
#   --secrets-file <path>  包含密钥的 JSON 文件路径
#
# 示例：
#   ./import.sh --force openclaw-agent-myagent-export.zip
#   ./import.sh --secrets-file secrets.json openclaw-agent-myagent-export.zip
#
# 环境变量：
#   OPENCLAW_CONFIG_PATH  目标 openclaw.json 路径
#   OPENCLAW_STATE_DIR    OpenClaw state 目录
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 显示欢迎信息
echo "🔧 OpenClaw Agent 导入工具"
echo ""

# 检查 Node.js 版本
NODE_VERSION=$(node --version 2>/dev/null | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "❌ 需要 Node.js 18+，当前版本: $NODE_VERSION"
  exit 1
fi

# 检查 ZIP 文件
ZIP_FILE=""
FORCE_FLAG=""
SECRETS_FILE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --force)
      FORCE_FLAG="--force"
      shift
      ;;
    --secrets-file)
      SECRETS_FILE="--secrets-file $2"
      shift 2
      ;;
    -h|--help)
      echo "用法: $0 [选项] [zip-file]"
      echo ""
      echo "选项:"
      echo "  --force                  覆盖已存在的同名 Agent"
      echo "  --secrets-file <path>    包含密钥的 JSON 文件路径"
      echo "  -h, --help              显示帮助"
      echo ""
      echo "环境变量:"
      echo "  OPENCLAW_CONFIG_PATH     目标 openclaw.json 路径"
      echo "  OPENCLAW_STATE_DIR       OpenClaw state 目录"
      exit 0
      ;;
    *)
      if [ -z "$ZIP_FILE" ]; then
        ZIP_FILE="$1"
      fi
      shift
      ;;
  esac
done

# 尝试自动发现 ZIP 文件
if [ -z "$ZIP_FILE" ]; then
  ZIP_FILE=$(ls *.zip 2>/dev/null | grep "export.zip" | head -1 || true)
fi

if [ -z "$ZIP_FILE" ]; then
  echo "❌ 未找到 ZIP 文件。请提供 ZIP 文件路径。"
  echo ""
  echo "用法: $0 [选项] <zip-file>"
  exit 1
fi

if [ ! -f "$ZIP_FILE" ]; then
  echo "❌ 文件不存在: $ZIP_FILE"
  exit 1
fi

echo "📦 ZIP 文件: $ZIP_FILE"
echo ""

# 检查是否需要交互输入密钥
if [ -z "$SECRETS_FILE" ]; then
  if [ -t 0 ]; then
    echo "💡 可以使用 --secrets-file <path> 提供密钥文件"
    echo "   或直接回车跳过（密钥字段将保留为占位符）"
    echo ""
    read -p "提供密钥文件路径（或直接回车跳过）: " secrets_input
    if [ -n "$secrets_input" ]; then
      SECRETS_FILE="--secrets-file $secrets_input"
    fi
  fi
fi

# 运行 Node.js 导入脚本
echo "🚀 开始导入..."
echo ""

node "$SCRIPT_DIR/import.mjs" $FORCE_FLAG $SECRETS_FILE "$ZIP_FILE"
