/**
 * gateway-history.test.ts
 * gatewayHistoryToUiMessages 转换逻辑测试
 */

import { describe, it, expect } from "vitest";
import { gatewayHistoryToUiMessages } from "../gateway-history";
import type { GatewayMessage } from "../openclaw/types";

describe("gatewayHistoryToUiMessages", () => {
  it("正确转换 assistant 消息", () => {
    const messages: GatewayMessage[] = [
      {
        id: "msg-1",
        role: "assistant",
        content: { type: "text", text: "Hello, world!" },
      },
    ];

    const result = gatewayHistoryToUiMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "msg-1",
      role: "assistant",
      content: "Hello, world!",
      timestamp: 0,
      toolCalls: undefined,
      toolResults: undefined,
    });
  });

  it("正确转换 user 消息", () => {
    const messages: GatewayMessage[] = [
      {
        id: "msg-2",
        role: "user",
        content: { type: "text", text: "Hi there" },
      },
    ];

    const result = gatewayHistoryToUiMessages(messages);
    expect(result[0].role).toBe("user");
    expect(result[0].content).toBe("Hi there");
  });

  it("正确转换 system 消息", () => {
    const messages: GatewayMessage[] = [
      {
        id: "msg-3",
        role: "system",
        content: { type: "text", text: "You are a helpful assistant." },
      },
    ];

    const result = gatewayHistoryToUiMessages(messages);
    expect(result[0].role).toBe("system");
  });

  it("处理 tool_use 消息类型", () => {
    const messages: GatewayMessage[] = [
      {
        id: "msg-4",
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "tool-1",
            name: "bash",
            input: { command: "ls -la" },
          },
        ],
      },
    ];

    const result = gatewayHistoryToUiMessages(messages);

    expect(result[0].toolCalls).toEqual([
      {
        id: "tool-1",
        name: "bash",
        input: { command: "ls -la" },
      },
    ]);
    expect(result[0].toolResults).toBeUndefined();
  });

  it("处理 tool_result 消息类型", () => {
    const messages: GatewayMessage[] = [
      {
        id: "msg-5",
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "tool-1",
            content: "total 0\ndrwxr-xr-x  2 thomas staff   64 Apr  4 17:00 .",
          },
        ],
      },
    ];

    const result = gatewayHistoryToUiMessages(messages);

    expect(result[0].toolResults).toEqual([
      {
        tool_use_id: "tool-1",
        content: "total 0\ndrwxr-xr-x  2 thomas staff   64 Apr  4 17:00 .",
      },
    ]);
  });

  it("处理 thinking 消息类型（不显示在 content）", () => {
    const messages: GatewayMessage[] = [
      {
        id: "msg-6",
        role: "assistant",
        content: [
          { type: "thinking", thinking: "Let me think about this..." },
          { type: "text", text: "Here's my answer." },
        ],
      },
    ];

    const result = gatewayHistoryToUiMessages(messages);

    // thinking 内容不包含在 content 中
    expect(result[0].content).toBe("Here's my answer.");
  });

  it("处理空 content", () => {
    const messages: GatewayMessage[] = [
      {
        id: "msg-7",
        role: "assistant",
        content: [],
      },
    ];

    const result = gatewayHistoryToUiMessages(messages);
    expect(result[0].content).toBe("");
  });

  it("处理 null content（网关原始数据）", () => {
    const messages: GatewayMessage[] = [
      {
        id: "msg-8",
        role: "assistant",
        content: null as unknown as GatewayMessage["content"],
      },
    ];

    const result = gatewayHistoryToUiMessages(messages);
    expect(result[0].content).toBe("");
  });

  it("处理多条连续消息", () => {
    const messages: GatewayMessage[] = [
      {
        id: "msg-a",
        role: "user",
        content: { type: "text", text: "What files are in this directory?" },
      },
      {
        id: "msg-b",
        role: "assistant",
        content: [
          { type: "tool_use", id: "t1", name: "bash", input: { cmd: "ls" } },
        ],
      },
      {
        id: "msg-c",
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: "t1", content: "file1.txt\nfile2.txt" },
        ],
      },
      {
        id: "msg-d",
        role: "assistant",
        content: { type: "text", text: "I can see file1.txt and file2.txt in the directory." },
      },
    ];

    const result = gatewayHistoryToUiMessages(messages);

    expect(result).toHaveLength(4);
    expect(result[0].content).toBe("What files are in this directory?");
    expect(result[1].toolCalls).toHaveLength(1);
    expect(result[2].toolResults).toHaveLength(1);
    expect(result[3].content).toBe("I can see file1.txt and file2.txt in the directory.");
  });

  it("处理 refusal 消息类型", () => {
    const messages: GatewayMessage[] = [
      {
        id: "msg-r",
        role: "assistant",
        content: [
          {
            type: "refusal",
            text: "I cannot help with that request.",
          },
        ],
      },
    ];

    const result = gatewayHistoryToUiMessages(messages);
    expect(result[0].content).toBe("I cannot help with that request.");
  });
});
