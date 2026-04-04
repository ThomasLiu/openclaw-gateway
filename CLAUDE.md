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
