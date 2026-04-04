/**
 * gateway-history.ts
 * 将网关返回的 chat.history 消息格式转换为 UI 所需的消息格式。
 */

import type { GatewayMessage, GatewayMessageContent } from "./openclaw/types";

export type UiMessage = {
  id?: string;
  role: "assistant" | "user" | "system";
  content: string;
  timestamp?: number;
  toolCalls?: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
  }>;
  toolResults?: Array<{
    tool_use_id: string;
    content: string;
  }>;
};

/**
 * 从网关消息中提取纯文本内容。
 */
function extractText(content: GatewayMessageContent | GatewayMessageContent[]): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((block) => {
      if (typeof block === "object" && block !== null && "text" in block) {
        return (block as { text: string }).text ?? "";
      }
      if (typeof block === "object" && block !== null && "thinking" in block) {
        return ""; // 思考内容不显示在 UI
      }
      return "";
    })
    .join("");
}

/**
 * 从网关消息中提取工具调用（tool_use 块）。
 */
function extractToolCalls(content: GatewayMessageContent | GatewayMessageContent[]): UiMessage["toolCalls"] {
  if (!Array.isArray(content)) return undefined;
  const calls = content
    .filter(
      (block): block is Extract<GatewayMessageContent, { type: "tool_use" }> =>
        typeof block === "object" && block !== null && (block as { type?: string }).type === "tool_use"
    )
    .map((block) => ({
      id: block.id,
      name: block.name,
      input: block.input,
    }));
  return calls.length > 0 ? calls : undefined;
}

/**
 * 从网关消息中提取工具结果（tool_result 块）。
 */
function extractToolResults(content: GatewayMessageContent | GatewayMessageContent[]): UiMessage["toolResults"] {
  if (!Array.isArray(content)) return undefined;
  const results = content
    .filter(
      (block): block is Extract<GatewayMessageContent, { type: "tool_result" }> =>
        typeof block === "object" && block !== null && (block as { type?: string }).type === "tool_result"
    )
    .map((block) => ({
      tool_use_id: block.tool_use_id,
      content: block.content,
    }));
  return results.length > 0 ? results : undefined;
}

/**
 * 将网关消息数组转换为 UI 消息数组。
 */
export function gatewayHistoryToUiMessages(
  messages: GatewayMessage[]
): UiMessage[] {
  return messages.map((msg) => {
    const content =
      typeof msg.content === "string"
        ? msg.content
        : extractText(msg.content);

    return {
      id: msg.id,
      role: msg.role,
      content,
      timestamp: 0, // 网关消息不含 timestamp，设为 0 由 UI 处理
      toolCalls: extractToolCalls(msg.content),
      toolResults: extractToolResults(msg.content),
    };
  });
}
