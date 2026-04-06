# openclaw-gateway

## 执行标准

请严格、完整、细致地执行任务，禁止简化、省略、敷衍、偷懒。必须按照最优、最专业、最全面的方案完成，而不是最小工作量方案。步骤要完整，逻辑要严谨，细节要充足，不要只给简略结论。如果有多种可能，请给出最优方案并说明理由。确保内容专业、完整、可直接落地使用。

请完整实现全部逻辑，不要省略任何关键步骤，不要用伪代码、不要用占位符，不要只写框架。输出可直接运行 / 直接使用的完整内容，遵循最优实践，考虑边界情况。

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

doc-sync subagent：`.claude/agents/doc-sync/SUBAGENT.md`

---

## Design System (设计系统 v2.0)

### 概述

openClaw Chat Gateway 采用**现代化聊天应用风格**,使用**紫色为主色调**的双主题系统(白天/黑夜模式)。

**设计方向**: Modern Clean - 现代简洁  
**主色调**: 紫色 (#8B5CF6 light / #A78BFA dark) - 类似 ChatGPT 品牌风格  
**深色模式**: 蓝黑色系 (#0F172A) - 非纯黑,更护眼

### 主题切换机制

- **CSS 变量系统**: 所有颜色通过 `--oc-*` CSS 自定义属性定义
- **主题属性**: `<html data-theme="light|dark">`
- **持久化**: localStorage key = `oc-theme`
- **自动检测**: 首次访问时检测系统偏好 (`prefers-color-scheme`)
- **切换入口**: 顶部工具栏右侧的 ☀️/🌙 按钮
- **React Hook**: `useTheme()` from `@/lib/theme`

### 配色规范

#### LIGHT THEME (白天模式)

```css
/* 核心背景 */
--oc-bg: #FFFFFF;              /* 纯白背景 */
--oc-surface: #F9FAFB;         /* 表面/卡片背景 */
--oc-surface-2: #F3F4F6;       /* 次级表面 */
--oc-surface-3: #E5E7EB;       /* 三级表面 */

/* 边框 */
--oc-border: #E5E7EB;
--oc-border-hover: #D1D5DB;

/* 文本 */
--oc-text: #111827;            /* 主文本 - 近黑 */
--oc-text-muted: #6B7280;      /* 次要文本 - 中灰 */
--oc-text-subtle: #9CA3AF;    /* 弱化文本 */

/* 主色调 - 紫色 */
--oc-accent: #8B5CF6;          /* 主强调色 */
--oc-accent-hover: #7C3AED;    /* 悬停态 */
--oc-accent-muted: #EDE9FE;    /* 弱化强调背景 */
--oc-accent-subtle: #F5F3FF;   /* 微妙强调背景 */

/* 消息气泡 */
--oc-user-msg-bg: #8B5CF6;     /* 用户消息 - 紫色背景 + 白字 */
--oc-user-msg-text: #FFFFFF;
--oc-asst-msg-bg: #F9FAFB;     /* 助手消息 - 浅灰背景 */
--oc-asst-msg-border: #E5E7EB;

/* 语义颜色 */
--oc-success: #10B981;          /* 成功 - 绿色 */
--oc-success-muted: #D1FAE5;
--oc-warning: #F59E0B;          /* 警告 - 黄色 */
--oc-warning-muted: #FEF3C7;
--oc-error: #EF4444;            /* 错误 - 红色 */
--oc-error-muted: #FEE2E2;
--oc-info: #6366F1;             /* 信息 - 靛蓝 */
--oc-info-muted: #EEF2FF;

/* 特殊颜色 */
--oc-tool: #F97316;             /* 工具卡 - 橙色 */
--oc-thinking: #F59E0B;         /* 思考块 - 黄色 */
--oc-link: #8B5CF6;             /* 链接 - 紫色 */
--oc-code-bg: #F3F4F6;         /* 代码块背景 */
```

#### DARK THEME (黑夜模式)

```css
/* 核心背景 - 蓝黑色系 (非纯黑!) */
--oc-bg: #0F172A;              /* 深蓝黑背景 */
--oc-surface: #1E293B;         /* 表面 */
--oc-surface-2: #334155;       /* 次级表面 */
--oc-surface-3: #475569;       /* 三级表面 */

/* 边框 */
--oc-border: #334155;
--oc-border-hover: #475569;

/* 文本 */
--oc-text: #F1F5F9;            /* 主文本 - 近白 */
--oc-text-muted: #94A3B8;      /* 次要文本 - 浅灰 */
--oc-text-subtle: #64748B;    /* 弱化文本 */

/* 主色调 - 亮紫色 (适配深色背景) */
--oc-accent: #A78BFA;          /* 更亮的紫色 */
--oc-accent-hover: #8B5CF6;
--oc-accent-muted: #312E81;
--oc-accent-subtle: #1E1B4B;

/* 消息气泡 */
--oc-user-msg-bg: #7C3AED;     /* 用户消息 - 深紫背景 */
--oc-asst-msg-bg: #1E293B;     /* 助手消息 */

/* 语义颜色 - 更亮以适应深色背景 */
--oc-success: #34D399;
--oc-warning: #FBBF24;
--oc-error: #F87171;
--oc-info: #818CF8;
--oc-tool: #FB923C;
```

### 设计令牌

```css
/* 圆角 */
--oc-radius-sm: 6px;
--oc-radius-md: 8px;
--oc-radius-lg: 12px;
--oc-radius-xl: 16px;

/* 间距 */
--oc-space-xs: 4px;
--oc-space-sm: 8px;
--oc-space-md: 12px;
--oc-space-lg: 16px;
--oc-space-xl: 24px;
--oc-space-2xl: 32px;

/* 过渡动画 */
--oc-transition-fast: 150ms ease;
--oc-transition-normal: 200ms ease;
--oc-transition-slow: 300ms ease;

/* 阴影 */
--oc-shadow-sm: 0 1px 2px rgba(0,0,0,0.05);  /* light */
--oc-shadow-md: 0 4px 6px rgba(0,0,0,0.1);
--oc-shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
```

### 使用规范

1. **必须使用 CSS 变量**: 禁止硬编码颜色值,所有样式必须使用 `var(--oc-*)` 变量
2. **组件样式位置**: 全局样式在 `globals.css`,组件特定样式可使用内联 style 或 CSS Modules
3. **新组件开发**: 必须同时适配 light/dark 双主题,使用 `useTheme()` hook 获取当前主题
4. **测试要求**: 切换主题时所有组件必须正确响应,无颜色残留或对比度问题
5. **可访问性**: 文本对比度需符合 WCAG AA 标准 (≥4.5:1 for normal text)

### 关键文件

- **设计变量定义**: [globals.css](apps/openclaw-chat/src/app/globals.css)
- **Theme Provider**: [theme.tsx](apps/openclaw-chat/src/lib/theme.tsx)
- **工具栏(含切换按钮)**: [SessionToolbar.tsx](apps/openclaw-chat/src/components/SessionToolbar.tsx)
- **设计预览页面**: [openclaw-design-preview.html](openclaw-design-preview.html)

### 设计决策记录

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-04-06 | 采用紫色主调 | 用户选择,类似 ChatGPT 品牌风格,现代感强 |
| 2026-04-06 | 深色模式用蓝黑色 | 区别于纯黑,更护眼,有深度感 |
| 2026-04-06 | CSS 变量双主题系统 | 支持未来扩展更多主题,易于维护 |
| 2026-04-06 | 工具栏右侧添加切换按钮 | 符合用户习惯,易于发现和使用 |

### 违规检查清单 (QA Mode)

在 QA 模式下,如果发现以下问题需要标记:

- [ ] 存在硬编码的颜色值 (如 `#fff`, `rgb(...)`, `red` 等)
- [ ] 组件未正确响应主题切换
- [ ] 文本对比度不足 (可读性差)
- [ ] 使用了已废弃的旧变量名 (`--color-oc-*`)
- [ ] 新增组件未使用 `var(--oc-*)` 变量系统


