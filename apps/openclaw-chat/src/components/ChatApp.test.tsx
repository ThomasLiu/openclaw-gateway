/**
 * ChatApp 组件测试
 *
 * ChatApp 依赖 next/dynamic 进行动态导入。
 * 测试通过 vi.mock 拦截动态导入，验证组件渲染逻辑。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import React from "react";

// Mock next/dynamic - 拦截所有动态导入
vi.mock("next/dynamic", async (original) => {
  const actual = await original<typeof import("next/dynamic")>();
  return {
    ...actual,
    default: vi.fn((loader, options) => {
      // 返回一个简单的代理组件
      return function DynamicMock(props: Record<string, unknown>) {
        const [Component, setComponent] = React.useState<React.ComponentType<Record<string, unknown>> | null>(null);
        const [error, setError] = React.useState<Error | null>(null);

        React.useEffect(() => {
          Promise.resolve()
            .then(() => (typeof loader === "function" ? loader() : loader))
            .then((module) => {
              const Comp = (module as { default: React.ComponentType<Record<string, unknown>> }).default;
              if (!Comp) throw new Error("No default export");
              setComponent(() => Comp);
            })
            .catch((e) => setError(e as Error));
        }, []);

        if (error) {
          return <div data-testid="dynamic-error">加载失败</div>;
        }
        if (!Component) {
          return <div data-testid="dynamic-loading">{options?.loading?.() || "加载中..."}</div>;
        }
        return <Component {...props} />;
      };
    }),
  };
});

// Mock @/lib/openclaw
vi.mock("@/lib/openclaw", () => ({
  getOpenClawClient: vi.fn().mockResolvedValue({
    connected: true,
  }),
}));

// Mock fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ChatApp 组件", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ agents: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("应该渲染 ChatApp 主布局", async () => {
    const { default: ChatApp } = await import("./ChatApp");

    await act(async () => {
      render(<ChatApp />);
    });

    await waitFor(() => {
      const layout = document.querySelector(".flex.flex-col.h-screen");
      expect(layout).toBeInTheDocument();
    });
  });

  it("应该显示网关连接状态指示器", async () => {
    const { default: ChatApp } = await import("./ChatApp");

    await act(async () => {
      render(<ChatApp />);
    });

    await waitFor(() => {
      const indicator = document.querySelector('[title*="网关"]');
      expect(indicator).toBeInTheDocument();
    });
  });

  it("应该显示 Agent 侧栏标题", async () => {
    const { default: ChatApp } = await import("./ChatApp");

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({
        agents: [
          { id: "main", label: "main" },
          { id: "test-agent", label: "test-agent" },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await act(async () => {
      render(<ChatApp />);
    });

    await waitFor(() => {
      expect(screen.getByText("Agent")).toBeInTheDocument();
    });
  });

  it("应该显示会话侧栏标题", async () => {
    const { default: ChatApp } = await import("./ChatApp");

    await act(async () => {
      render(<ChatApp />);
    });

    await waitFor(() => {
      expect(screen.getByText("会话")).toBeInTheDocument();
    });
  });
});
