"use client";

import React, { memo } from "react";
import { useTranslations } from "next-intl";
import { useResponsive } from "@/hooks/use-responsive";
import {
  Menu,
  PanelLeft,
  PanelLeftClose,
  ChevronRight,
} from "lucide-react";
import { useIDEStore } from "@/store";
import { GatewayInfo } from "@/components/gateway";
import type { ConnectionState } from "@/types";

interface TopBarProps {
  version?: string;
  hasUpdate?: boolean;
  onCliClick?: () => void;
  onUpdateClick?: () => void;
  onReconnect?: () => void;
  onMobileMenuToggle?: () => void;
  onSidebarToggle?: () => void;
  isSidebarOpen?: boolean;
}

const TopBar = memo(function TopBar({
  version,
  hasUpdate = false,
  onCliClick,
  onUpdateClick,
  onReconnect,
  onMobileMenuToggle,
  onSidebarToggle,
  isSidebarOpen = true,
}: TopBarProps) {
  const t = useTranslations("topbar");

  const connectionStatus = useIDEStore((state) => state.gateway.status);
  const storeVersion = useIDEStore((state) => state.data.version);
  const storeHasUpdate = useIDEStore((state) => state.data.hasUpdate);
  const storeRemoteVersion = useIDEStore((state) => state.data.remoteVersion);
  const initGateway = useIDEStore((state) => state.initGateway);

  const effectiveVersion = version ?? storeVersion;

  const responsive = useResponsive();

  const handleStatusClick = () => {
    if (onReconnect) {
      onReconnect();
    } else {
      initGateway();
    }
  };

  // 检查状态是否可点击（断开或重连中）
  const isClickable = connectionStatus === 'disconnected' || connectionStatus === 'reconnecting';

  return (
    <header
      className="flex items-center justify-between h-[var(--topbar-height)] py-3 px-2 bg-bg-secondary border-b border-border-primary select-none shrink-0"
      style={{ height: "var(--topbar-height)" }}
      role="banner"
      data-testid="topbar"
    >
      {/* Left Section - Logo + Hamburger (mobile) + Connection Status */}
      <div className="flex items-center gap-3">
        {!responsive.isMobile && onSidebarToggle && (
          <button
            onClick={onSidebarToggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:text-text-primary"
            title={isSidebarOpen ? "隐藏侧边栏" : "显示侧边栏"}
            aria-label={isSidebarOpen ? "隐藏侧边栏" : "显示侧边栏"}
            data-testid="sidebar-toggle-btn"
          >
            {isSidebarOpen ? (
              <PanelLeftClose size={18} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="9" height="18" rx="2" fill="currentColor" />
                <path d="m14 18 6-6-6-6" />
              </svg>
            )}
          </button>
        )}
        
        {responsive.isMobile && onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
            title={t("mobileMenu", { defaultValue: "Menu" })}
            aria-label={t("mobileMenu", { defaultValue: "Menu" })}
            data-testid="hamburger-btn"
          >
            <Menu size={18} />
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-text-primary">
            Agents Chat
          </span>
        </div>

        {/* Gateway Info */}
        <GatewayInfo
          status={connectionStatus}
          name="OpenClaw"
          version={effectiveVersion}
          hasUpdate={hasUpdate ?? storeHasUpdate}
          remoteVersion={storeRemoteVersion}
          isClickable={isClickable}
          onStatusClick={handleStatusClick}
          onUpdateClick={onUpdateClick}
          onCliClick={onCliClick}
          title={isClickable ? t("clickToReconnect") : undefined}
        />
      </div>

      {/* Center Section */}
      <div className="flex-1" />

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* 右侧可以添加其他操作按钮 */}
      </div>
    </header>
  );
});

export default TopBar;
