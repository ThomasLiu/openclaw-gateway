# Spec 09：消息渲染、Markdown、工具卡与附件

## 类型与归一化

- **`components/chat-types.ts`**：`UiMessage`、`ToolCard`、`AssistantMessageMeta`、`GatewaySessionRow` 等。
- **`normalizeUiMessage`**：将原始记录转为 UI 统一结构。

## 消息分组

- **`ChatMessageGroup.tsx`**：按 assistant 连续消息、工具调用等分组。
- **`lib/chat-message-group.ts`**：分组算法与单测 `chat-message-group.test.ts`。

## Markdown

- **`ChatMarkdown.tsx`**：基于 `react-markdown` + `remark-gfm`；代码块、链接、表格等。
- **测试**：`ChatMarkdown.test.tsx`。
- **纯 JSON 消息**：`ChatJsonOrPlain.tsx`、`lib/chat-pure-json.ts` — 纯 JSON 时优先 JSON 视图而非当普通文本。
- **折叠**：`ChatJsonMessageCollapse.tsx` 大块 JSON。

## 工具与助手元数据

- **`lib/openclaw/tool-cards.ts` / `tool-content.ts`**：从网关消息提取工具卡。
- **`lib/openclaw/assistant-meta.ts`**：`extractAssistantMetaFromGatewayMessage`。
- **`ChatToolsCollapse.tsx`**：工具条折叠展示。

## 附件（`lib/chat-attachment.ts`）

- **解析**：`parseApiImageAttachmentsFromJson` — 校验 API 传入的附件 JSON。
- **API 形态**：与 OpenClaw `chat.send` 一致：`{ type: "image", mimeType, content: base64 }`（见 `OpenClawClient.sendChatMessageStreaming`）。
- **上游**：`openclaw-integration.manifest.json` 指向 `extensions/minimax/*`、`src/gateway/session-utils.ts` 等与附件对齐的文件。
- **E2E**：`e2e/chat-attachment-send.spec.ts`。

## 展示条带

- **`lib/chat-assistant-display-strip.ts`**、**`chat-assistant-segments.ts`**：助手消息分段与展示裁剪。

## 用户消息 Rail

- **`ChatUserMessageRail.tsx`**：用户消息侧轨（时间、状态等）。

## 复刻检查清单

- [ ] 助手正文使用 `extractAssistantTextFromGatewayMessage`，与网关多段 `content` 一致。
- [ ] 图片附件在 API 与 UI 上 MIME 与 base64 校验完整。
- [ ] Markdown 与 JSON 模式互斥逻辑正确（避免双渲染）。
