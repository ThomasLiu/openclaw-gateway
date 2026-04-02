import { describe, expect, it } from 'vitest';
import {
  parseApiImageAttachmentsFromJson,
  chatAttachmentsToApi,
} from './chat-attachment';
import type { UiAttachment } from '@/components/chat-types';

describe('parseApiImageAttachmentsFromJson', () => {
  it('returns empty array for null/undefined', () => {
    expect(parseApiImageAttachmentsFromJson(null)).toEqual([]);
    expect(parseApiImageAttachmentsFromJson(undefined)).toEqual([]);
    expect(parseApiImageAttachmentsFromJson(42)).toEqual([]);
  });

  it('parses attachments from { attachments: [...] } shape', () => {
    const raw = {
      attachments: [
        { type: 'image', mimeType: 'image/png', content: 'iVBORw0KGgoAAAANSUhEUg==' },
        { type: 'image', mimeType: 'image/jpeg', content: '/9j/4AAQSkZJRg==' },
      ],
    };
    const result = parseApiImageAttachmentsFromJson(raw);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('image');
    expect(result[0].mimeType).toBe('image/png');
    expect(result[0].content).toBe('iVBORw0KGgoAAAANSUhEUg==');
  });

  it('rejects non-image MIME types', () => {
    const raw = {
      attachments: [{ type: 'image', mimeType: 'text/plain', content: 'hello' }],
    };
    expect(parseApiImageAttachmentsFromJson(raw)).toHaveLength(0);
  });

  it('rejects invalid base64-like content', () => {
    const raw = {
      attachments: [{ type: 'image', mimeType: 'image/png', content: 'not-base64 at all!' }],
    };
    expect(parseApiImageAttachmentsFromJson(raw)).toHaveLength(0);
  });

  it('accepts SVG+XML MIME type', () => {
    const raw = {
      attachments: [
        { type: 'image', mimeType: 'image/svg+xml', content: 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvIg==' },
      ],
    };
    const result = parseApiImageAttachmentsFromJson(raw);
    expect(result).toHaveLength(1);
    expect(result[0].mimeType).toBe('image/svg+xml');
  });

  it('parses direct array shape', () => {
    const raw = [
      { type: 'image', mimeType: 'image/png', content: 'iVBORw0KGgoAAAANSUhEUg==' },
    ];
    const result = parseApiImageAttachmentsFromJson(raw);
    expect(result).toHaveLength(1);
  });
});

describe('chatAttachmentsToApi', () => {
  it('transforms UiAttachment array to API format', () => {
    const uiAttachments: UiAttachment[] = [
      { type: 'image', mimeType: 'image/png', content: 'iVBORw0KGgoAAAANSUhEUg==' },
    ];
    const result = chatAttachmentsToApi(uiAttachments);
    expect(result).toEqual([{ type: 'image', mimeType: 'image/png', content: 'iVBORw0KGgoAAAANSUhEUg==' }]);
  });

  it('filters out non-image attachments', () => {
    const uiAttachments: UiAttachment[] = [
      { type: 'image', mimeType: 'image/png', content: 'iVBORw0KGgoAAAANSUhEUg==' },
      { type: 'image', mimeType: 'image/gif', content: 'R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==' },
    ];
    const result = chatAttachmentsToApi(uiAttachments);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('image');
  });

  it('returns empty array for empty input', () => {
    expect(chatAttachmentsToApi([])).toEqual([]);
  });
});
