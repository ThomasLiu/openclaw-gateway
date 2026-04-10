// ============================================================
// OpenClaw Chat - RightSidebar 容器组件（响应式）
// 右侧详情面板，包含 12 个 Tab 模块
// 支持 desktop/tablet/mobile 三种响应式模式
// ============================================================

"use client";

import React, { useState, useCallback, useEffect, memo } from "react";
import { useTranslations } from "next-intl";
import { useResponsive } from "@/hooks/use-responsive";
import { useIDEStore } from "@/store";
import type { RightSidebarTab } from "@/store";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  History,
  Zap,
  Server,
  GitBranch,
  Cpu,
  Brain,
  FolderOpen,
  Clock,
  MessageSquare,
  Terminal,
  X,
} from "lucide-react";
import { LazyTabLoader } from "@/components/detail-panel/lazy-tabs";
import type { LazyTabKey } from "@/components/detail-panel/lazy-tabs";

// ==================== 类型定义 ====================

interface RightSidebarProps {
  agentId?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
  /** 移动端/平板抽屉是否打开 */
  isDrawerOpen?: boolean;
  onCloseDrawer?: () => void;
  className?: string;
}

// ==================== Tab 配置 ====================

interface TabConfig {
  id: RightSidebarTab;
  labelKey: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const TABS: TabConfig[] = [
  { id: "config", labelKey: "config", icon: FileText },
  { id: "history", labelKey: "history", icon: History },
  { id: "skill", labelKey: "skill", icon: Zap },
  { id: "mcp", labelKey: "mcp", icon: Server },
  { id: "subagent", labelKey: "subagent", icon: GitBranch },
  { id: "model", labelKey: "model", icon: Cpu },
  { id: "memory", labelKey: "memory", icon: Brain },
  { id: "workspace", labelKey: "workspace", icon: FolderOpen },
  { id: "cron", labelKey: "cron", icon: Clock },
  { id: "channel", labelKey: "channel", icon: MessageSquare },
  { id: "log", labelKey: "log", icon: Terminal },
];

// ==================== 组件实现 ====================

/**
 * RightSidebar - 右侧详情面板容器（响应式）
 *
 * 响应式行为：
 * - desktop (>=1200px): 完整右侧面板（12个Tab导航 + 内容区域），支持折叠
 * - tablet  (768-1199px): 默认隐藏，可通过按钮打开为抽屉
 * - mobile  (<768px):    抽屉模式（从右侧滑入，带遮罩层）
 */
const RightSidebar = memo(function RightSidebar({
  agentId,
  isCollapsed = false,
  onToggle,
  isDrawerOpen = false,
  onCloseDrawer,
  className = "",
}: RightSidebarProps) {
  const t = useTranslations("detailPanel.tabs");

  const responsive = useResponsive();

  // 从 store 读取状态
  const activeTab = useIDEStore((state) => state.layout.rightSidebarActiveTab);
  const setRightSidebarTab = useIDEStore((state) => state.setRightSidebarTab);
  const rightSidebarWidth = useIDEStore((state) => state.layout.rightSidebarWidth);

  // Determine effective visibility based on breakpoint + props
  const isMobile = responsive.breakpoint === "mobile";
  const isTablet = responsive.breakpoint === "tablet";

  // On tablet/mobile without explicit drawer open → hidden
  // On mobile with drawer open → show as overlay
  // On desktop with collapsed → zero width
  const effectivelyHidden =
    isCollapsed || (isTablet && !isDrawerOpen) || (isMobile && !isDrawerOpen);

  // Handle overlay click to close drawer
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && onCloseDrawer) {
        onCloseDrawer();
      }
    },
    [onCloseDrawer]
  );

  // ESC key closes drawer
  useEffect(() => {
    if ((!isMobile && !isTablet) || !isDrawerOpen || !onCloseDrawer) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseDrawer();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isMobile, isTablet, isDrawerOpen, onCloseDrawer]);

  // 处理 Tab 切换
  const handleTabChange = useCallback(
    (tabId: RightSidebarTab) => {
      setRightSidebarTab(tabId);
    },
    [setRightSidebarTab]
  );

  // 渲染当前激活的 Tab 内容（使用懒加载）
  const renderTabContent = () => {
    // log tab uses inline placeholder (no lazy loading needed)
    if (activeTab === "log") {
      return <LazyTabLoader tabKey={"log" as LazyTabKey} agentId={agentId} />;
    }

    // All other tabs use React.lazy + Suspense
    return <LazyTabLoader tabKey={activeTab as LazyTabKey} agentId={agentId} />;
  };

  // Build width style
  const widthStyle = effectivelyHidden
    ? { width: "0px", minWidth: "0px" }
    : { width: rightSidebarWidth, minWidth: rightSidebarWidth };

  // Mobile/Tablet drawer styles
  const isDrawerMode = (isMobile || isTablet) && isDrawerOpen;
  const drawerClasses = isDrawerMode
    ? "fixed inset-y-0 right-0 shadow-2xl z-40"
    : "";

  return (
    <>
      {/* Drawer Overlay Backdrop */}
      {isDrawerMode && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={handleOverlayClick}
          data-testid="drawer-overlay"
          aria-hidden="true"
        />
      )}

      <aside
        role="complementary"
        aria-label={t("sidebarLabel", { defaultValue: "Right Sidebar" })}
        className={`right-sidebar flex flex-col bg-bg-sidebar border-l border-border-primary relative overflow-hidden transition-all duration-200 ease-in-out ${drawerClasses} ${className}`}
        style={widthStyle}
        data-testid="right-sidebar"
      >
        {!effectivelyHidden && (
          <>
            {/* Tab Navigation Header */}
            <div className="flex items-center border-b border-border-primary bg-bg-secondary shrink-0">
              <div className="flex-1 flex items-center overflow-x-auto">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      role="tab"
                      aria-selected={isActive}
                      title={t(tab.labelKey)}
                      className={`flex items-center gap-1.5 whitespace-nowrap rounded-none border-b-2 px-3 py-3.5 text-[11px] font-medium uppercase tracking-[0.1em] transition-colors ${
                        isActive
                          ? "border-accent-primary text-text-primary"
                          : "border-transparent text-text-muted hover:text-text-secondary hover:bg-bg-hover/60"
                      }`}
                    >
                      <Icon size={13} />
                      <span>{t(tab.labelKey)}</span>
                    </button>
                  );
                })}
              </div>

              {/* Close button for drawer mode */}
              {isDrawerMode && onCloseDrawer && (
                <button
                  onClick={onCloseDrawer}
                  className="border-l border-border-primary px-3 py-3.5 text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary shrink-0"
                  title={t("closeDrawer", { defaultValue: "Close" })}
                  aria-label={t("closeDrawer", { defaultValue: "Close" })}
                  data-testid="drawer-close-btn"
                >
                  <X size={16} className="text-text-muted" />
                </button>
              )}

              {/* Collapse Button (desktop only) */}
              {!isMobile && !isTablet && onToggle && (
                <button
                  onClick={onToggle}
                  className="border-l border-border-primary px-3 py-3.5 text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary shrink-0"
                  title={t("collapseSidebar", { defaultValue: "Collapse" })}
                >
                  <ChevronLeft size={16} className="text-text-muted" />
                </button>
              )}
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 overflow-hidden">
              {renderTabContent()}
            </div>
          </>
        )}

        {/* 展开按钮（折叠状态时显示）— desktop only */}
        {effectivelyHidden && !isMobile && !isTablet && onToggle && (
          <button
            onClick={onToggle}
            className="absolute top-4 -left-8 flex h-8 w-8 items-center justify-center rounded-md bg-bg-secondary text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
            title={t("expandSidebar", { defaultValue: "Expand" })}
            data-testid="right-sidebar-expand-btn"
          >
            <ChevronRight size={14} className="text-text-muted" />
          </button>
        )}
      </aside>
    </>
  );
});

export default RightSidebar;
export { RightSidebar };
