# Spec 01：Monorepo、构建与工具链

## 功能概述

仓库 **openclaw-gateway** 为 **pnpm workspace** 单包应用结构：根目录仅负责 **workspace 脚本聚合**，实际 Web 应用位于 `apps/openclaw-chat`（Next.js App Router）。

## 目录结构（须复刻）

```
openclaw-gateway/
  package.json              # 根脚本：dev、build、lint、test、openclaw:drift 等
  pnpm-workspace.yaml       # packages: apps/*
  apps/
    openclaw-chat/          # 唯一主要应用
      package.json
      next.config.ts
      src/app/              # 路由与 API Routes
      src/components/
      src/lib/
      src/config/
      e2e/                  # Playwright
```

## 根 `package.json` 脚本（语义）

| 脚本 | 行为 |
| ---- | ---- |
| `dev` | 执行 `scripts/dev-with-reference-pull.mjs`：后台异步 `pull-ai-reference-sources.mjs`，前台 `pnpm --filter openclaw-chat dev` |
| `build` | `pnpm --filter openclaw-chat build` |
| `start` | `pnpm --filter openclaw-chat start` |
| `lint` | `pnpm --filter openclaw-chat lint` |
| `test` | `pnpm --filter openclaw-chat test`（Vitest） |
| `test:e2e` | `pnpm --filter openclaw-chat test:e2e` |
| `pull:ai-reference-sources` | 拉取/更新本地参考源码 |
| `generate:ai-reference-manifest` | 生成 `ai-reference-sources.manifest.json` |
| `openclaw:drift` | `scripts/openclaw-drift.mjs` 上游差异 |

**包管理器**：`pnpm@10.22.0`（见根 `package.json` 的 `packageManager`）。

## `apps/openclaw-chat/package.json` 关键脚本

| 脚本 | 命令要点 |
| ---- | -------- |
| `dev` | `next dev --turbopack -p 3005` |
| `build` | `next build` |
| `start` | `next start -p 3005` |
| `lint` | `eslint` |
| `typecheck` | `tsc --noEmit` |
| `test` | `vitest run` |
| `test:e2e` | `playwright test` |

## 核心依赖（应用）

- **框架**：`next` 16.x、`react` / `react-dom` 19.x
- **网关**：`ws`（服务端 WebSocket 客户端）
- **本地存储**：`better-sqlite3` + `@types/better-sqlite3`
- **Markdown**：`react-markdown`、`remark-gfm`
- **JSON 视图**：`@uiw/react-json-view`
- **输入测高**：`@chenglou/pretext`
- **图标**：`lucide-react`
- **服务端标记**：`server-only`

## `next.config.ts` 约定

- `serverExternalPackages: ["better-sqlite3"]` — 避免打包进 bundle。
- `turbopack.root` 指向 monorepo 根（与 `pnpm-workspace.yaml` 同级），保证 Turbopack 在 workspace 下解析一致。
- `allowedDevOrigins` 含 `127.0.0.1`、`localhost`。

## Node 与运行环境

- 要求 **Node.js 20+**（README 约定）。
- 生产/开发均依赖本机可连的 **OpenClaw 网关**（默认端口常来自 `~/.openclaw/openclaw.json` 的 `gateway.port`，默认 `18789`）。

## 与 README 的差异说明

根 `README.md` 可能写「浏览器访问 `http://localhost:3000`」；**以 `apps/openclaw-chat` 脚本为准为端口 3005**。复刻时以 `package.json` 的 `-p` 为准。

## 复刻检查清单

- [ ] 根目录仅 `apps/*` workspace，无多余 packages。
- [ ] `pnpm dev` 能启动 `openclaw-chat` 且端口与 `package.json` 一致。
- [ ] `next.config` 含 `better-sqlite3` external 与 turbopack root。
- [ ] ESLint / TypeScript 脚本在应用包内可执行。
