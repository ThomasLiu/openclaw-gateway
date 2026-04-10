"use client";

import React, { memo } from "react";
import { useTranslations } from "next-intl";
import { useResponsive } from "@/hooks/use-responsive";
import {
  Wifi,
  WifiOff,
  Loader2,
  Terminal,
  Info,
  RefreshCw,
  Download,
  Menu,
} from "lucide-react";
import { useIDEStore } from "@/store";
import type { ConnectionState } from "@/types";

interface StatusConfig {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  labelKey: string;
  isClickable: boolean;
}

interface TopBarProps {
  version?: string;
  hasUpdate?: boolean;
  onCliClick?: () => void;
  onReconnect?: () => void;
  onMobileMenuToggle?: () => void;
}

function getStatusConfig(
  status: ConnectionState,
  t: (key: string) => string
): StatusConfig {
  const configs: Record<ConnectionState, StatusConfig> = {
    connected: {
      icon: Wifi,
      color: "text-status-success",
      labelKey: "connected",
      isClickable: false,
    },
    connecting: {
      icon: Loader2,
      color: "text-status-warning",
      labelKey: "connecting",
      isClickable: false,
    },
    disconnected: {
      icon: WifiOff,
      color: "text-status-error",
      labelKey: "disconnected",
      isClickable: true,
    },
    reconnecting: {
      icon: RefreshCw,
      color: "text-status-warning",
      labelKey: "reconnecting",
      isClickable: true,
    },
  };

  return configs[status];
}

const TopBar = memo(function TopBar({
  version,
  hasUpdate = false,
  onCliClick,
  onReconnect,
  onMobileMenuToggle,
}: TopBarProps) {
  const t = useTranslations("topbar");

  const connectionStatus = useIDEStore((state) => state.gateway.status);
  const storeVersion = useIDEStore((state) => state.data.version);
  const initGateway = useIDEStore((state) => state.initGateway);

  const effectiveVersion = version ?? storeVersion;

  const responsive = useResponsive();

  const { icon: StatusIcon, color, labelKey, isClickable } = getStatusConfig(
    connectionStatus,
    t
  );
  const label = t(labelKey);

  const handleStatusClick = () => {
    if (isClickable && onReconnect) {
      onReconnect();
    }
    if (isClickable && !onReconnect) {
      initGateway();
    }
  };

  return (
    <header
      className="flex items-center justify-between h-[var(--topbar-height)] p-6 bg-bg-secondary border-b border-border-primary select-none shrink-0"
      style={{ height: "var(--topbar-height)" }}
      role="banner"
      data-testid="topbar"
    >
      {/* Left Section - Logo + Hamburger (mobile) + Connection Status */}
      <div className="flex items-center gap-3">
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
            OpenClaw
          </span>
          <span className="hidden text-[11px] uppercase tracking-[0.14em] text-text-muted sm:inline">
            IDE
          </span>
        </div>

        <div
          className={`hidden md:flex items-center gap-1.5 text-[11px] ${color} ${isClickable ? "cursor-pointer transition-colors hover:text-text-primary" : ""}`}
          onClick={handleStatusClick}
          title={isClickable ? t("clickToReconnect") : undefined}
          role={isClickable ? "button" : undefined}
          tabIndex={isClickable ? 0 : undefined}
          onKeyDown={(e) => {
            if (isClickable && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              handleStatusClick();
            }
          }}
        >
          <StatusIcon
            size={13}
            className={
              connectionStatus === "connecting" ||
              connectionStatus === "reconnecting"
                ? "animate-spin"
                : ""
            }
          />
          <span className="hidden uppercase tracking-[0.12em] lg:inline">
            {label}
          </span>
        </div>
      </div>

      {/* Center Section */}
      <div className="flex-1" />

      {/* Right Section - Version & Actions */}
      <div className="flex items-center gap-2">
        {hasUpdate && (
          <button
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-text-warning transition-colors hover:bg-bg-hover hover:text-text-primary"
            title={t("updateAvailable")}
          >
            <Download size={12} />
            <span className="hidden sm:inline">{t("updateAvailable")}</span>
          </button>
        )}

        <button
          className="hidden sm:flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
          title={t("cliCommands")}
          onClick={onCliClick}
        >
          <Terminal size={14} />
          <span className="hidden md:inline">CLI</span>
        </button>

        <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-muted">
          <Info size={12} className="hidden sm:block opacity-70" />
          <span>v{effectiveVersion}</span>
        </div>
      </div>
    </header>
  );
});

export default TopBar;
