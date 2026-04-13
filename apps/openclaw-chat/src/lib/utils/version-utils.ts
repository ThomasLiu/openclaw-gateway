// ============================================================
// OpenClaw Chat - 版本工具函数
// 提供版本比较和版本相关的工具函数
// ============================================================

/**
 * 清理版本字符串格式
 * @param version 原始版本字符串
 * @returns 清理后的版本字符串
 */
export function cleanVersion(version: string): string {
  // 移除前缀（如 "OpenClaw "）
  // 移除后缀（如 " (beta)"）
  // 移除开头的 "v"
  return version
    .replace(/^OpenClaw\s*/i, '')
    .replace(/\s*\(.*\)$/, '')
    .replace(/^v/, '')
    .trim();
}

/**
 * 版本比较函数
 * @param version1 版本号1
 * @param version2 版本号2
 * @returns 1: version1 > version2, -1: version1 < version2, 0: 相等
 */
export function compareVersions(version1: string, version2: string): number {
  try {
    // 清理版本字符串
    const cleanV1 = cleanVersion(version1);
    const cleanV2 = cleanVersion(version2);
    
    // 分割并转换为数字
    const v1 = cleanV1.split('.').map(Number);
    const v2 = cleanV2.split('.').map(Number);
    
    // 过滤掉非数字部分
    const validV1 = v1.filter(num => !isNaN(num));
    const validV2 = v2.filter(num => !isNaN(num));
    
    // 如果无法解析版本号，视为相等
    if (validV1.length === 0 || validV2.length === 0) {
      console.warn('[Version Check] Invalid version format:', version1, version2);
      return 0;
    }
    
    // 逐位比较
    for (let i = 0; i < Math.max(validV1.length, validV2.length); i++) {
      const num1 = validV1[i] || 0;
      const num2 = validV2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  } catch (error) {
    console.error('[Version Check] Error comparing versions:', error);
    return 0;
  }
}
