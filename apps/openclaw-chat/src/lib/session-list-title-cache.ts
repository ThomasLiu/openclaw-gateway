/**
 * 会话列表标题缓存
 *
 * 缓存会话标题，避免重复计算
 * 支持 pending 发送预览
 */

const SESSION_LIST_TITLE_CACHE_KEY = "openclaw:session:titles";

// pending 预览（未发送的消息）
const pendingTitles = new Map<string, string>();

type TitleCache = Record<string, string>;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * 读取标题缓存
 */
export function readSessionListTitleCache(): TitleCache {
  if (!isBrowser()) return {};

  try {
    const raw = localStorage.getItem(SESSION_LIST_TITLE_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as TitleCache;
  } catch {
    return {};
  }
}

/**
 * 写入标题缓存
 */
export function writeSessionListTitleCache(titles: TitleCache): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(SESSION_LIST_TITLE_CACHE_KEY, JSON.stringify(titles));
  } catch {
    // localStorage 满
  }
}

/**
 * 获取缓存的会话标题（包含 pending 预览）
 */
export function getSessionTitle(sessionKey: string): string | null {
  const cached = readSessionListTitleCache();

  // 优先返回 pending 预览
  const pending = pendingTitles.get(sessionKey);
  if (pending) {
    return `${pending}（发送中...）`;
  }

  return cached[sessionKey] ?? null;
}

/**
 * 设置会话标题缓存
 */
export function setSessionTitle(sessionKey: string, title: string): void {
  const cached = readSessionListTitleCache();
  writeSessionListTitleCache({ ...cached, [sessionKey]: title });
}

/**
 * 设置 pending 发送预览（显示在标题中）
 */
export function setPendingTitle(sessionKey: string, preview: string): void {
  pendingTitles.set(sessionKey, preview.slice(0, 100)); // 最多 100 字符
}

/**
 * 清除 pending 预览
 */
export function clearPendingTitle(sessionKey: string): void {
  pendingTitles.delete(sessionKey);
}

/**
 * 清除所有标题缓存
 */
export function clearSessionListTitleCache(): void {
  pendingTitles.clear();
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(SESSION_LIST_TITLE_CACHE_KEY);
  } catch {
    // ignore
  }
}
