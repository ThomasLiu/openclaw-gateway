// ============================================================
// OpenClaw Chat - GatewayInfo 组件
// 大的容器组件，包含 Gateway 状态、版本号和更新、CLI 快捷指令
// ============================================================

"use client";

import React from "react";
import { GatewayStatus } from "./GatewayStatus";
import { GatewayVersion } from "./GatewayVersion";
import { GatewayCLI } from "./GatewayCLI";
import type { ConnectionState } from "@/types";

interface GatewayInfoProps {
  /** Gateway 连接状态 */
  status: ConnectionState;
  /** Gateway 名称 */
  name: string;
  /** Gateway 版本号 */
  version: string;
  /** 是否有更新 */
  hasUpdate?: boolean;
  /** 是否可点击 */
  isClickable?: boolean;
  /** 点击状态的回调 */
  onStatusClick?: () => void;
  /** 点击更新按钮的回调 */
  onUpdateClick?: () => void;
  /** 点击 CLI 按钮的回调 */
  onCliClick?: () => void;
  /** 自定义标题 */
  title?: string;
}

/**
 * GatewayInfo 组件
 * 大的容器组件，包含 Gateway 状态、版本号和更新、CLI 快捷指令
 */
export function GatewayInfo({
  status,
  name,
  version,
  hasUpdate = false,
  isClickable = false,
  onStatusClick,
  onUpdateClick,
  onCliClick,
  title,
}: GatewayInfoProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Gateway 状态 */}
      <GatewayStatus
        status={status}
        name={name}
        isClickable={isClickable}
        onStatusClick={onStatusClick}
        title={title}
      />

      {/* 版本号和更新 */}
      <GatewayVersion
        version={version}
        hasUpdate={hasUpdate}
        onUpdateClick={onUpdateClick}
      />

      {/* CLI 快捷指令 */}
      <GatewayCLI onCliClick={onCliClick} />
    </div>
  );
}
