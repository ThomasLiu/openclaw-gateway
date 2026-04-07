"use client";

import React, { useState, useRef, useCallback, useEffect, memo } from "react";
import { useTranslations } from "next-intl";
import {
  Bot,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  X,
  Loader2,
} from "lucide-react";
import { useResponsive } from "@/hooks/use-responsive";
import { useIDEStore } from "@/store";
import type { Breakpoint } from "@/hooks/use-responsive";

// ==================== 类型定义 ====================

import type { AgentMetadata, SessionMetadata } from '@/types';

interface LeftSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  isDrawerOpen?: boolean;
  onCloseDrawer?: () => void;
  onSwipeEdge?: (direction: "left" | "right") => void;
  className?: string;
  initialAgents?: AgentMetadata[];
  initialSessions?: SessionMetadata[];
}

// ==================== 触摸滑动 Hook ====================

function useSwipeGesture(
  containerRef: React.RefObject<HTMLElement | null>,
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold = 50
) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    },
    []
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }
    },
    [onSwipeLeft, onSwipeRight]
  );

  return { handleTouchStart, handleTouchEnd };
}

// ==================== 组件实现 ====================

const LeftSidebar = memo(function LeftSidebar({
  isCollapsed = false,
  onToggle,
  isDrawerOpen = false,
  onCloseDrawer,
  onSwipeEdge,
  className = "",
  initialAgents = [],
  initialSessions = [],
}: LeftSidebarProps) {
  const t = useTranslations("agent");
  const tSession = useTranslations("session");
  const sidebarRef = useRef<HTMLElement>(null);

  const responsive = useResponsive();

  // 从 props 接收服务端初始数据，后续可通过 store 更新
  const agents = useIDEStore((s) => s.data.agents.length > 0 ? s.data.agents : initialAgents);
  const sessions = useIDEStore((s) => s.data.sessions.length > 0 ? s.data.sessions : initialSessions);
  const agentsLoading = useIDEStore((s) => s.data.agentsLoading);
  const sessionsLoading = useIDEStore((s) => s.data.sessionsLoading);
  const selectedAgentId = useIDEStore((s) => s.selection.agentId);
  const selectedSessionId = useIDEStore((s) => s.selection.sessionId);
  const selectAgent = useIDEStore((s) => s.selectAgent);
  const selectSession = useIDEStore((s) => s.selectSession);
  const fetchSessions = useIDEStore((s) => s.fetchSessions);
  const fetchMessages = useIDEStore((s) => s.fetchMessages);

  const handleAgentClick = useCallback((agentId: string) => {
    selectAgent(agentId);
    fetchSessions(agentId);
  }, [selectAgent, fetchSessions]);

  const handleSessionClick = useCallback((session: SessionMetadata) => {
    selectSession(session.id);
    if (session.filePath) {
      fetchMessages(session.filePath);
    }
  }, [selectSession, fetchMessages]);

  useEffect(() => {
    if (selectedAgentId && sessions.length === 0) {
      fetchSessions(selectedAgentId);
    }
  }, [selectedAgentId, sessions.length, fetchSessions]);

  const isMobile = responsive.breakpoint === "mobile";
  const isTablet = responsive.breakpoint === "tablet";

  const effectiveCollapsed =
    isCollapsed || isTablet || (isMobile && !isDrawerOpen);

  const { handleTouchStart, handleTouchEnd } = useSwipeGesture(
    sidebarRef,
    isMobile && isDrawerOpen ? onCloseDrawer : undefined,
    undefined
  );

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && onCloseDrawer) {
        onCloseDrawer();
      }
    },
    [onCloseDrawer]
  );

  useEffect(() => {
    if (!isMobile || !isDrawerOpen || !onCloseDrawer) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseDrawer();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isMobile, isDrawerOpen, onCloseDrawer]);

  const baseClasses =
    "flex flex-col bg-bg-sidebar border-r border-border-primary relative overflow-hidden transition-all duration-200 ease-in-out z-30";

  const widthStyle = effectiveCollapsed
    ? { width: "var(--sidebar-collapsed-width)", minWidth: "var(--sidebar-collapsed-width)" }
    : { width: "var(--sidebar-width)", minWidth: "var(--sidebar-width)" };

  const drawerClasses = isMobile
    ? isDrawerOpen
      ? "fixed inset-y-0 left-0 shadow-2xl"
      : "fixed -translate-x-full"
    : "";

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobile && isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20"
          onClick={handleOverlayClick}
          data-testid="drawer-overlay"
          aria-hidden="true"
        />
      )}

      <aside
        ref={sidebarRef}
        role="complementary"
        aria-label={t("sidebarLabel", { defaultValue: "Left Sidebar" })}
        className={`${baseClasses} ${drawerClasses} ${className}`}
        style={widthStyle}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        data-testid="left-sidebar"
      >
        {/* Collapse Toggle Button (desktop/tablet only) */}
        {!isMobile && (
          <button
            onClick={onToggle}
            className={`absolute top-3 z-10 w-6 h-6 flex items-center justify-center bg-bg-tertiary border border-border-primary rounded-full hover:bg-bg-active transition-colors ${
              effectiveCollapsed
                ? "-right-3"
                : "-right-3"
            }`}
            title={
              effectiveCollapsed
                ? t("expandSidebar", { defaultValue: "Expand" })
                : t("collapseSidebar", { defaultValue: "Collapse" })
            }
            data-testid="left-sidebar-toggle"
          >
            {effectiveCollapsed ? (
              <ChevronRight size={12} />
            ) : (
              <ChevronLeft size={12} />
            )}
          </button>
        )}

        {/* Mobile Drawer Close Button */}
        {isMobile && isDrawerOpen && (
          <button
            onClick={onCloseDrawer}
            className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center hover:bg-bg-hover rounded transition-colors"
            title={t("closeDrawer", { defaultValue: "Close" })}
            aria-label={t("closeDrawer", { defaultValue: "Close" })}
            data-testid="drawer-close-btn"
          >
            <X size={16} />
          </button>
        )}

        {/* Full Content Mode */}
        {!effectiveCollapsed && (
          <>
            {/* Agent List Section */}
            <div className="flex-shrink-0 border-b border-border-primary">
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {t("title", { defaultValue: "Agents" })}
                  </h3>
                  <button
                    className="p-1 hover:bg-bg-hover rounded transition-colors"
                    title={t("addAgent", { defaultValue: "Add Agent" })}
                  >
                    <Plus size={14} className="text-text-muted" />
                  </button>
                </div>

                {agentsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={16} className="animate-spin text-text-muted" />
                  </div>
                ) : agents.length > 0 ? (
                  <div className="space-y-1">
                    {agents.map((agent) => {
                      const isSelected = agent.id === selectedAgentId;
                      const status = agent.config?.status ?? 'idle';
                      const name = agent.config?.name ?? agent.id;
                      return (
                        <div
                          key={agent.id}
                          onClick={() => handleAgentClick(agent.id)}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-accent-primary/10 border border-accent-primary/30'
                              : 'hover:bg-bg-hover'
                          }`}
                        >
                          <Bot size={16} className={`flex-shrink-0 ${isSelected ? 'text-accent-primary' : 'text-text-accent'}`} />
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs truncate ${isSelected ? 'text-text-primary font-medium' : 'text-text-primary'}`}>
                              {name}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs capitalize ${
                                status === 'running' ? 'text-status-success' :
                                status === 'error' ? 'text-status-error' :
                                status === 'disabled' ? 'text-text-muted' :
                                'text-text-muted'
                              }`}>
                                {status}
                              </span>
                              {agent.sessionCount > 0 && (
                                <span className="text-xs text-text-muted">
                                  {agent.sessionCount} sessions
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-text-muted">
                    No agents found
                  </div>
                )}
              </div>
            </div>

            {/* Session List Section */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  {tSession("title", { defaultValue: "Sessions" })}
                </h3>
                <button
                  className="p-1 hover:bg-bg-hover rounded transition-colors"
                  title={tSession("newSession", { defaultValue: "New Session" })}
                >
                  <Plus size={14} className="text-text-muted" />
                </button>
              </div>

              {/* Search placeholder */}
              <div className="mb-2 relative">
                <Search
                  size={14}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="text"
                  placeholder={tSession("searchPlaceholder", { defaultValue: "Search sessions..." })}
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-bg-input border border-border-primary rounded focus:border-accent-primary outline-none"
                />
              </div>

              {sessionsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={16} className="animate-spin text-text-muted" />
                </div>
              ) : sessions.length > 0 ? (
                <div className="space-y-1">
                  {sessions.map((session) => {
                    const isSelected = session.id === selectedSessionId;
                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSessionClick(session)}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-accent-primary/10 border border-accent-primary/30'
                            : 'hover:bg-bg-hover'
                        }`}
                      >
                        <MessageSquare
                          size={16}
                          className={`flex-shrink-0 ${isSelected ? 'text-accent-primary' : 'text-text-secondary'}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs truncate ${isSelected ? 'font-medium' : ''}`}>
                            {session.id.substring(0, 8)}...
                          </div>
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            <span>{session.messageCount} msgs</span>
                            {session.startTime > 0 && (
                              <span>{new Date(session.startTime).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-text-muted">
                  {selectedAgentId ? 'No sessions yet' : 'Select an agent to view sessions'}
                </div>
              )}
            </div>
          </>
        )}

        {/* Collapsed / Icon-only State */}
        {effectiveCollapsed && !isMobile && (
          <div className="flex flex-col items-center py-4 gap-4">
            <button
              className="p-2 hover:bg-bg-hover rounded transition-colors"
              title={t("title", { defaultValue: "Agents" })}
            >
              <Bot size={20} className="text-text-accent" />
            </button>
            <button
              className="p-2 hover:bg-bg-hover rounded transition-colors"
              title={tSession("title", { defaultValue: "Sessions" })}
            >
              <MessageSquare size={20} className="text-text-secondary" />
            </button>
          </div>
        )}

        {/* Mobile Drawer Content (same as full content but inside drawer) */}
        {isMobile && isDrawerOpen && effectiveCollapsed === false && (
          <>
            {/* Already rendered above via !effectiveCollapsed block */}
          </>
        )}
      </aside>
    </>
  );
});

export default LeftSidebar;
