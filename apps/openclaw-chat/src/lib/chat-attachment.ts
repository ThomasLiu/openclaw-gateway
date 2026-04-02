/**
 * Chat attachment parsing and transformation.
 *
 * Handles image attachments sent via the /api/chat POST endpoint:
 * - Parses base64 + MIME type from gateway messages
 * - Transforms to the API format expected by OpenClaw gateway
 */
import type { UiAttachment } from '@/components/chat-types';

// ─── Parsing ─────────────────────────────────────────────────────────────────

/**
 * Parse image attachments from a gateway message JSON payload.
 * Validates MIME type and base64 encoding.
 */
export function parseApiImageAttachmentsFromJson(
  raw: unknown
): UiAttachment[] {
  if (!raw || typeof raw !== 'object') return [];

  const obj = raw as Record<string, unknown>;

  // Check common attachment shapes from gateway
  const attachments: UiAttachment[] = [];

  // Shape: { attachments: [{ type: 'image', mimeType, content }] }
  const rawAttachments = obj.attachments;
  if (Array.isArray(rawAttachments)) {
    for (const item of rawAttachments) {
      if (!item || typeof item !== 'object') continue;
      const a = item as Record<string, unknown>;
      if (a.type === 'image' && typeof a.mimeType === 'string' && typeof a.content === 'string') {
        if (isValidBase64(a.content) && isValidMimeType(a.mimeType)) {
          attachments.push({
            type: 'image',
            mimeType: a.mimeType,
            content: a.content,
            alt: typeof a.alt === 'string' ? a.alt : undefined,
          });
        }
      }
    }
  }

  // Shape: [{ type: 'image', mimeType, content }] (direct array)
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const a = item as Record<string, unknown>;
      if (a.type === 'image' && typeof a.mimeType === 'string' && typeof a.content === 'string') {
        if (isValidBase64(a.content) && isValidMimeType(a.mimeType)) {
          attachments.push({
            type: 'image',
            mimeType: a.mimeType,
            content: a.content,
            alt: typeof a.alt === 'string' ? a.alt : undefined,
          });
        }
      }
    }
  }

  return attachments;
}

// ─── API transformation ────────────────────────────────────────────────────────

/**
 * Transform UI attachment format to the API format expected by OpenClaw gateway.
 * Sends as { type: 'image', mimeType, content: base64 } in POST /api/chat body.
 */
export interface ApiImageAttachment {
  type: 'image';
  mimeType: string;
  content: string;
}

export function chatAttachmentsToApi(attachments: UiAttachment[]): ApiImageAttachment[] {
  return attachments
    .filter((a): a is UiAttachment & { content: string } => a.type === 'image' && typeof a.content === 'string')
    .map((a) => ({
      type: 'image' as const,
      mimeType: a.mimeType,
      content: a.content,
    }));
}

// ─── Validation helpers ────────────────────────────────────────────────────────

const VALID_MIME_PREFIXES = ['image/'];

const KNOWN_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
  'image/gif': 'image/gif',
  'image/webp': 'image/webp',
  'image/svg+xml': 'image/svg+xml',
};

function isValidMimeType(mime: string): boolean {
  if (!mime || typeof mime !== 'string') return false;
  // Must be a known image MIME type
  return mime in KNOWN_IMAGE_TYPES || VALID_MIME_PREFIXES.some((p) => mime.startsWith(p));
}

function isValidBase64(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  try {
    return /^[A-Za-z0-9+/=]{4,}$/.test(str.trim());
  } catch {
    return false;
  }
}
