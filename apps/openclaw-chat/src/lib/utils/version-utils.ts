// ============================================================
// OpenClaw Chat - 版本工具函数
// 提供版本比较和版本相关的工具函数
// ============================================================

/**
 * 版本比较函数
 * @param version1 版本号1
 * @param version2 版本号2
 * @returns 1: version1 > version2, -1: version1 < version2, 0: 相等
 */
export function compareVersions(version1: string, version2: string): number {
  const v1 = version1.replace(/^v/, '').split('.').map(Number);
  const v2 = version2.replace(/^v/, '').split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}
