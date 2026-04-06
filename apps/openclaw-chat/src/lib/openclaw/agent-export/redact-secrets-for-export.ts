/**
 * redact-secrets-for-export.ts
 * 敏感字段脱敏工具
 *
 * 用于 Agent 导出前将敏感字段替换为占位符
 */

import "server-only";

/** 敏感键名（不区分大小写匹配） */
const SECRET_KEYS = new Set([
  "apikey",
  "api_key",
  "apikey",
  "token",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "password",
  "passwd",
  "secret",
  "clientsecret",
  "client_secret",
  "privatekey",
  "private_key",
  "credential",
  "credentials",
  "authkey",
  "auth_key",
  "bearer",
]);

function isSecretKey(key: string): boolean {
  return SECRET_KEYS.has(key.toLowerCase());
}

/** 脱敏占位符前缀 */
export const REDACTED_PLACEHOLDER = "__OPENCLAW_IMPORT_REQUIRED__";

/** 脱敏占位符 ID 生成器 */
let _secretIdCounter = 0;
function nextSecretId(): string {
  _secretIdCounter++;
  return `secret-${_secretIdCounter.toString().padStart(4, "0")}`;
}

export interface SecretRequiredEntry {
  /** 脱敏后的占位符 ID */
  id: string;
  /** JSON 路径（用 . 分隔数组索引） */
  jsonPath: string;
  /** 可读标签（用于 UI 提示用户填写什么） */
  label: string;
  /** 敏感字段种类 */
  kind: "apiKey" | "token" | "password" | "secret" | "other";
  /** 是否必填 */
  required: boolean;
}

/**
 * 深度脱敏对象，替换敏感字段为占位符
 *
 * @param obj 要脱敏的对象
 * @param path 当前路径（用于生成 jsonPath）
 * @returns 脱敏后的对象副本
 */
export function redactSecretsForExport(
  obj: unknown,
  path = ""
): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return obj;
  }

  if (typeof obj === "number" || typeof obj === "boolean") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item, idx) =>
      redactSecretsForExport(item, `${path}[${idx}]`)
    );
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    const record = obj as Record<string, unknown>;

    for (const key of Object.keys(record)) {
      const value = record[key];
      const currentPath = path ? `${path}.${key}` : key;

      if (isSecretKey(key) && value !== undefined && value !== null) {
        // 脱敏：替换为占位符，并记录到 secrets-required.json
        const secretId = nextSecretId();
        result[key] = `${REDACTED_PLACEHOLDER}:${secretId}`;

        // 记录脱敏信息
        _secretPaths.push({
          id: secretId,
          jsonPath: currentPath,
          label: guessLabel(key),
          kind: guessKind(key),
          required: true,
        });
      } else {
        result[key] = redactSecretsForExport(value, currentPath);
      }
    }

    return result;
  }

  return obj;
}

/** 全局脱敏记录（每次 redactSecretsForExport 调用时清空） */
let _secretPaths: SecretRequiredEntry[] = [];

export function resetSecretIdCounter(): void {
  _secretIdCounter = 0;
  _secretPaths = [];
}

/**
 * 脱敏并返回 secrets-required.json 数据
 */
export function redactWithSecretsList(obj: unknown): {
  redacted: unknown;
  secrets: SecretRequiredEntry[];
} {
  resetSecretIdCounter();
  const redacted = redactSecretsForExport(obj);
  return { redacted, secrets: [..._secretPaths] };
}

function guessLabel(key: string): string {
  const lower = key.toLowerCase();
  if (lower.includes("api")) return "API 密钥";
  if (lower.includes("token") || lower.includes("bearer")) return "访问令牌";
  if (lower.includes("password") || lower.includes("passwd")) return "密码";
  if (lower.includes("secret")) return "密钥";
  return `密钥字段 (${key})`;
}

function guessKind(key: string): SecretRequiredEntry["kind"] {
  const lower = key.toLowerCase();
  if (lower.includes("api")) return "apiKey";
  if (lower.includes("token") || lower.includes("bearer")) return "token";
  if (lower.includes("password") || lower.includes("passwd")) return "password";
  if (lower.includes("secret")) return "secret";
  return "other";
}
