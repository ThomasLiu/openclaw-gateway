/**
 * Composer 组件测试
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Composer from "./Composer";

describe("Composer", () => {
  const mockOnSend = vi.fn();
  const mockOnAbort = vi.fn();

  beforeEach(() => {
    mockOnSend.mockClear();
    mockOnAbort.mockClear();
  });

  it("应该渲染输入框和发送按钮", () => {
    render(
      <Composer
        disabled={false}
        streaming={false}
        onSend={mockOnSend}
        onAbort={mockOnAbort}
      />
    );

    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute("placeholder", expect.stringContaining("输入消息"));
  });

  it("应该显示正确的 placeholder（未选择会话时）", () => {
    render(
      <Composer
        disabled={true}
        streaming={false}
        onSend={mockOnSend}
        onAbort={mockOnAbort}
      />
    );

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("placeholder", "请先选择一个会话");
  });

  it("应该显示流式状态 placeholder", () => {
    render(
      <Composer
        disabled={false}
        streaming={true}
        onSend={mockOnSend}
        onAbort={mockOnAbort}
      />
    );

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("placeholder", "AI 正在生成中...");
  });

  it("输入文本后点击发送按钮应调用 onSend", () => {
    render(
      <Composer
        disabled={false}
        streaming={false}
        onSend={mockOnSend}
        onAbort={mockOnAbort}
      />
    );

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "你好，测试消息" } });

    const sendButton = screen.getByTitle("发送消息 (Enter)");
    fireEvent.click(sendButton);

    expect(mockOnSend).toHaveBeenCalledTimes(1);
    expect(mockOnSend).toHaveBeenCalledWith("你好，测试消息");
  });

  it("发送后应该清空输入框", () => {
    render(
      <Composer
        disabled={false}
        streaming={false}
        onSend={mockOnSend}
        onAbort={mockOnAbort}
      />
    );

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "测试内容" } });
    expect(textarea).toHaveValue("测试内容");

    const sendButton = screen.getByTitle("发送消息 (Enter)");
    fireEvent.click(sendButton);

    expect(textarea).toHaveValue("");
  });

  it("Enter 键应触发发送（不包含 Shift）", () => {
    render(
      <Composer
        disabled={false}
        streaming={false}
        onSend={mockOnSend}
        onAbort={mockOnAbort}
      />
    );

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "按 Enter 发送" } });

    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(mockOnSend).toHaveBeenCalledTimes(1);
    expect(mockOnSend).toHaveBeenCalledWith("按 Enter 发送");
  });

  it("Shift+Enter 键不应触发发送", () => {
    render(
      <Composer
        disabled={false}
        streaming={false}
        onSend={mockOnSend}
        onAbort={mockOnAbort}
      />
    );

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "换行不应发送" } });

    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it("空内容不应触发发送", () => {
    render(
      <Composer
        disabled={false}
        streaming={false}
        onSend={mockOnSend}
        onAbort={mockOnAbort}
      />
    );

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "   " } });

    const sendButton = screen.getByTitle("发送消息 (Enter)");
    expect(sendButton).toBeDisabled();
  });

  it("流式状态应显示停止按钮", () => {
    render(
      <Composer
        disabled={false}
        streaming={true}
        onSend={mockOnSend}
        onAbort={mockOnAbort}
      />
    );

    const stopButton = screen.getByTitle("中止生成");
    expect(stopButton).toBeInTheDocument();
  });

  it("点击停止按钮应调用 onAbort", () => {
    render(
      <Composer
        disabled={false}
        streaming={true}
        onSend={mockOnSend}
        onAbort={mockOnAbort}
      />
    );

    const stopButton = screen.getByTitle("中止生成");
    fireEvent.click(stopButton);

    expect(mockOnAbort).toHaveBeenCalledTimes(1);
  });

  it("disabled 状态下输入框应被禁用", () => {
    render(
      <Composer
        disabled={true}
        streaming={false}
        onSend={mockOnSend}
        onAbort={mockOnAbort}
      />
    );

    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeDisabled();
  });

  it("disabled 状态下发送按钮应不可点击", () => {
    render(
      <Composer
        disabled={true}
        streaming={false}
        onSend={mockOnSend}
        onAbort={mockOnAbort}
      />
    );

    const sendButton = screen.getByTitle("发送消息 (Enter)");
    expect(sendButton).toBeDisabled();
  });
});
