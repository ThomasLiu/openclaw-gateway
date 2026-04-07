// ============================================================
// OpenClaw Chat - 懒加载详情面板组件注册表
// 使用 React.lazy 实现右侧面板 11 个 Tab 的按需加载
// 配合 Suspense fallback 显示骨架屏
// ============================================================

import React, { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// ==================== Skeleton Fallback ====================

function TabSkeletonFallback() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-4 animate-pulse">
      <Loader2 size={24} className="text-text-muted animate-spin mb-3" />
      <span className="text-xs text-text-muted">Loading...</span>
    </div>
  );
}

// ==================== Lazy Components ====================

const LazyConfigEditorTab = lazy(
  () => import("@/components/detail-panel/ConfigEditorTab").then((m) => ({ default: m.ConfigEditorTab }))
);

const LazyLlmHistoryTab = lazy(
  () => import("@/components/detail-panel/LlmHistoryTab").then((m) => ({ default: m.LlmHistoryTab }))
);

const LazySkillManagerTab = lazy(
  () => import("@/components/detail-panel/SkillManagerTab").then((m) => ({ default: m.SkillManagerTab }))
);

const LazyMcpManagerTab = lazy(
  () => import("@/components/detail-panel/McpManagerTab").then((m) => ({ default: m.McpManagerTab }))
);

const LazySubagentTab = lazy(
  () => import("@/components/detail-panel/SubagentTab").then((m) => ({ default: m.SubagentTab }))
);

const LazyModelManagerTab = lazy(
  () => import("@/components/detail-panel/ModelManagerTab").then((m) => ({ default: m.ModelManagerTab }))
);

const LazyMemoryManagerTab = lazy(
  () => import("@/components/detail-panel/MemoryManagerTab").then((m) => ({ default: m.MemoryManagerTab }))
);

const LazyWorkspaceBrowserTab = lazy(
  () => import("@/components/detail-panel/WorkspaceBrowserTab").then((m) => ({ default: m.WorkspaceBrowserTab }))
);

const LazyCronManagerTab = lazy(
  () => import("@/components/detail-panel/CronManagerTab").then((m) => ({ default: m.CronManagerTab }))
);

const LazyChannelManagerTab = lazy(
  () => import("@/components/detail-panel/ChannelManagerTab").then((m) => ({ default: m.ChannelManagerTab }))
);

const LazyLogPanelTab = lazy(
  () => import("@/components/detail-panel/LogPanelTab").then((m) => ({ default: m.LogPanelTab }))
);

// ==================== Registry Map ====================

export const lazyTabComponents: Record<string, React.LazyExoticComponent<React.ComponentType<{ agentId?: string }>>> = {
  config: LazyConfigEditorTab,
  history: LazyLlmHistoryTab,
  skill: LazySkillManagerTab,
  mcp: LazyMcpManagerTab,
  subagent: LazySubagentTab,
  model: LazyModelManagerTab,
  memory: LazyMemoryManagerTab,
  workspace: LazyWorkspaceBrowserTab,
  cron: LazyCronManagerTab,
  channel: LazyChannelManagerTab,
  log: LazyLogPanelTab,
};

export type LazyTabKey = keyof typeof lazyTabComponents;

// ==================== Wrapper Component ====================

interface LazyTabLoaderProps {
  tabKey: LazyTabKey;
  agentId?: string;
}

/**
 * LazyTabLoader - 统一的懒加载包装器
 *
 * 功能：
 * - 根据 tabKey 从注册表获取对应懒加载组件
 * - 自动包裹 Suspense + 骨架屏 fallback
 * - 支持 agentId 传递
 */
export function LazyTabLoader({ tabKey, agentId }: LazyTabLoaderProps) {
  const LazyComponent = lazyTabComponents[tabKey];

  if (!LazyComponent) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted text-sm p-4">
        Unknown tab: {tabKey}
      </div>
    );
  }

  return (
    <Suspense fallback={<TabSkeletonFallback />}>
      <LazyComponent agentId={agentId} />
    </Suspense>
  );
}

// ==================== Preload Helpers ====================

/**
 * 预加载指定 Tab 组件（用于鼠标 hover 等预判场景）
 */
export function preloadTab(tabKey: LazyTabKey): void {
  const component = lazyTabComponents[tabKey];
  if (component) {
    // Trigger preload by reading the component
    void component;
  }
}

/**
 * 预加载所有 Tab 组件（在空闲时调用）
 */
export function preloadAllTabs(): void {
  Object.keys(lazyTabComponents).forEach((key) => {
    preloadTab(key as LazyTabKey);
  });
}
