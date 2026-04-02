#!/usr/bin/env bash
# init.sh — openclaw-gateway 项目初始化脚本
# 用法: bash init.sh
#
# 首次克隆后运行一次即可安装依赖。
# 后续请使用 pnpm dev / pnpm build 等命令。
#
# 本脚本需要 chmod +x 后方可执行：
#   chmod +x init.sh

set -euo pipefail

echo "==> openclaw-gateway 初始化"
echo ""

# 检测 pnpm
if ! command -v pnpm &>/dev/null; then
  echo "pnpm 未安装。"
  echo "  npm install -g pnpm"
  echo "  或参考 https://pnpm.io/installation"
  exit 1
fi

echo "==> 安装依赖 (pnpm install)..."
pnpm install

echo ""
echo "==> 安装完成。常用命令："
echo ""
echo "  pnpm dev          # 启动开发服务器 (端口 3005)"
echo "  pnpm build        # 构建生产版本"
echo "  pnpm start        # 启动生产服务器"
echo "  pnpm test         # 运行 Vitest 单元测试"
echo "  pnpm lint         # 运行 ESLint"
echo "  pnpm format:check # 检查 Prettier 格式"
echo "  pnpm test:e2e     # 运行 Playwright E2E 测试"
echo ""
echo "前提条件："
echo "  - Node.js 20+"
echo "  - OpenClaw 网关运行中 (默认端口 18789)"
echo "  - 可选：OPENCLAW_GATEWAY_URL 环境变量指定网关地址"
echo ""
