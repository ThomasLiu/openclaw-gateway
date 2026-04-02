# Spec 08：ChatPanel、Composer 与 Pretext 测高

## ChatPanel（`components/ChatPanel.tsx`）

- 承载 **消息列表**（`ChatMessageList`）、**会话头**（`ChatConversationHeader`）、**底部输入区**（textarea + 发送/中止）。
- **模型选择**（网关可用时）：`ComposerModelSelect`（`components/ComposerModelSelect.tsx`），列表来自 `GET /api/openclaw/models`（网关 `models.list`，与 OpenClaw 控制面一致）。下拉面板 **`createPortal` 挂到 `document.body`**、`position:fixed` + 锚点 `getBoundingClientRect`，避免被输入区外层 `overflow-hidden` 裁剪。切换会话模型时 `POST /api/gateway/sessions/patch`（`{ key, model }`，`model` 为 `provider/id` 或 `null` 清除覆盖），与上游 `sessions.patch` 一致（见 spec-04）。  
  **解析顺序**（`lib/session-composer-model.ts`）：① 本会话 `localStorage` 缓存（`openclaw-chat.sessionComposerModel.v1`）；② 当前消息列表中最后一条助手 `meta.model`（映射到目录 `provider/id`）；③ `sessions.list` 当前行的 `model` / `modelProvider`；④ `config.get` 快照中的 Agent 生效主模型 → 全局 `agents.defaults.model`；⑤ 目录首项兜底。  
  **配置解析**：`lib/agent-default-model-from-config.ts`（Agent 显式 `model` → `agents.defaults.model`）与 `lib/openclaw/default-model-from-config.ts`（全局默认）。
- **附件**：`ChatAttachment` 类型与 `chatAttachmentsToApi`（`lib/chat-attachment.ts`）；粘贴/选择文件流程以源码为准。
- **发送**：`fetch` `POST /api/chat` 并 **ReadableStream** 或 SSE 解析（与 `chat-stream-assistant.ts` 合并）。
- **中止**：`POST /api/chat/abort` 与/或 SSE 断开（与 spec-03 一致）。
- **Composer 草稿**：`composer-draft-storage.ts`（按 agent/session 维度持久化，具体 key 以源码为准）。
- **发送历史**：`composer-send-history.ts`（若需上/下箭头召回）。
- **`/` 斜杠命令补全**（对齐 OpenClaw 控制 UI）  
  - **上游参考**：`ai-reference-sources/openclaw/ui/src/ui/chat/slash-commands.ts`（`SLASH_COMMANDS`、`getSlashCommandCompletions`、`parseSlashCommand`）；命令源为 `buildBuiltinChatCommands()`（`ai-reference-sources/openclaw/src/auto-reply/commands-registry.shared.ts`）。  
  - **本仓库实现**：`lib/slash-commands/composer-slash-registry.ts`（与上游同构）；`buildBuiltinChatCommands` 以 **vendored** 形式置于 `lib/slash-commands/build-builtin-chat-commands.ts` + `registry-types.ts` + `commands-args.ts`（`/think` 的 level 选项在 Web 端用**静态**列表，避免依赖上游 `thinking` 插件链）。  
  - **触发与解析**：`lib/slash-commands/composer-trigger-parse.ts` 的 `computeComposerMenuState(text, caret, dynamicCtx?)`：在**当前行、光标前**识别 `(?:^|\\s)(/\\S*)$`（命令列表）与 `/cmd …` 参数补全（与上游 `updateSlashMenu` 的 `^/(\S+)\\s(.*)$` 语义一致，但支持句内输入）。**首参过滤**仅对**第一个 token** 做 `startsWith`（便于 `/steer target 后续消息`）。**在 `/skill ` 之后、且首段名称内无空格时**，进入 `slash-skill-name` 状态，与 `@` 共用 `skills.status` 列表与筛选，插入时**仅替换名称片段**（不重复 `/skill`）。  
  - **动态首参补全**（`lib/slash-commands/composer-dynamic-args.ts` + `ChatApp` 传入 `slashComposerDynamicContext`）：在注册表静态 `argOptions` 之外，合并 **`/focus`**（Agent id + 当前 Agent 下会话 key）、**`/kill`** / **`/steer`**（同上 + `all`）、**`/model`**（`models.list` 的 `provider/id`）。列表上限约 300 条。  
  - **多参数分位补全**：`lib/slash-commands/slash-arg-cursor.ts` 的 `parseSlashArgCursor(..., lineWideSingleArg)`：`composer-slash-registry.ts` 的 **`builtinSingleArgSlashLineWide`** 对「内置仅 1 个参数」的命令为 true（如 `/focus`、`/model`、`/kill`），此时 **`insertKind: line`**，从行首到光标整段替换，避免 `/focus ma 后续消息` 被误判为多词参数。多参数命令为 **`insertKind: token`**，按词替换。`getBuiltinArgStaticChoices(slashName, argIndex)` 读 `args[argIndex].choices`。第二参数起 **`/subagents`**、**`/acp`** 等对 target 合并与 `/focus` 相同的 Agent id + 会话 key。`computeComposerMenuState` 将 `insertKind` 映射为 **`slashArgInsertKind`**；**`ChatPanel`** 的 **`selectSlashArg`**：`line` 时插入 **`/cmd arg `** 覆盖 `replaceFrom..replaceTo`，`token` 时只插入选中词 + 空格。  
  - **UI**：`components/ComposerTriggerMenu.tsx`：**左侧为列表、右侧为说明**（主从布局）；**左侧列表列宽固定**（约 `22rem`），右侧 `flex-1` 展示长文案。右侧「详细说明」优先使用 `lib/slash-commands/slash-command-detail-docs.zh.ts`（对齐 OpenClaw `commands-registry` / 网关行为，含参数与示例）；无长文条目时回退 `slash-command-i18n.zh.ts` 短描述。含 `argOptions` 或上述动态合并的二级列表（如 `/tools compact|verbose`、`/focus` 目标）在右侧附加【当前选项】与选项级说明（`getSlashArgOptionDetailMarkdown`）。`Tab`/`Enter` 补全。**注意**：下拉在输入框**上方**（`bottom-full`），**表单**外层须 **`overflow-visible`**，否则菜单被裁切；**菜单弹层内部**为 `max-h` + 双列 flex，左侧列表需在整条 flex 链上设 `min-h-0` / `overflow-hidden`，列表区域 `flex-1 overflow-y-auto`，否则长列表无法滚动。  
- **`@` 技能补全**（OpenClaw 官方聊天 UI **无** `@` 菜单；本应用按网关能力补充）  
  - **数据**：`GET /api/openclaw/skills/status?agentId=`（代理 `skills.status`），与右侧面板 `SkillsTabContent` 同源。  
  - **插入文本**：选中项写入 **`/skill <name> `**（与内置 `/skill` 命令一致，便于模型侧识别）。  
  - **交互**：`(?:^|\\s)(@\\S*)$` 触发；与同一行内较晚出现的 `/` 相比，以**更靠近光标**的片段为准。输入 **`/skill `** 后的名称段与 `@` 共用同一套列表与右侧技能 `description` 预览。  
  - **技能说明译中文**：原文仍来自 `skills.status`；若判定为英文为主（`lib/skill-description-locale.ts` 的 `isLikelyChineseText`），则 `POST /api/openclaw/skill-description-translate` 服务端代理翻译，在 Composer 技能菜单右侧「说明」下方展示 **「中文（自动翻译）」** 区块。逻辑封装在 **`lib/use-skill-description-zh.ts`**（模块级 `Map` 缓存 + 防抖），与右侧面板 **Skill** 标签（`components/right-panel/SkillsTabContent.tsx` 工作区技能悬停浮层、常用推荐摘要）共用同一 API 与缓存。默认走 **MyMemory** 匿名接口（有日配额）；可设 **`LIBRETRANSLATE_URL`**（及可选 **`LIBRETRANSLATE_API_KEY`**）优先走 LibreTranslate；**`SKILL_DESCRIPTION_TRANSLATE=0`** 关闭翻译。

## Pretext 测高（禁止同步 layout thrash）

**目的**：避免每次 `draft` 变化用 `scrollHeight` 强制同步布局。

| 文件 | 职责 |
| ---- | ---- |
| `lib/pretext-composer-height.ts` | `prepare`/`layout`、clamp min/max |
| `components/use-composer-textarea-height.ts` | `ResizeObserver` + `getComputedStyle`（宽度、font、line-height、padding） |
| `ChatPanel.tsx` | `style={{ height }}` 绑定 textarea |

**约定**（与 `.cursor/rules/openclaw-chat-pretext-composer.mdc` 一致）：

- `prepare(..., { whiteSpace: 'pre-wrap' })`。
- 内容区宽度 = `clientWidth - paddingLeft - paddingRight`。
- 字体来自 `getComputedStyle(textarea).font`。
- 高度范围与 Tailwind class 一致（如 `min-h-[44px]`、`max-h-[200px]`）。
- Vitest 下不测 `prepare`/`layout` 全链路，只测纯函数（如 `parseCssPx`、`clampComposerTotalHeightPx`）。

## 其它 UI 细节

- **StreamingWaveBar**：流式时指示器。
- **useComposerTextareaHeight**：依赖 textarea ref 与 draft 内容。

## 复刻检查清单

- [ ] 输入框高度随内容增长，且不超过 max。
- [ ] 修改 `className` 字号/行高时优先依赖 computed style，避免硬编码与 CSS 漂移。
