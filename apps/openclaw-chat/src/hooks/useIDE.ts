// ============================================================
// OpenClaw Chat - IDE Store 便捷 Hooks
// 从 Zustand Store 导出的类型安全的便捷 hooks
// ============================================================

import { useIDEStore, type IDEState } from '../store';
import type {
  RightSidebarTab,
  LogLevel,
  PreferredLanguage,
} from '../store';
import type { ConnectionState } from '../types';

// ==================== Gateway Hooks ====================

/**
 * 获取 Gateway 连接状态（完整对象）
 * @returns Gateway 状态对象
 * 
 * @example
 * const { status, url, lastError } = useGatewayStatus();
 */
export function useGatewayStatus() {
  return useIDEStore((state) => state.gateway);
}

/**
 * 获取 Gateway 连接状态枚举值
 * @returns 连接状态: 'connected' | 'connecting' | 'disconnected' | 'reconnecting'
 */
export function useGatewayConnectionStatus(): ConnectionState {
  return useIDEStore((state) => state.gateway.status);
}

/**
 * 检查 Gateway 是否已连接
 * @returns 是否已连接
 */
export function useIsGatewayConnected(): boolean {
  return useIDEStore((state) => state.gateway.status === 'connected');
}

/**
 * 获取 Gateway 重连计数
 * @returns 重连次数
 */
export function useReconnectCount(): number {
  return useIDEStore((state) => state.gateway.reconnectCount);
}

// ==================== Selection Hooks ====================

/**
 * 获取当前选中的 Agent ID
 * @returns Agent ID 或 null
 */
export function useSelectedAgentId(): string | null {
  return useIDEStore((state) => state.selection.agentId);
}

/**
 * 获取当前选中的 Session ID
 * @returns Session ID 或 null
 */
export function useSelectedSessionId(): string | null {
  return useIDEStore((state) => state.selection.sessionId);
}

/**
 * 获取选择状态（完整对象，包含 agentId 和 sessionId）
 * @returns 选择状态对象
 */
export function useSelection() {
  return useIDEStore((state) => state.selection);
}

/**
 * 检查是否已选中 Agent 和 Session
 * @returns { hasAgent, hasSession }
 */
export function useSelectionState(): { hasAgent: boolean; hasSession: boolean } {
  return useIDEStore((state) => ({
    hasAgent: state.selection.agentId !== null,
    hasSession: state.selection.sessionId !== null,
  }));
}

// ==================== Layout Hooks ====================

/**
 * 获取布局状态（完整对象）
 * @returns 布局状态对象
 */
export function useLayout() {
  return useIDEStore((state) => state.layout);
}

/**
 * 获取左侧栏可见性和宽度
 * @returns { visible, width }
 */
export function useLeftSidebar() {
  return useIDEStore((state) => ({
    visible: state.layout.leftSidebarVisible,
    width: state.layout.leftSidebarWidth,
  }));
}

/**
 * 获取右侧栏可见性、宽度和激活 Tab
 * @returns { visible, width, activeTab }
 */
export function useRightSidebar() {
  return useIDEStore((state) => ({
    visible: state.layout.rightSidebarVisible,
    width: state.layout.rightSidebarWidth,
    activeTab: state.layout.rightSidebarActiveTab,
  }));
}

/**
 * 获取右侧面板当前激活的 Tab
 * @returns 当前激活的 Tab 名称
 */
export function useRightSidebarActiveTab(): RightSidebarTab {
  return useIDEStore((state) => state.layout.rightSidebarActiveTab);
}

/**
 * 获取日志面板展开状态
 * @returns 是否展开
 */
export function useLogPanelExpanded(): boolean {
  return useIDEStore((state) => state.layout.logPanelExpanded);
}

/**
 * 检查是否显示侧边栏（任一侧边栏可见时返回 true）
 * @returns 是否有侧边栏显示
 */
export function useHasSidebarVisible(): boolean {
  return useIDEStore((state) => 
    state.layout.leftSidebarVisible || state.layout.rightSidebarVisible
  );
}

// ==================== Log Filter Hooks ====================

/**
 * 获取日志过滤状态（完整对象）
 * @returns 日志过滤器配置
 */
export function useLogFilters() {
  return useIDEStore((state) => state.logFilters);
}

/**
 * 获取日志级别过滤列表
 * @returns 当前选中的日志级别数组
 */
export function useLogLevels(): LogLevel[] {
  return useIDEStore((state) => state.logFilters.levels);
}

/**
 * 获取日志来源过滤列表
 * @returns 当前选中的来源数组
 */
export function useLogSources(): string[] {
  return useIDEStore((state) => state.logFilters.sources);
}

/**
 * 获取日志搜索关键词
 * @returns 搜索关键词
 */
export function useLogSearchQuery(): string {
  return useIDEStore((state) => state.logFilters.searchQuery);
}

// ==================== Input Hooks ====================

/**
 * 获取输入框状态（完整对象）
 * @returns 输入框状态对象
 */
export function useInputState() {
  return useIDEStore((state) => state.input);
}

/**
 * 获取偏好语言设置
 * @returns 当前偏好语言
 */
export function usePreferredLanguage(): PreferredLanguage {
  return useIDEStore((state) => state.input.preferredLanguage);
}

/**
 * 获取指定 session 的模型覆盖
 * @param sessionId Session ID
 * @returns 覆盖的模型名称或 undefined
 */
export function useSessionModel(sessionId: string): string | undefined {
  return useIDEStore((state) => state.input.modelOverride[sessionId]);
}

/**
 * 获取指定 session 的输入历史
 * @param sessionId Session ID
 * @returns 输入历史数组
 */
export function useInputHistory(sessionId: string): string[] {
  return useIDEStore(
    (state) => state.input.history[sessionId] ?? []
  );
}

// ==================== Action Hooks ====================

/**
 * 获取所有 Gateway 相关 actions
 * @returns Gateway actions 对象
 */
export function useGatewayActions() {
  return useIDEStore((state) => ({
    setGatewayStatus: state.setGatewayStatus,
    incrementReconnectCount: state.incrementReconnectCount,
    resetReconnectCount: state.resetReconnectCount,
  }));
}

/**
 * 获取所有选择相关 actions
 * @returns Selection actions 对象
 */
export function useSelectionActions() {
  return useIDEStore((state) => ({
    selectAgent: state.selectAgent,
    selectSession: state.selectSession,
    clearSelection: state.clearSelection,
  }));
}

/**
 * 获取所有布局相关 actions
 * @returns Layout actions 对象
 */
export function useLayoutActions() {
  return useIDEStore((state) => ({
    toggleLeftSidebar: state.toggleLeftSidebar,
    setLeftSidebarWidth: state.setLeftSidebarWidth,
    toggleRightSidebar: state.toggleRightSidebar,
    setRightSidebarWidth: state.setRightSidebarWidth,
    setRightSidebarTab: state.setRightSidebarTab,
    toggleLogPanel: state.toggleLogPanel,
    resetLayout: state.resetLayout,
  }));
}

/**
 * 获取所有日志过滤相关 actions
 * @returns Log filter actions 对象
 */
export function useLogFilterActions() {
  return useIDEStore((state) => ({
    setLogLevels: state.setLogLevels,
    toggleLogLevel: state.toggleLogLevel,
    setLogSources: state.setLogSources,
    addLogSource: state.addLogSource,
    removeLogSource: state.removeLogSource,
    setLogSearchQuery: state.setLogSearchQuery,
    resetLogFilters: state.resetLogFilters,
  }));
}

/**
 * 获取所有输入相关 actions
 * @returns Input actions 对象
 */
export function useInputActions() {
  return useIDEStore((state) => ({
    setSessionModel: state.setSessionModel,
    clearSessionModel: state.clearSessionModel,
    setPreferredLanguage: state.setPreferredLanguage,
    pushInputHistory: state.pushInputHistory,
    getInputHistoryForSession: state.getInputHistoryForSession,
    clearInputHistory: state.clearInputHistory,
  }));
}

// ==================== 组合 Hooks ====================

/**
 * 获取当前选中 Agent 的 Sessions 列表
 * 注意：此 hook 需要配合数据层使用，这里仅返回选择状态
 * 实际的 sessions 数据需要从 data 层获取
 * 
 * @returns { agentId, sessionId } 当前选择信息
 * 
 * @example
 * // 在组件中使用
 * const { agentId, sessionId } = useCurrentSelection();
 * 
 * // 结合数据层获取 sessions
 * const { data: sessions } = useSessions(agentId);
 */
export function useCurrentSelection() {
  return useIDEStore((state) => ({
    agentId: state.selection.agentId,
    sessionId: state.selection.sessionId,
  }));
}

/**
 * 获取当前会话的完整上下文信息
 * 包括：选择状态、布局、输入历史等
 * 
 * @returns 会话上下文对象
 */
export function useSessionContext() {
  return useIDEStore((state) => ({
    agentId: state.selection.agentId,
    sessionId: state.selection.sessionId,
    modelOverride: state.selection.sessionId 
      ? state.input.modelOverride[state.selection.sessionId] 
      : undefined,
    preferredLanguage: state.input.preferredLanguage,
    inputHistory: state.selection.sessionId 
      ? (state.input.history[state.selection.sessionId] ?? [])
      : [],
    rightSidebarTab: state.layout.rightSidebarActiveTab,
  }));
}

/**
 * 获取应用的整体状态概览
 * 用于调试或状态展示组件
 * 
 * @returns 应用状态摘要
 */
export function useAppStateSummary() {
  return useIDEStore((state) => ({
    gatewayStatus: state.gateway.status,
    hasSelectedAgent: state.selection.agentId !== null,
    hasSelectedSession: state.selection.sessionId !== null,
    leftSidebarOpen: state.layout.leftSidebarVisible,
    rightSidebarOpen: state.layout.rightSidebarVisible,
    logPanelOpen: state.layout.logPanelExpanded,
    activeRightTab: state.layout.rightSidebarActiveTab,
    reconnectCount: state.gateway.reconnectCount,
  }));
}

// ==================== 便捷导出 ====================

/**
 * 完整的 store hook（直接访问整个 store）
 * 注意：谨慎使用，可能导致不必要的重渲染
 * 推荐使用上面的细粒度 hooks
 * 
 * @returns 完整的 IDEState
 */
export function useIDE(): IDEState {
  return useIDEStore();
}
