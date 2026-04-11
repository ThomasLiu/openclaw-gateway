// ============================================================
// OpenClaw Chat - GatewayStatus 组件
// 显示 Gateway 的连接状态和名称
// ============================================================

"use client";

import React from "react";
import type { ConnectionState } from "@/types";

interface GatewayStatusProps {
  /** Gateway 连接状态 */
  status: ConnectionState;
  /** Gateway 名称 */
  name: string;
  /** 是否可点击 */
  isClickable?: boolean;
  /** 点击回调 */
  onStatusClick?: () => void;
  /** 自定义标题 */
  title?: string;
}

/**
 * GatewayStatus 组件
 * 显示 Gateway 的连接状态和名称
 */
export function GatewayStatus({
  status,
  name,
  isClickable = false,
  onStatusClick,
  title,
}: GatewayStatusProps) {
  // 根据状态获取颜色类
  const getStatusColor = (status: ConnectionState) => {
    switch (status) {
      case "connected":
        return "bg-status-success";
      case "connecting":
      case "reconnecting":
        return "bg-status-warning";
      case "disconnected":
        return "bg-status-error";
      default:
        return "bg-text-muted";
    }
  };

  const statusColor = getStatusColor(status);

  return (
    <div
      className={`hidden md:flex items-center gap-1.5 text-[11px] ${isClickable ? "cursor-pointer transition-colors hover:text-text-primary" : ""}`}
      onClick={isClickable ? onStatusClick : undefined}
      title={title}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && onStatusClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onStatusClick();
        }
      }}
    >
      <div className={`w-2 h-2 rounded-full ${statusColor}`} />
      <span className="text-text-muted">{name}</span>
    </div>
  );
}
