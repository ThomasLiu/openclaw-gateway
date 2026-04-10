"use client";

import React, { useState, useRef, useCallback, useEffect, memo } from "react";
import { useTranslations, useLocale } from "next-intl";
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
    [onSwipeLeft, onSwipeRight, threshold]
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
  const locale = useLocale();

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
    isCollapsed;

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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20"
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


        {/* Mobile Drawer Close Button */}
        {isMobile && isDrawerOpen && (
          <button
            onClick={onCloseDrawer}
            className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-border-primary bg-bg-tertiary/90 text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
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
            <div className="flex-shrink-0 border-b border-border-primary overflow-y-auto">
              <div className="px-4 pb-4 pt-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {t("title", { defaultValue: "Agents" })}
                  </h3>
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
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
                  <div className="space-y-1.5">
                    {agents.map((agent) => {
                      const isSelected = agent.id === selectedAgentId;
                      const status = agent.config?.status ?? 'idle';
                      const name = agent.config?.name ?? agent.id;
                      return (
                        <div
                          key={agent.id}
                          onClick={() => handleAgentClick(agent.id)}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-3 transition-colors ${
                            isSelected
                              ? 'bg-bg-hover text-text-primary'
                              : 'text-text-secondary hover:bg-bg-hover/80'
                          }`}
                        >
                          <Bot size={15} className={`flex-shrink-0 ${isSelected ? 'text-text-primary' : 'text-text-muted'}`} />
                          <div className="flex-1 min-w-0">
                            <div className={`truncate text-sm leading-5 ${isSelected ? 'font-medium text-text-primary' : 'text-text-secondary'}`}>
                              {name}
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className={`text-[11px] capitalize ${
                                status === 'running' ? 'text-status-success' :
                                status === 'error' ? 'text-status-error' :
                                status === 'disabled' ? 'text-text-muted' :
                                'text-text-muted'
                              }`}>
                                {status}
                              </span>
                              {agent.sessionCount > 0 && (
                                <span className="text-[11px] text-text-muted">
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
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 pb-4 pt-3">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {tSession("title", { defaultValue: "Sessions" })}
                  </h3>
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
                    title={tSession("newSession", { defaultValue: "New Session" })}
                  >
                    <Plus size={14} className="text-text-muted" />
                  </button>
                </div>

                {/* Search placeholder */}
                <div className="relative mb-4">
                  <Search
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    type="text"
                    placeholder={tSession("searchPlaceholder", { defaultValue: "Search sessions..." })}
                    className="w-full rounded-lg border border-border-primary bg-bg-input pl-9 pr-3 py-2.5 text-sm focus:border-accent-primary"
                  />
                </div>

                {sessionsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={16} className="animate-spin text-text-muted" />
                  </div>
                ) : sessions.length > 0 ? (
                  <div className="space-y-1.5">
                    {sessions.map((session) => {
                      const isSelected = session.id === selectedSessionId;
                      return (
                        <div
                          key={session.id}
                          onClick={() => handleSessionClick(session)}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-3 transition-colors ${
                            isSelected
                              ? 'bg-bg-hover text-text-primary'
                              : 'text-text-secondary hover:bg-bg-hover/80'
                          }`}
                        >
                          <MessageSquare
                            size={15}
                            className={`flex-shrink-0 ${isSelected ? 'text-text-primary' : 'text-text-muted'}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className={`truncate text-sm leading-5 ${isSelected ? 'font-medium text-text-primary' : 'text-text-secondary'}`}>
                              {session.id.substring(0, 8)}...
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-text-muted">
                              <span>{session.messageCount} msgs</span>
                              {session.startTime > 0 && (
                                <span>{new Date(session.startTime).toLocaleDateString(locale)}</span>
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
            </div>
          </>
        )}

        {/* Collapsed / Icon-only State */}
        {effectiveCollapsed && !isMobile && (
          <div className="flex flex-col items-center py-4 gap-4">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
              title={t("title", { defaultValue: "Agents" })}
            >
              <Bot size={20} className="text-text-accent" />
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
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
