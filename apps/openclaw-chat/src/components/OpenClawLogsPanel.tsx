"use client";

import { RIGHT_PANEL_TABS, type RightPanelTabId } from "./right-panel/types";
import { RightPanelTabBar } from "./RightPanelTabBar";
import { LogsTabContent } from "./right-panel/LogsTabContent";
import { SkillsTabContent } from "./right-panel/SkillsTabContent";
import { ModelManagementTabContent } from "./right-panel/ModelManagementTabContent";
import { ScheduledTasksTabContent } from "./right-panel/ScheduledTasksTabContent";
import { McpServicesTabContent } from "./right-panel/McpServicesTabContent";

interface OpenClawLogsPanelProps {
  agentId: string;
  sessionKey?: string;
  activeTab: string;
  onClose: () => void;
}

export function OpenClawLogsPanel({
  agentId,
  activeTab,
}: OpenClawLogsPanelProps) {
  const tabId = activeTab as RightPanelTabId;

  return (
    <aside className="w-72 flex-shrink-0 bg-zinc-900 border-l border-zinc-800 flex flex-col min-w-0 overflow-hidden">
      <RightPanelTabBar tabs={RIGHT_PANEL_TABS} activeTab={tabId} />

      <div className="flex-1 min-h-0 overflow-hidden">
        {tabId === "logs" && <LogsTabContent agentId={agentId} />}
        {tabId === "skills" && <SkillsTabContent agentId={agentId} />}
        {tabId === "modelManagement" && <ModelManagementTabContent agentId={agentId} />}
        {tabId === "scheduledTasks" && <ScheduledTasksTabContent agentId={agentId} />}
        {tabId === "mcpServices" && <McpServicesTabContent />}
        {tabId === "agentRequest" && (
          <div className="p-3 text-sm text-zinc-500">Agent 请求日志功能开发中</div>
        )}
        {tabId === "subagent" && (
          <div className="p-3 text-sm text-zinc-500">Subagent 功能开发中</div>
        )}
        {tabId === "workspace" && (
          <div className="p-3 text-sm text-zinc-500">工作区功能开发中</div>
        )}
        {tabId === "agent" && (
          <div className="p-3 text-sm text-zinc-500">Agent 信息开发中</div>
        )}
      </div>
    </aside>
  );
}
