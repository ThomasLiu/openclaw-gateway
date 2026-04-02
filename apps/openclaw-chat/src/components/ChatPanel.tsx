'use client';

import type { ChangeEvent, KeyboardEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { UiMessage } from './chat-types';
import { ChatMessageGroup, groupMessages } from './chat-message-group';
import { ComposerTriggerMenu } from './ComposerTriggerMenu';
import { useComposerTextareaHeight } from './use-composer-textarea-height';
import { composerDraftStorage } from '@/lib/composer-draft-storage';
import { computeComposerMenuState } from '@/lib/slash-commands/composer-slash-registry';
import type { ComposerSlashDynamicContext } from '@/lib/slash-commands/composer-slash-registry';

interface ChatPanelProps {
  agentId: string;
  sessionKey?: string;
  onSessionKeyChange: (key: string) => void;
  gatewayConnected: boolean;
  slashDynamicContext?: ComposerSlashDynamicContext;
}

interface ComposerMenuState {
  visible: boolean;
  type: 'slash' | 'skill' | null;
  query: string;
  caret: number;
  items: Array<{ label: string; description: string; insertText: string; insertKind: 'line' | 'token' }>;
}

export default function ChatPanel({
  agentId,
  sessionKey,
  onSessionKeyChange,
  gatewayConnected,
  slashDynamicContext,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [menuState, setMenuState] = useState<ComposerMenuState>({
    visible: false,
    type: null,
    query: '',
    caret: 0,
    items: [],
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamingTextRef = useRef('');
  const textareaHeight = useComposerTextareaHeight(textareaRef, input);

  // Load messages on session change
  useEffect(() => {
    if (!sessionKey) {
      // Load from SQLite (local)
      fetch(`/api/chat?agentId=${encodeURIComponent(agentId)}&limit=200`)
        .then((r) => r.json())
        .then((data) => setMessages(data.messages ?? []))
        .catch(console.error);
    } else {
      fetch(
        `/api/chat?agentId=${encodeURIComponent(agentId)}&sessionKey=${encodeURIComponent(sessionKey)}&limit=200`
      )
        .then((r) => r.json())
        .then((data) => setMessages(data.messages ?? []))
        .catch(console.error);
    }
  }, [agentId, sessionKey]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || streaming) return;
    const text = input.trim();
    setInput('');
    composerDraftStorage.clear(agentId, sessionKey);

    // Optimistic user message
    const userMsg: UiMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);
    streamingTextRef.current = '';

    try {
      const body: Record<string, unknown> = { agentId, text };
      if (sessionKey) body.sessionKey = sessionKey;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.deltaText) {
              streamingTextRef.current += data.deltaText;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && last.id.startsWith('streaming-')) {
                  return [
                    ...prev.slice(0, -1),
                    { ...last, content: last.content + data.deltaText },
                  ];
                }
                return [
                  ...prev,
                  {
                    id: `streaming-${Date.now()}`,
                    role: 'assistant' as const,
                    content: data.deltaText,
                    createdAt: new Date().toISOString(),
                  },
                ];
              });
            }
            if (data.final && data.sessionKey) {
              onSessionKeyChange(data.sessionKey);
            }
            if (data.error) {
              console.error('Stream error:', data.error);
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (err) {
      console.error('Send error:', err);
      const errMsg: UiMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `发送失败：${err instanceof Error ? err.message : String(err)}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, agentId, sessionKey, onSessionKeyChange]);

  const handleAbort = useCallback(async () => {
    if (!streaming) return;
    try {
      await fetch('/api/chat/abort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, sessionKey }),
      });
    } finally {
      setStreaming(false);
    }
  }, [streaming, agentId, sessionKey]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const caret = e.target.selectionStart ?? val.length;
    setInput(val);
    composerDraftStorage.set(agentId, sessionKey, val);

    // Compute slash command / @ skill menu state
    const menu = computeComposerMenuState(val, caret, slashDynamicContext);
    if (menu) {
      setMenuState((_s) => ({
        visible: true,
        type: menu.type,
        query: menu.query,
        caret,
        items: menu.items.map((item) => ({
          label: item.name,
          description: item.description,
          insertText: item.insertText,
          // insertKind is computed per-item by computeComposerMenuState
          // pass it through the items so onSelect can read it
          insertKind: (item as { insertKind?: 'line' | 'token' }).insertKind ?? 'token',
        })),
      }));
    } else {
      setMenuState((s) => ({ ...s, visible: false }));
    }
  };

  const groups = groupMessages(messages);

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
            发送消息开始对话
          </div>
        )}
        {groups.map((group, i) => (
          <ChatMessageGroup key={group.id ?? i} {...group} />
        ))}
      </div>

      {/* Composer */}
      <div className="flex-shrink-0 border-t border-zinc-800 p-3 bg-zinc-900 relative">
        {menuState.visible && menuState.items.length > 0 && (
          <ComposerTriggerMenu
            items={menuState.items}
            onSelect={(insertText, insertKind) => {
              if (insertKind === 'line') {
                // Replace from line start to caret (full-line replace for /focus, etc.)
                setInput((prev) => {
                  const before = prev.slice(0, menuState.caret);
                  // Find line start
                  const lastNewline = before.lastIndexOf('\n');
                  const lineStart = lastNewline >= 0 ? lastNewline + 1 : 0;
                  return prev.slice(0, lineStart) + insertText;
                });
              } else {
                // Token replace: append insertText after caret
                setInput((prev) => {
                  const before = prev.slice(0, menuState.caret);
                  const after = prev.slice(menuState.caret);
                  // Skip any partial word being typed
                  const afterClean = after.replace(/^\S*/, '');
                  return before + insertText + afterClean;
                });
              }
              setMenuState((s) => ({ ...s, visible: false }));
              textareaRef.current?.focus();
            }}
            onClose={() => setMenuState((s) => ({ ...s, visible: false }))}
          />
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              gatewayConnected ? '输入消息… (Shift+Enter 换行)' : '网关未连接，请先启动 OpenClaw'
            }
            disabled={!gatewayConnected}
            rows={1}
            className="flex-1 resize-none bg-zinc-800 text-zinc-100 rounded px-3 py-2.5 text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-50"
            style={{ height: textareaHeight, minHeight: 44, maxHeight: 200 }}
          />

          {streaming ? (
            <button
              onClick={handleAbort}
              className="flex-shrink-0 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
            >
              停止
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || !gatewayConnected}
              className="flex-shrink-0 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
            >
              发送
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
