"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Brain, FileText, Loader2 } from "lucide-react";

interface MemoryManagerTabProps {
  agentId?: string;
  className?: string;
}

export function MemoryManagerTab({ agentId, className = "" }: MemoryManagerTabProps) {
  const t = useTranslations("detailPanel.memoryManager");
  const [memoryContent, setMemoryContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) {
      setMemoryContent(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    import('@/lib/actions').then(({ getAgentMdFile }) => getAgentMdFile(agentId, 'MEMORY.md'))
      .then((result) => { setMemoryContent(result?.content ?? null); })
      .catch(() => setMemoryContent(null))
      .finally(() => setLoading(false));
  }, [agentId]);

  return (
    <div className={`memory-manager-tab flex flex-col h-full ${className}`}>
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
        ) : memoryContent ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText size={14} className="text-text-muted" />
              <h4 className="text-xs font-medium text-text-primary">MEMORY.md</h4>
            </div>
            <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap break-words bg-bg-primary border border-border-primary rounded p-2">
              {memoryContent}
            </pre>
          </div>
        ) : (
          <div className="text-center text-text-muted text-sm py-8">
            <Brain size={32} className="mx-auto mb-2 opacity-30" />
            <p>{t("empty")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MemoryManagerTab;
