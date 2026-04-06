/**
 * MessageList 组件测试
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MessageList from "./MessageList";
import type { MessageItem } from "./chat-types";

describe("MessageList", () => {
  const mockMessages: MessageItem[] = [
    {
      id: "msg-1",
      role: "user",
      content: "你好，AI助手！",
      timestamp: new Date("2024-01-01T10:00:00Z"),
    },
    {
      id: "msg-2",
      role: "assistant",
      content: "你好！有什么可以帮助你的吗？",
      timestamp: new Date("2024-01-01T10:00:05Z"),
    },
    {
      id: "msg-3",
      role: "system",
      content: "系统提示：欢迎使用",
      timestamp: new Date("2024-01-01T10:00:10Z"),
    },
  ];

  it("应该正确渲染消息列表", () => {
    render(
      <MessageList
        messages={mockMessages}
        streamingMessageId={undefined}
        streamingDelta={undefined}
      />
    );

    expect(screen.getByText("你好，AI助手！")).toBeInTheDocument();
    expect(screen.getByText("你好！有什么可以帮助你的吗？")).toBeInTheDocument();
    expect(screen.getByText("系统提示：欢迎使用")).toBeInTheDocument();
  });

  it("应该渲染 user 消息", () => {
    const { container } = render(
      <MessageList
        messages={mockMessages}
        streamingMessageId={undefined}
        streamingDelta={undefined}
      />
    );
    const userMessages = container.querySelectorAll(".chat-group.user");
    expect(userMessages.length).toBeGreaterThanOrEqual(1);
  });

  it("应该渲染 assistant 消息", () => {
    const { container } = render(
      <MessageList
        messages={mockMessages}
        streamingMessageId={undefined}
        streamingDelta={undefined}
      />
    );
    const assistantMessages = container.querySelectorAll(".chat-group.assistant");
    expect(assistantMessages.length).toBeGreaterThanOrEqual(1);
  });

  it("应该渲染 system 消息", () => {
    render(
      <MessageList
        messages={mockMessages}
        streamingMessageId={undefined}
        streamingDelta={undefined}
      />
    );
    expect(screen.getByText("系统提示：欢迎使用")).toBeInTheDocument();
  });

  it("应该渲染空消息列表", () => {
    const { container } = render(
      <MessageList
        messages={[]}
        streamingMessageId={undefined}
        streamingDelta={undefined}
      />
    );
    // 空消息列表不应显示任何消息气泡
    expect(container.querySelectorAll(".message-user")).toHaveLength(0);
    expect(container.querySelectorAll(".message-assistant")).toHaveLength(0);
  });

  it("流式消息应显示 streaming 样式", () => {
    const streamingMessage: MessageItem = {
      id: "assistant-streaming",
      role: "assistant",
      content: "正在生成的内容",
      timestamp: new Date(),
      streaming: true,
    };

    const { container } = render(
      <MessageList
        messages={[streamingMessage]}
        streamingMessageId="assistant-streaming"
        streamingDelta="追加内容"
      />
    );

    // 流式消息应显示消息自身的 content
    expect(screen.getByText("正在生成的内容")).toBeInTheDocument();
    // 流式消息应有 streaming CSS class
    const streamingBubble = container.querySelector(".chat-bubble.streaming");
    expect(streamingBubble).toBeInTheDocument();
  });

  it("应该包含 Markdown 代码块渲染", () => {
    const codeMessage: MessageItem = {
      id: "code-msg",
      role: "assistant",
      content: "```javascript\nconsole.log('hello');\n```",
      timestamp: new Date(),
    };

    render(
      <MessageList
        messages={[codeMessage]}
        streamingMessageId={undefined}
        streamingDelta={undefined}
      />
    );

    // 代码块内容应该被渲染
    expect(screen.getByText(/console\.log/)).toBeInTheDocument();
  });
});
