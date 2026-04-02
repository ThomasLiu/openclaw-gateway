export type RightPanelTabId =
  | 'logs'
  | 'agentRequest'
  | 'scheduledTasks'
  | 'skills'
  | 'mcpServices'
  | 'subagent'
  | 'modelManagement'
  | 'workspace'
  | 'agent';

export const RIGHT_PANEL_TABS: ReadonlyArray<{ id: RightPanelTabId; label: string }> = [
  { id: 'logs', label: '日志' },
  { id: 'agentRequest', label: 'Agent 请求' },
  { id: 'scheduledTasks', label: '定时任务' },
  { id: 'skills', label: 'Skill' },
  { id: 'mcpServices', label: 'MCP' },
  { id: 'subagent', label: 'Subagent' },
  { id: 'modelManagement', label: '模型管理' },
  { id: 'workspace', label: '工作区' },
  { id: 'agent', label: 'agent信息' },
];
