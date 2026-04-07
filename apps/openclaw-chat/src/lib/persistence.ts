// ============================================================
// OpenClaw Chat - localStorage 持久化工具
// ============================================================

/** UI 状态默认值 */
export const DEFAULT_UI_STATE = {
  selectedAgentId: null as string | null,
  selectedSessionId: null as string | null,
  leftSidebarVisible: true,
  leftSidebarWidth: 280,
  rightSidebarVisible: true,
  rightSidebarWidth: 360,
  rightSidebarActiveTab: 'config' as const,
  logPanelExpanded: false,
  logFilters: {
    levels: ['error', 'warn', 'info'] as string[],
    sources: [] as string[],
    searchQuery: '',
  },
  inputModelOverride: {} as Record<string, string>,
  preferredLanguage: 'auto' as const,
} as const;

export type DefaultUIState = typeof DEFAULT_UI_STATE;

/** localStorage 键名前缀 */
const STORAGE_PREFIX = 'openclaw_ui_';

/** 输入历史存储键名前缀 */
const INPUT_HISTORY_PREFIX = 'openclaw_input_history_';

/**
 * 获取完整的 localStorage key
 */
function getStorageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

/**
 * 获取输入历史存储 key
 */
function getInputHistoryKey(sessionId: string): string {
  return `${INPUT_HISTORY_PREFIX}${sessionId}`;
}

/**
 * 安全地从 localStorage 读取 JSON
 */
function safeGetJSON<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[Persistence] Failed to parse localStorage key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * 安全地向 localStorage 写入 JSON
 */
function safeSetJSON(key: string, value: unknown): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[Persistence] Failed to write localStorage key "${key}":`, error);
    
    // 可能是存储空间已满，尝试清理旧数据
    if (error instanceof DOMException && (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      console.warn('[Persistence] Storage quota exceeded, consider clearing old data');
    }
    
    return false;
  }
}

// ==================== 公共 API ====================

/**
 * 读取 UI 状态
 * @param key 状态键名（不含前缀）
 * @param defaultValue 默认值
 * @returns 存储的值或默认值
 */
export function getUIState<K extends keyof DefaultUIState>(
  key: K,
  defaultValue?: DefaultUIState[K]
): DefaultUIState[K] {
  const storageKey = getStorageKey(key);
  const fallback = defaultValue ?? DEFAULT_UI_STATE[key];
  
  return safeGetJSON<DefaultUIState[K]>(storageKey, fallback);
}

/**
 * 写入 UI 状态
 * @param key 状态键名（不含前缀）
 * @param value 要存储的值
 * @returns 是否写入成功
 */
export function setUIState<K extends keyof DefaultUIState>(
  key: K,
  value: DefaultUIState[K]
): boolean {
  const storageKey = getStorageKey(key);
  return safeSetJSON(storageKey, value);
}

/**
 * 批量读取所有 UI 状态
 * @returns 完整的 UI 状态对象
 */
export function getAllUIState(): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  
  for (const key of Object.keys(DEFAULT_UI_STATE) as (keyof DefaultUIState)[]) {
    state[key] = getUIState(key);
  }
  
  return state;
}

/**
 * 批量写入 UI 状态
 * @param partialState 部分状态对象
 * @returns 所有写入是否成功
 */
export function setAllUIState(partialState: Partial<DefaultUIState>): boolean {
  let allSuccess = true;
  
  for (const [key, value] of Object.entries(partialState) as [keyof DefaultUIState, DefaultUIState[keyof DefaultUIState]][]) {
    const success = setUIState(key, value);
    if (!success) allSuccess = false;
  }
  
  return allSuccess;
}

// ==================== 输入历史管理 ====================

/** 最大保留的历史记录条数 */
const MAX_INPUT_HISTORY_LENGTH = 100;

/**
 * 获取指定 session 的输入历史
 * @param sessionId Session ID
 * @returns 历史消息数组（最新的在末尾）
 */
export function getInputHistory(sessionId: string): string[] {
  const key = getInputHistoryKey(sessionId);
  return safeGetJSON<string[]>(key, []);
}

/**
 * 向指定 session 的输入历史追加一条消息
 * - 自动去重（连续重复的消息不会追加）
 * - 自动限制最大长度（最多保留 100 条）
 * 
 * @param sessionId Session ID
 * @param message 要追加的消息内容
 * @returns 更新后的历史数组
 */
export function pushInputHistory(sessionId: string, message: string): string[] {
  // 不保存空消息
  if (!message || message.trim().length === 0) {
    return getInputHistory(sessionId);
  }
  
  const history = getInputHistory(sessionId);
  
  // 去重：如果最后一条与当前相同，不添加
  if (history.length > 0 && history[history.length - 1] === message) {
    return history;
  }
  
  // 追加新消息
  const updated = [...history, message];
  
  // 限制最大长度（移除最旧的）
  if (updated.length > MAX_INPUT_HISTORY_LENGTH) {
    updated.splice(0, updated.length - MAX_INPUT_HISTORY_LENGTH);
  }
  
  // 保存到 localStorage
  const key = getInputHistoryKey(sessionId);
  safeSetJSON(key, updated);
  
  return updated;
}

/**
 * 清除指定 session 的输入历史
 * @param sessionId Session ID
 */
export function clearInputHistory(sessionId: string): void {
  const key = getInputHistoryKey(sessionId);
  if (typeof window !== 'undefined') {
    localStorage.removeItem(key);
  }
}

/**
 * 清除所有 session 的输入历史
 */
export function clearAllInputHistory(): void {
  if (typeof window === 'undefined') return;
  
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(INPUT_HISTORY_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

// ==================== 清理工具 ====================

/**
 * 清除所有 UI 状态（重置为默认值）
 * 注意：这不会清除输入历史，需要单独调用 clearAllInputHistory()
 */
export function clearAllUIState(): void {
  if (typeof window === 'undefined') return;
  
  // 删除所有 UI 状态相关的 key
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

/**
 * 清除所有 OpenClaw 相关的 localStorage 数据（包括 UI 状态和输入历史）
 */
export function clearAllOpenClawData(): void {
  clearAllUIState();
  clearAllInputHistory();
}

/**
 * 获取当前 localStorage 使用情况
 * @returns 存储使用信息
 */
export function getStorageUsage(): { used: number; total: number; percentage: number } | null {
  if (typeof window === 'undefined') return null;
  
  let totalSize = 0;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key) ?? '';
      totalSize += key.length + value.length;
    }
  }
  
  // 估算总容量（通常为 5MB）
  const estimatedTotal = 5 * 1024 * 1024; // 5MB in bytes
  
  return {
    used: totalSize,
    total: estimatedTotal,
    percentage: (totalSize / estimatedTotal) * 100,
  };
}
