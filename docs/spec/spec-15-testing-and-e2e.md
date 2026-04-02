# Spec 15：测试策略（Vitest、Playwright、单测约定）

## Vitest

- **配置**：`apps/openclaw-chat` 内 vitest（见 `vitest.config` 或 `package.json` 的 vitest 配置）。
- **命令**：`pnpm --filter openclaw-chat test` 或包内 `vitest run`。
- **命名**：`*/*.spec.ts` / `*.test.ts` 与源码同目录或并列（以项目现有文件为准）。

## 覆盖重点模块（与业务一致）

| 模块 | 说明 |
| ---- | ---- |
| `lib/openclaw/gateway-history.test.ts` | 网关历史 → UI 消息 |
| `lib/openclaw/gateway-message-text.test.ts` | 正文提取 |
| `lib/chat-attachment.test.ts` | 附件解析 |
| `lib/session-unread.test.ts` | 未读 |
| `lib/pretext-composer-height.test.ts` | 高度 clamp 等纯函数 |
| `components/ChatMarkdown.test.tsx` | Markdown 渲染 |
| `config/openclaw-cli-actions.test.ts` | CLI 白名单 |

## Playwright E2E

- **目录**：`apps/openclaw-chat/e2e/`。
- **脚本**：`pnpm test:e2e`（根）或包内。
- **示例**：`e2e/chat-attachment-send.spec.ts` — 附件发送流程。
- **fixtures**：`e2e/fixtures/`。
- **Agent 导出 zip**：`e2e/agent-export.spec.ts` — 校验 `GET /api/agents/<id>/export`、zip 内 `manifest`/`config`/`skills`、`import.mjs` 非交互导入；`playwright.config.ts` 默认 **`next start` 于 3015**（`PLAYWRIGHT_E2E_PORT`），避免与本机 `next dev`（3005）冲突；详见 [spec-17-agent-export-zip.md](./spec-17-agent-export-zip.md)。

## 与 Cursor 工作流

- 工作流规则要求 **测试规划先于执行**、**lint/typecheck**、**敏感改动 build**；详见 `.cursor/rules/workflow-todo-gstack-verify.mdc`。

## 复刻检查清单

- [ ] CI 或本地至少能跑通 `vitest run` 与关键 E2E（需环境变量与网关时可能跳过并文档说明）。
- [ ] 新逻辑优先补**单测**而非仅 E2E（规则 2.2）。
