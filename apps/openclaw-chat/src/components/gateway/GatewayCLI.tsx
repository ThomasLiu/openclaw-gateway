// ============================================================
// OpenClaw Chat - GatewayCLI 组件
// 显示 Gateway 对应的 CLI 快捷指令按钮
// ============================================================

"use client";

import React from "react";
import { Terminal } from "lucide-react";
import { useTranslations } from "next-intl";

interface GatewayCLIProps {
  /** 点击 CLI 按钮的回调 */
  onCliClick?: () => void;
}

/**
 * GatewayCLI 组件
 * 显示 Gateway 对应的 CLI 快捷指令按钮
 */
export function GatewayCLI({ onCliClick }: GatewayCLIProps) {
  const t = useTranslations("topbar");

  return (
    <button
      className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:text-text-primary"
      title={t("cliCommands")}
      onClick={onCliClick}
    >
      <Terminal size={14} />
    </button>
  );
}
