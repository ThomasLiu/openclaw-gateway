/**
 * Redact secrets from an OpenClaw config object before export.
 *
 * Known secret keys are replaced with `__OPENCLAW_IMPORT_REQUIRED__:<id>` placeholders.
 * A companion `secrets-required.json` lists every placeholder with its id, jsonPath, label, kind, and required flag.
 *
 * The `id` is generated from the full JSON path so each placeholder is unique.
 */

export interface SecretRequiredEntry {
  id: string;
  jsonPath: string; // dot-notation path from root
  label: string;
  kind: string;
  required: boolean;
}

/** Keys whose values are considered secret / should be redacted */
const SECRET_KEYS = new Set<string>([
  'apiKey',
  'api_key',
  'apiSecret',
  'api_secret',
  'token',
  'password',
  'secret',
  'privateKey',
  'private_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authToken',
  'bearer',
  'clientSecret',
  'client_secret',
  'encryptionKey',
  'encryption_key',
  'hmacKey',
  'hmac_key',
  'signingKey',
  'signing_key',
  'webhookSecret',
  'webhook_secret',
]);

/** Secret-related key suffixes (e.g. 'key' in 'openaiKey') */
const SECRET_SUFFIXES = ['key', 'secret', 'token', 'password', 'credential', 'auth'];

function isSecretKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (SECRET_KEYS.has(key)) return true;
  // Check suffix match
  for (const suffix of SECRET_SUFFIXES) {
    if (lower.endsWith(suffix)) return true;
  }
  return false;
}

function buildPath(parts: (string | number)[]): string {
  return parts
    .map((p, i) => {
      const isIndex = typeof p === 'number';
      return isIndex ? `[${p}]` : i === 0 ? p : `.${p}`;
    })
    .join('');
}

function buildEntryId(jsonPath: string): string {
  // Use a simple hash-like slug from the path
  return jsonPath.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}

function inferLabel(key: string, path: string): string {
  // Derive a human-readable label from the key/path
  const parts = path.split('.');
  const last = parts[parts.length - 1]!;
  // Remove array indices
  const readable = last.replace(/\[.*?\]/g, '');
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

function inferKind(value: unknown): string {
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'string';
}

function inferRequired(value: unknown): boolean {
  // Non-empty strings are required; empty/null are optional
  return typeof value === 'string' && value.length > 0;
}

/**
 * Deep-traverse the config object, collecting and redacting secrets.
 * Returns a redacted copy and a list of SecretRequiredEntry.
 */
export function redactSecretsForExport(
  obj: unknown,
  pathParts: (string | number)[] = []
): { redacted: unknown; secrets: SecretRequiredEntry[] } {
  if (obj === null || obj === undefined) {
    return { redacted: obj, secrets: [] };
  }

  if (Array.isArray(obj)) {
    const items = obj.map((item, i) => {
      const { redacted: r } = redactSecretsForExport(item, [...pathParts, i]);
      return r;
    });
    const allSecrets: SecretRequiredEntry[] = [];
    obj.forEach((_, i) => {
      const { secrets: s } = redactSecretsForExport(obj[i], [...pathParts, i]);
      allSecrets.push(...s);
    });
    return { redacted: items, secrets: allSecrets };
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    const allSecrets: SecretRequiredEntry[] = [];

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const currentPath = [...pathParts, key];
      const jsonPath = buildPath(currentPath);

      if (isSecretKey(key) && typeof value === 'string' && value.length > 0) {
        const id = buildEntryId(jsonPath);
        result[key] = `__OPENCLAW_IMPORT_REQUIRED__:${id}`;
        allSecrets.push({
          id,
          jsonPath,
          label: inferLabel(key, jsonPath),
          kind: inferKind(value),
          required: inferRequired(value),
        });
      } else if (typeof value === 'object' && value !== null) {
        const { redacted: r, secrets: s } = redactSecretsForExport(value, currentPath);
        result[key] = r;
        allSecrets.push(...s);
      } else {
        result[key] = value;
      }
    }

    return { redacted: result, secrets: allSecrets };
  }

  return { redacted: obj, secrets: [] };
}
