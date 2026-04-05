# openclaw-gateway

## gstack

gstack 是 headless 浏览器工具，用于 QA 测试和网站 dogfooding。

### 网络浏览

**所有网络浏览必须使用 `/browse` skill**，禁止使用 `mcp__claude-in-chrome__*` 工具。

### 可用技能

/office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /design-shotgun, /design-html, /review, /ship, /land-and-deploy, /canary, /benchmark, /browse, /connect-chrome, /qa, /qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /retro, /investigate, /document-release, /codex, /cso, /autoplan, /plan-devex-review, /devex-review, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade, /learn

### 故障排除

如果 gstack 技能无法正常工作，运行以下命令来编译二进制文件并注册技能：

```bash
cd .claude/skills/gstack && ./setup
```

---

## 需求与改动记录

### 产品说明文档

产品说明文档位于 [docs/product-spec.md](docs/product-spec.md)，包含完整的功能地图、API 路由总表、环境变量说明。

**文档同步规则**：文档描述必须与代码行为一致。如果代码与文档不符，以代码为准，修复文档。

### doc-sync 工作流

**在每次任务结束前，必须运行 doc-sync subagent 同步文档**：

1. 读取本次变更的文件
2. 分析变更类型（API 路由/UI 组件/工具库/配置）
3. 更新 `docs/product-spec.md` 中对应的章节
4. 提交文档更新

doc-sync prompt 模板：`docs/prompts/doc-sync-prompt.md`


