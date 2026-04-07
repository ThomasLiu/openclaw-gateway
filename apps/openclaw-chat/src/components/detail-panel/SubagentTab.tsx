"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { GitBranch, Code, Loader2 } from "lucide-react";
import type { AgentMetadata } from "@/types";

interface SubagentTabProps {
  agentId?: string;
  className?: string;
}

export function SubagentTab({ agentId, className = "" }: SubagentTabProps) {
  const t = useTranslations("detailPanel.subagentManager");
  const [agents, setAgents] = useState<AgentMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    import('@/lib/actions').then(({ getAgents }) => getAgents())
      .then((agents) => { setAgents(agents); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={`subagent-tab flex flex-col h-full ${className}`}>
      <div className="px-3 py-2 border-b border-border-primary bg-bg-secondary">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          {t("title")}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-text-muted" />
          </div>
        ) : agents.length > 0 ? (
          <div className="space-y-2">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="p-2 bg-bg-primary border border-border-primary rounded hover:border-accent-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GitBranch size={14} className="text-accent-primary flex-shrink-0" />
                  <span className="text-xs font-medium text-text-primary">
                    {agent.config?.name ?? agent.id}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-text-muted">
                  <span>{agent.sessionCount} sessions</span>
                  {agent.config?.model && <span>{agent.config.model}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-text-muted text-sm py-8">
            <GitBranch size={32} className="mx-auto mb-2 opacity-30" />
            <p>{t("empty")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SubagentTab;
