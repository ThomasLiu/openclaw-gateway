import { describe, expect, it } from 'vitest';
import {
  parseExecApprovalRequested,
  parsePluginApprovalRequested,
  parseExecApprovalResolved,
  parsePluginApprovalResolved,
  formatCommandForDisplay,
  formatExpiresIn,
} from './exec-approval-gateway';

describe('exec-approval-gateway', () => {
  describe('parseExecApprovalRequested', () => {
    it('parses a valid exec approval request', () => {
      const raw = {
        id: 'req-123',
        sessionKey: 'agent:main:chat:default',
        command: 'ls -la',
        expiresAtMs: Date.now() + 60_000,
        kind: 'exec',
        reason: 'User-initiated',
        cwd: '/home/user',
      };
      const result = parseExecApprovalRequested(raw);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('req-123');
      expect(result!.sessionKey).toBe('agent:main:chat:default');
      expect(result!.command).toBe('ls -la');
      expect(result!.kind).toBe('exec');
      expect(result!.reason).toBe('User-initiated');
      expect(result!.cwd).toBe('/home/user');
    });

    it('returns null for null input', () => {
      expect(parseExecApprovalRequested(null)).toBeNull();
    });

    it('returns null for non-object input', () => {
      expect(parseExecApprovalRequested('string')).toBeNull();
      expect(parseExecApprovalRequested(42)).toBeNull();
    });

    it('returns null when id is missing', () => {
      expect(parseExecApprovalRequested({ command: 'ls' })).toBeNull();
    });

    it('returns null when command is missing', () => {
      expect(parseExecApprovalRequested({ id: 'req-1' })).toBeNull();
    });

    it('trims whitespace from id and sessionKey', () => {
      const raw = {
        id: '  req-123  ',
        sessionKey: '  agent:main  ',
        command: 'echo hello',
        expiresAtMs: Date.now() + 60_000,
        kind: 'exec',
      };
      const result = parseExecApprovalRequested(raw);
      expect(result!.id).toBe('req-123');
      expect(result!.sessionKey).toBe('agent:main'); // sessionKey trimmed
    });

    it('defaults expiresAtMs when missing', () => {
      const raw = { id: 'req-1', command: 'ls', kind: 'exec' };
      const before = Date.now();
      const result = parseExecApprovalRequested(raw);
      expect(result!.expiresAtMs).toBeGreaterThanOrEqual(before);
      expect(result!.expiresAtMs).toBeLessThanOrEqual(Date.now() + 61_000);
    });

    it('ignores unknown fields', () => {
      const raw = {
        id: 'req-1',
        command: 'ls',
        kind: 'exec',
        expiresAtMs: Date.now() + 60_000,
        unknownField: 'ignored',
      };
      const result = parseExecApprovalRequested(raw);
      expect(result).not.toBeNull();
    });
  });

  describe('parsePluginApprovalRequested', () => {
    it('parses plugin approval and forces kind=plugin', () => {
      const raw = {
        id: 'plugin-1',
        sessionKey: 'agent:main:chat:default',
        command: 'read_file /etc/passwd',
        expiresAtMs: Date.now() + 60_000,
        kind: 'plugin',
      };
      const result = parsePluginApprovalRequested(raw);
      expect(result).not.toBeNull();
      expect(result!.kind).toBe('plugin');
    });
  });

  describe('parseExecApprovalResolved', () => {
    it('parses allow-once resolution', () => {
      const raw = { id: 'req-123', decision: 'allow-once', kind: 'exec' };
      const result = parseExecApprovalResolved(raw);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('req-123');
      expect(result!.decision).toBe('allow-once');
      expect(result!.kind).toBe('exec');
    });

    it('parses allow-always resolution', () => {
      const raw = { id: 'req-123', decision: 'allow-always', kind: 'exec' };
      const result = parseExecApprovalResolved(raw);
      expect(result!.decision).toBe('allow-always');
    });

    it('parses deny resolution', () => {
      const raw = { id: 'req-123', decision: 'deny', kind: 'exec' };
      const result = parseExecApprovalResolved(raw);
      expect(result!.decision).toBe('deny');
    });

    it('returns null for invalid decision', () => {
      expect(parseExecApprovalResolved({ id: 'req-1', decision: 'maybe', kind: 'exec' })).toBeNull();
    });

    it('returns null when id is missing', () => {
      expect(parseExecApprovalResolved({ decision: 'allow-once', kind: 'exec' })).toBeNull();
    });

    it('returns null for null input', () => {
      expect(parseExecApprovalResolved(null)).toBeNull();
    });

    it('defaults kind to exec when absent', () => {
      const raw = { id: 'req-123', decision: 'allow-once' };
      const result = parseExecApprovalResolved(raw);
      expect(result!.kind).toBe('exec');
    });
  });

  describe('parsePluginApprovalResolved', () => {
    it('parses and forces kind=plugin', () => {
      const raw = { id: 'plugin-1', decision: 'deny', kind: 'plugin' };
      const result = parsePluginApprovalResolved(raw);
      expect(result).not.toBeNull();
      expect(result!.kind).toBe('plugin');
    });
  });

  describe('formatCommandForDisplay', () => {
    it('returns command as-is when under maxLen', () => {
      expect(formatCommandForDisplay('ls -la')).toBe('ls -la');
    });

    it('truncates long commands with ellipsis', () => {
      const long = 'a'.repeat(150);
      const result = formatCommandForDisplay(long, 120);
      // maxLen=120 → 117 chars + '…' = 118 total
      expect(result.length).toBe(118);
      expect(result.endsWith('…')).toBe(true);
    });

    it('uses default maxLen of 120', () => {
      const long = 'x'.repeat(200);
      const result = formatCommandForDisplay(long);
      // default maxLen=120 → 117 chars + '…' = 118 total
      expect(result.length).toBe(118);
    });
  });

  describe('formatExpiresIn', () => {
    it('returns "已过期" when timestamp is in the past', () => {
      expect(formatExpiresIn(Date.now() - 1000)).toBe('已过期');
    });

    it('returns seconds when under 60s', () => {
      const future = Date.now() + 30_000;
      expect(formatExpiresIn(future)).toBe('剩余 30s');
    });

    it('returns minutes when under 60m', () => {
      const future = Date.now() + 120_000;
      expect(formatExpiresIn(future)).toBe('剩余 2m');
    });

    it('returns hours for long durations', () => {
      const future = Date.now() + 3 * 60 * 60 * 1000;
      expect(formatExpiresIn(future)).toBe('剩余 3h');
    });
  });
});
