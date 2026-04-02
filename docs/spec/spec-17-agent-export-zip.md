# Spec 17：Agent 配置导出 Zip（A→B 可导入）

## 目的

将**单个** OpenClaw Agent 的「行为相关」配置与磁盘目录打成 zip，供在另一台机器上合并配置并复制 workspace / agent 私有目录 / 技能实体；敏感字段不落明文，由 `secrets-required.json` + 占位符驱动 B 机导入向导或非交互 `--secrets-file`。

## 上游语义（OpenClaw）

- **Agent 列表合并**：`mergeObjectArraysById`（本仓库 `lib/openclaw/agent-export/merge-object-arrays-by-id.ts`）与上游 `ai-reference-sources/openclaw/src/config/merge-patch.ts` 的 `agents.list` 同 id 合并语义一致。
- **路径**：`resolveAgentWorkspaceDir`、`resolveAgentDir`、`resolveOpenClawStateDir` — `apps/openclaw-chat/src/lib/openclaw/workspace-path.ts`；与上游 `ai-reference-sources/openclaw/src/agents/agent-scope.ts` 对齐意图（state 目录受 `OPENCLAW_STATE_DIR` 等影响）。
- **技能目录枚举**：`listEffectiveSkillDirsForExport`（`lib/openclaw/agent-export/enumerate-effective-skills-for-export.ts`）按上游 `loadSkillEntries` 的层合并顺序（extra → bundled → managed → `~/.agents/skills` → `<workspace>/.agents/skills` → `<workspace>/skills`），再按 `agents.list[].skills` 白名单过滤（**省略**=全部；**空数组**=不导出任何技能目录；与运行时一致）。`OPENCLAW_BUNDLED_SKILLS_DIR` 可指向 bundled 根。插件包内 skills 未展开。
- **Workspace 技能目录**：`<workspace>/skills/<name>/` — 与上游 `ai-reference-sources/openclaw/src/agents/skills/workspace.ts` 中 `workspaceSkillsDir` 约定一致。

## HTTP API

| 项 | 说明 |
| --- | --- |
| **路径** | `GET /api/agents/[agentId]/export` |
| **实现** | `apps/openclaw-chat/src/app/api/agents/[agentId]/export/route.ts` |
| **运行时** | `export const runtime = "nodejs"` |
| **agentId** | URL 段经 `decodeURIComponent` + `normalizeAgentId` |
| **成功** | `200`，`Content-Type: application/zip`，`Content-Disposition: attachment; filename="openclaw-agent-<id>-export.zip"`，`Cache-Control: no-store` |
| **失败** | `404` JSON `{ error: string }` — 未找到 `OPENCLAW_CONFIG_PATH` 指向的配置、或 `agents.list` 中无该 id |

**配置来源**：`loadOpenClawJsonObject()`（`lib/openclaw/agent-export/load-openclaw-json.ts`）— 当前为 **JSON** 解析；非 JSON5 的说明见 zip 内 `docs/`。

## Zip 内容约定

| 路径 | 说明 |
| --- | --- |
| `manifest.json` | `formatVersion`、`agentId`、`exportedAt`、`workspaceStrategy`（当前为 `exclude-skills-subfolder`）、`exportedSkills`（skill 名 → 来源：`openclaw-extra` / `openclaw-bundled` / `openclaw-managed` / `agents-skills-personal` / `agents-skills-project` / `openclaw-workspace`）、`pluginPackagedSkillsIncluded`（当前为 `false`） |
| `secrets-required.json` | `SecretRequiredEntry[]`：`id`、`jsonPath`、`label`、`kind`、`required`；与配置内占位符 `__OPENCLAW_IMPORT_REQUIRED__:<id>` 对应 |
| `config/agent-list-entry.json` | 该 agent 的 `agents.list` 单条（已脱敏） |
| `config/agents-defaults.json` | `agents.defaults` 切片 |
| `config/bindings.json` | 按 `agentId` 过滤的 `bindings` |
| `config/hooks-mappings.json` | 按 `agentId` 过滤的 `hooks.mappings` |
| `config/mcp.json` | 全局 `mcp` 块（已脱敏） |
| `config/skills-root.json` | 根级 `skills` 配置 |
| `config/tools-root.json` | 根级 `tools` 配置 |
| `config/models.json` | `models` 块（已脱敏） |
| `workspace/` | `resolveAgentWorkspaceDir` 下**除** `skills/` 子目录外的树（避免与独立 `skills/<name>` 重复） |
| `skills/<name>/` | 该 agent **白名单过滤后**的 workspace 技能目录整树（`SKILL.md` 等） |
| `agent-dir/` | `resolveAgentDir` 目录树 |
| `import.mjs`、`import.sh` | B 机合并配置、复制目录、写回密钥占位符；模板源 `lib/openclaw/agent-export/import-script.mjs`、`import.sh` |
| `docs/*.md` | 导入说明文档库（与 `lib/openclaw/agent-export/docs/` 同步打包） |

**脱敏**：`redactSecretsForExport`（`redact-secrets-for-export.ts`）深度遍历，典型键如 `apiKey`、`token`、`password` 等。

## UI

- **组件**：`apps/openclaw-chat/src/components/AgentSidebar.tsx`
- **交互**：每条 agent 行 hover 显示「导出」按钮（`stopPropagation`），`fetch(/api/agents/${id}/export)` → Blob → 触发下载；非 2xx 时 `alert` 简短错误。

## 导入脚本（zip 内 `import.mjs`）

- **入口**：Node 18+，`node import.mjs` 或 `./import.sh`。
- **常用参数**：`--force`（覆盖已存在同 id agent 等）、`--secrets-file <path>`（JSON：`id` → 明文值，供非交互/CI）。
- **TTY**：未传 `--secrets-file` 且 stdin/stdout 为 TTY 时，按 `secrets-required.json` **逐项提示**输入密钥（可回车跳过单条）。
- **环境**：`OPENCLAW_CONFIG_PATH`、`OPENCLAW_STATE_DIR` / `HOME` 决定目标 `openclaw.json` 与 state；合并前备份原配置。
- **磁盘**：将 `skills/<name>/` 复制到 **`resolveAgentWorkspaceDir`（导入后）下的 `skills/<name>/`**。

详细步骤与故障排查以 zip 内 `docs/` 为准。

## 测试

### Vitest

- `lib/openclaw/agent-export/merge-object-arrays-by-id.test.ts`
- `lib/openclaw/agent-export/redact-secrets-for-export.test.ts`

### Playwright（`e2e/agent-export.spec.ts`）

- **夹具**：`e2e/prepare-agent-export-fixture.mjs` 生成临时配置；`e2e/fixtures/agent-export/openclaw.json`。
- **Playwright 环境**：`playwright.config.ts` 为 webServer 设置 `OPENCLAW_CONFIG_PATH` 指向上述夹具。
- **Web 服务**：默认 **`next start -p 3015`**（`PLAYWRIGHT_E2E_PORT` 可覆盖），避免与本机 `pnpm dev`（3005）触发 Next「同目录仅允许一个 `next dev`」锁；先 `pnpm build` 再 start。
- **场景**：`GET` 导出 zip 结构断言；解压后 `node import.mjs --force --secrets-file` 非交互导入并断言合并后的配置与 `workspace/skills/`。

## 复刻检查清单

- [ ] 导出 API 与 zip 路径与上表一致；404 条件与实现一致。
- [ ] 导入后技能落在目标 workspace 的 `skills/<name>/`。
- [ ] `pnpm --filter openclaw-chat test:e2e e2e/agent-export.spec.ts` 在可写临时目录与网络允许时通过。
