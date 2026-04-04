/**
 * Extract assistant text from gateway message payload.
 * The payload.message structure is complex; we need to extract the display text.
 */

import type {
  GatewayMessage,
  GatewayMessageContent,
} from "./types.js";

export type { GatewayMessage, GatewayMessageContent };

/**
 * Extract plain text from a gateway message.
 * This handles the complex nested structure of gateway messages.
 */
export function extractAssistantTextFromGatewayMessage(
  message: GatewayMessage | null | undefined
): string {
  if (!message) return "";

  const content = message.content;
  if (!content) return "";

  // Handle array of content blocks
  if (Array.isArray(content)) {
    return content
      .map((block) => extractTextFromContentBlock(block))
      .filter(Boolean)
      .join("\n");
  }

  return extractTextFromContentBlock(content);
}

function extractTextFromContentBlock(block: GatewayMessageContent): string {
  if (!block || typeof block !== "object") return "";

  const b = block as Record<string, unknown>;

  switch (b.type) {
    case "text":
      return String(b.text ?? "");
    case "refusal":
      return `[Refusal] ${b.text ?? ""}`;
    case "thinking":
      return `[Thinking] ${b.thinking ?? ""}`;
    case "tool_use":
      return `[Tool: ${b.name}]`;
    case "tool_result":
      return `[Tool Result] ${b.content ?? ""}`;
    case "image":
      return "[Image]";
    default:
      // Try to extract any text-like field
      if (typeof b.text === "string") return b.text;
      return "";
  }
}

/**
 * Format a list of messages into a simple conversation string for display.
 */
export function formatMessagesForHistory(messages: GatewayMessage[]): string {
  return messages
    .map((msg) => {
      const role = msg.role === "assistant" ? "Assistant" : "User";
      const text = extractAssistantTextFromGatewayMessage(msg);
      return `${role}: ${text}`;
    })
    .join("\n\n");
}
