#!/bin/bash
#
# openclaw-gateway 自主开发脚本
# 使用 claude-autonomous-coding 自动完成所有 spec 的开发
#

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
AUTONOMOUS_CODING_DIR="$PROJECT_DIR/ai-reference-sources/claude-autonomous-coding"

# 加载环境变量
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

# 设置默认值（如果 .env 中未定义）
PROJECT_DIR="${AUTONOMOUS_CODING_PROJECT_DIR:-$PROJECT_DIR}"
PROMPTS_DIR="${AUTONOMOUS_CODING_PROMPTS_DIR:-$PROJECT_DIR/docs/prompts}"
INITIALIZER_PROMPT="${AUTONOMOUS_CODING_INITIALIZER_PROMPT:-$PROMPTS_DIR/initializer_prompt.md}"
CODING_PROMPT="${AUTONOMOUS_CODING_CODING_PROMPT:-$PROMPTS_DIR/coding_prompt.md}"
APP_SPEC="${AUTONOMOUS_CODING_APP_SPEC:-$PROJECT_DIR/docs/spec/app_spec.md}"

# 确保 autonomous-coding 已构建
if [ ! -d "$AUTONOMOUS_CODING_DIR/dist" ]; then
  echo "正在构建 claude-autonomous-coding..."
  cd "$AUTONOMOUS_CODING_DIR"
  bun install
  bun run build
  cd "$PROJECT_DIR"
fi

echo "=========================================="
echo "openclaw-gateway 自主开发"
echo "=========================================="
echo "项目目录: $PROJECT_DIR"
echo "提示词目录: $PROMPTS_DIR"
echo "初始化提示词: $INITIALIZER_PROMPT"
echo "编码提示词: $CODING_PROMPT"
echo "应用规格: $APP_SPEC"
echo "模型: ${ANTHROPIC_MODEL:-MiniMax-M2.7}"

# 检查是否启用了 verbose 模式
if echo "$@" | grep -q "verbose"; then
  echo "详细日志: 开启 (-v/--verbose)"
else
  echo "详细日志: 关闭 (使用 -v/--verbose 开启)"
fi
echo "=========================================="
echo ""

cd "$PROJECT_DIR"

# 运行 autonomous-coding
# --max-iterations 不设置则无限运行直到所有 feature 完成
node "$AUTONOMOUS_CODING_DIR/dist/index.js" \
  --project-dir "$PROJECT_DIR" \
  --model "${ANTHROPIC_MODEL:-MiniMax-M2.7}" \
  --prompts-dir "$PROMPTS_DIR" \
  --initializer-prompt "$INITIALIZER_PROMPT" \
  --coding-prompt "$CODING_PROMPT" \
  --app-spec "$APP_SPEC" \
  "$@"
