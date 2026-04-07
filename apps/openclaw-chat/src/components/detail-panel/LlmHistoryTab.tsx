"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { History, Filter, Pause, ArrowDown, Loader2 } from "lucide-react";
import { useIDEStore } from "@/store";
import type { SessionMessage } from "@/types";

interface LlmHistoryTabProps {
  agentId?: string;
  className?: string;
}

export function LlmHistoryTab({ agentId, className = "" }: LlmHistoryTabProps) {
  const t = useTranslations("detailPanel.llmHistory");
  const messages = useIDEStore((s) => s.data.messages);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [filterRole, setFilterRole] = useState<string>("all");

  const filteredMessages = filterRole === "all"
    ? messages
    : messages.filter((m) => m.role === filterRole);

  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const userMessages = messages.filter((m) => m.role === "user");

  return (
    <div className={`llm-history-tab flex flex-col h-full ${className}`}>
      <div className="px-3 py-2 border-b border-border-primary bg-bg-secondary">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          {t("title")}
        </h3>
      </div>

      <div className="px-3 py-2 border-b border-border-primary">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-text-muted" />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="flex-1 px-2 py-1 text-xs bg-bg-primary border border-border-primary rounded focus:outline-none focus:border-accent-primary"
          >
            <option value="all">All ({messages.length})</option>
            <option value="user">User ({userMessages.length})</option>
            <option value="assistant">Assistant ({assistantMessages.length})</option>
            <option value="system">System</option>
            <option value="tool">Tool</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filteredMessages.length > 0 ? (
          <div className="space-y-2">
            {filteredMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2 border rounded text-xs ${
                  msg.role === 'user'
                    ? 'bg-accent-primary/5 border-accent-primary/20'
                    : msg.role === 'assistant'
                    ? 'bg-bg-primary border-border-primary'
                    : 'bg-bg-secondary border-border-primary'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    msg.role === 'user' ? 'bg-accent-primary/20 text-accent-primary' :
                    msg.role === 'assistant' ? 'bg-status-success/20 text-status-success' :
                    msg.role === 'tool' ? 'bg-status-warning/20 text-status-warning' :
                    'bg-bg-tertiary text-text-muted'
                  }`}>
                    {msg.role}
                  </span>
                  {msg.model && (
                    <span className="text-[10px] text-text-muted">{msg.model}</span>
                  )}
                  {msg.timestamp && (
                    <span className="text-[10px] text-text-muted ml-auto">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div className="text-text-primary break-words line-clamp-3">
                  {typeof msg.content === 'string' ? msg.content.substring(0, 200) : JSON.stringify(msg.content).substring(0, 200)}
                </div>
                {msg.tokensInput != null && (
                  <div className="text-[10px] text-text-muted mt-1">
                    Tokens: {msg.tokensInput} in / {msg.tokensOutput} out
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-text-muted text-sm py-8">
            <History size={32} className="mx-auto mb-2 opacity-30" />
            <p>{t("empty")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LlmHistoryTab;
