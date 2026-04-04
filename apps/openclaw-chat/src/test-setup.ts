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
