'use client';

import { RIGHT_PANEL_TABS, type RightPanelTabId } from './right-panel/types';
import { RightPanelTabBar } from './RightPanelTabBar';
import { LogsTabContent } from './right-panel/LogsTabContent';
import { AgentRequestLogsTabContent } from './right-panel/AgentRequestLogsTabContent';
import { SkillsTabContent } from './right-panel/SkillsTabContent';
import { ModelManagementTabContent } from './right-panel/ModelManagementTabContent';
import { ScheduledTasksTabContent } from './right-panel/ScheduledTasksTabContent';
import { McpServicesTabContent } from './right-panel/McpServicesTabContent';
import { SubagentTabContent } from './right-panel/SubagentTabContent';
import { WorkspaceExplorerTabContent } from './right-panel/WorkspaceExplorerTabContent';
import { AgentTabContent } from './right-panel/AgentTabContent';

interface OpenClawLogsPanelProps {
  agentId: string;
  sessionKey?: string;
  activeTab: string;
  onClose: () => void;
  onTabChange: (tabId: string) => void;
}

export function OpenClawLogsPanel({ agentId, sessionKey, activeTab, onTabChange }: OpenClawLogsPanelProps) {
  const tabId = activeTab as RightPanelTabId;

  return (
    <aside className="w-72 flex-shrink-0 bg-zinc-900 border-l border-zinc-800 flex flex-col min-w-0 overflow-hidden">
      <RightPanelTabBar tabs={RIGHT_PANEL_TABS} activeTab={tabId} onTabChange={onTabChange} />

      <div className="flex-1 min-h-0 overflow-hidden">
        {tabId === 'logs' && <LogsTabContent agentId={agentId} />}
        {tabId === 'skills' && <SkillsTabContent agentId={agentId} />}
        {tabId === 'modelManagement' && <ModelManagementTabContent agentId={agentId} />}
        {tabId === 'scheduledTasks' && <ScheduledTasksTabContent agentId={agentId} />}
        {tabId === 'mcpServices' && <McpServicesTabContent />}
        {tabId === 'agentRequest' && <AgentRequestLogsTabContent agentId={agentId} />}
        {tabId === 'subagent' && <SubagentTabContent agentId={agentId} sessionKey={sessionKey} />}
        {tabId === 'workspace' && <WorkspaceExplorerTabContent agentId={agentId} />}
        {tabId === 'agent' && <AgentTabContent agentId={agentId} />}
      </div>
    </aside>
  );
}
