# Spec 14：AI 参考源码与脚本

## `ai-reference-sources/`（gitignore）

- 本地克隆的 OpenClaw 等上游源码，**不提交**。
- **优先**从此目录读协议与行为，而非官网（见工作流规则）。

## Manifest

- **`ai-reference-sources.manifest.json`**（仓库内）：记录子仓库 git URL、路径等，供 `pnpm pull:ai-reference-sources` 使用。
- **`scripts/pull-ai-reference-sources.mjs`**：clone 或 pull。
- **`scripts/generate-ai-reference-sources-manifest.mjs`**：生成/更新 manifest。
- **`.githooks/`**：可选 pre-commit 刷新 manifest（若启用 `git config core.hooksPath .githooks`）。

## 根 `dev` 脚本

- **`scripts/dev-with-reference-pull.mjs`**：后台异步拉参考源码，前台启动 `openclaw-chat` dev（不阻塞）。

## OpenClaw drift

- **`scripts/openclaw-drift.mjs`**：配合 `openclaw-integration.manifest.json`（见 spec-13）。

## 复刻检查清单

- [ ] 新环境可运行 `pnpm pull:ai-reference-sources` 拉取参考（需网络与 manifest 配置）。
- [ ] 文档/规则中说明 `ai-reference-sources` 在 `.gitignore` 中，IDE 可能不索引。
