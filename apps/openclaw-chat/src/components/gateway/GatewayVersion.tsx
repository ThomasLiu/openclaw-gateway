// ============================================================
// OpenClaw Chat - GatewayVersion 组件
// 显示 Gateway 的版本号和更新状态
// ============================================================

"use client";

import React from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

interface GatewayVersionProps {
  /** Gateway 版本号 */
  version: string;
  /** 是否有更新 */
  hasUpdate?: boolean;
  /** 点击更新按钮的回调 */
  onUpdateClick?: () => void;
}

/**
 * GatewayVersion 组件
 * 显示 Gateway 的版本号和更新状态
 */
export function GatewayVersion({
  version,
  hasUpdate = false,
  onUpdateClick,
}: GatewayVersionProps) {
  const t = useTranslations("topbar");

  // 清理版本号格式
  const cleanVersion = version.replace(/^OpenClaw\s*|\s*\(.*\)$/g, "");

  return (
    <div className="hidden md:flex items-center gap-2">
      {/* 版本号 */}
      <span className="text-text-muted text-[11px]">
        v{cleanVersion}
      </span>

      {/* 更新提示 */}
      {hasUpdate && onUpdateClick && (
        <button
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-text-warning transition-colors hover:bg-bg-hover hover:text-text-primary"
          title={t("updateAvailable")}
          onClick={onUpdateClick}
        >
          <Download size={12} />
          <span className="hidden sm:inline">{t("updateAvailable")}</span>
        </button>
      )}
    </div>
  );
}
