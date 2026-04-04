/**
 * Vitest 测试环境配置
 */
import "@testing-library/jest-dom";

// Mock scrollIntoView for jsdom (jsdom 不实现此 API)
if (typeof HTMLDivElement !== "undefined") {
  HTMLDivElement.prototype.scrollIntoView = function(_options?: boolean | {
    behavior?: string;
    block?: string;
    inline?: string;
  }) {
    // 空实现，测试时不需要真实滚动行为
  };
}

// Mock EventSource for jsdom（审批 SSE 测试）
class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  url: string;
  readyState = MockEventSource.CONNECTING;
  onopen: ((event: MessageEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // 模拟连接成功
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      this.onopen?.(new MessageEvent("open"));
    }, 0);
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  addEventListener(_type: string, _listener: (event: Event) => void) {
    // 空实现
  }
}

// 全局注册 EventSource
if (typeof globalThis.EventSource === "undefined") {
  (globalThis as unknown as Record<string, unknown>).EventSource = MockEventSource;
}
