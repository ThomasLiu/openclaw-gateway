# Spec 13：`openclaw-integration.manifest.json` 与 drift

## 文件位置

- 仓库根：`openclaw-integration.manifest.json`。

## 结构（语义）

- **`upstreamRoot`**：字符串，指向本地参考目录，如 `ai-reference-sources/openclaw`。
- **`watch`**：数组，每项包含：
  - **`path`**：相对于 `upstreamRoot` 的上游文件路径。
  - **`integrates`**：本仓库应对照检查的文件路径列表（相对仓库根）。

## 用途

- 上游 OpenClaw 更新后，运行 **`pnpm openclaw:drift -- --range '<旧rev>..<新rev>'`**（或设置 `OPENCLAW_SRC`），脚本输出变更的上游文件及对应的 `integrates`，用于人工 review 本仓库集成点。

## 与文档/注释的关系

- **manifest + drift** 为主；代码内 `@see ai-reference-sources/openclaw/...` 为辅（避免依赖行号）。

## 详见

- `.cursor/skills/openclaw-upstream-drift/SKILL.md`（若存在）。

## 复刻检查清单

- [ ] 新增对上游文件的强依赖时，向 `watch` 追加一项并填 `integrates`。
- [ ] `upstreamRoot` 与本地 clone 路径一致。
