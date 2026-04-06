# openclaw-gateway

openClaw Chat Gateway — Web UI for OpenClaw Agent Gateway.

## 技术栈

- **框架**: Next.js 16 (App Router, Turbopack)
- **运行时**: Node.js 20+
- **包管理**: pnpm 10.x
- **测试**: Vitest (单元) + Playwright (E2E)
- **样式**: Tailwind CSS v4
- **网关协议**: WebSocket JSON-RPC → SSE/HTTP (浏览器边界模式)

## 快速开始

### 安装依赖

```bash
# 方式一：使用 init.sh（推荐首次克隆后运行一次）
chmod +x init.sh
./init.sh

# 方式二：手动
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

应用运行于 **http://localhost:3005**（端口由 `apps/openclaw-chat/package.json` 的 `-p 3005` 决定，README 中的 3000 仅供参考）。

### 前置条件

- **OpenClaw 网关**运行中（默认端口 `18789`）。
- 配置文件 `~/.openclaw/openclaw.json` 存在，或设置环境变量 `OPENCLAW_GATEWAY_URL`。

### 环境变量（可选）

| 变量 | 说明 |
| ---- | ---- |
| `OPENCLAW_GATEWAY_URL` | 网关 HTTP 地址（会替换 ws→http） |
| `OPENCLAW_TOKEN` | 网关认证 token |
| `OPENCLAW_PASSWORD` | 网关认证密码 |
| `OPENCLAW_WS_HANDSHAKE_TIMEOUT_MS` | WS 握手超时，默认 25000 |
| `OPENCLAW_POOL_CONNECT_TIMEOUT_MS` | 连接池超时，默认 28000 |
| `OPENCLAW_CLI_EXEC_DISABLED` | 设为 `1` 禁用 CLI 执行路由 |
| `OPENCLAW_CLI_PATH` | openclaw CLI 二进制路径，默认 `openclaw` |
| `DATABASE_PATH` | SQLite 数据库路径，默认 `./data/chat.sqlite` |
| `OPENCLAW_STATE_DIR` | Agent state 目录，默认 `~/.openclaw/agents` |
| `PLAYWRIGHT_E2E_PORT` | E2E 测试服务端口，默认 3015 |

## 常用命令

| 命令 | 说明 |
| ---- | ---- |
| `pnpm dev` | 启动开发服务器（端口 3005） |
| `pnpm build` | 构建生产版本 |
| `pnpm start` | 启动生产服务器 |
| `pnpm test` | 运行 Vitest 单元测试 |
| `pnpm test:e2e` | 运行 Playwright E2E 测试 |
| `pnpm lint` | ESLint 检查 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm pull:ai-reference-sources` | 拉取 OpenClaw 上游参考源码 |
| `pnpm openclaw:drift` | 检查上游变更与本地集成的差异 |

## 项目结构

```
openclaw-gateway/
  apps/
    openclaw-chat/          # Next.js Web 应用
      src/
        app/                # Next.js App Router (pages, API routes)
        components/         # React 组件
        lib/                # 工具函数、网关客户端、状态
        config/             # 白名单等配置
        e2e/                # Playwright E2E
  docs/spec/                # 功能规格（spec-01..17）
  scripts/                  # 构建与工具脚本
```

## 传输分层（不变量）

- **浏览器 → Next.js**: 仅 HTTP/SSE
- **Next.js (Node) → OpenClaw 网关**: WebSocket JSON-RPC


## ai-reference-sources

上游 OpenClaw 参考源码克隆至 `ai-reference-sources/`（`.gitignore` 中，不提交）。
运行 `pnpm pull:ai-reference-sources` 拉取，配合 `pnpm openclaw:drift` 检查 drift。

## Playwright E2E

```bash
# 构建生产版本（E2E 需要先 build）
pnpm build

# 运行 E2E（webServer 会在 3015 端口启动 next start）
pnpm test:e2e
```

E2E 默认使用端口 3015（避免与本机 `pnpm dev` 端口 3005 冲突）。
夹具配置位于 `e2e/fixtures/`。

## 贡献指南

- 测试规划先于执行、lint/typecheck。
- 新功能须在对应 `spec-*.md` 中记录。
- 新增 Vitest 单元测试（优先于仅 E2E）。
- 提交前运行 `pnpm lint` 和 `pnpm test`（`pnpm format` 如需）。

## 许可

与 OpenClaw 许可证一致。
