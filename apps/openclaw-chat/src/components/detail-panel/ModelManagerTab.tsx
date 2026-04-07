"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Cpu, Plus, Loader2 } from "lucide-react";
import { SchemaHelpPanel } from "./SchemaHelpPanel";
import type { ModelInfo } from "@/types";

interface ModelManagerTabProps {
  agentId?: string;
  className?: string;
}

export function ModelManagerTab({ agentId, className = "" }: ModelManagerTabProps) {
  const t = useTranslations("detailPanel.modelManager");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    import('@/lib/actions').then(({ getConfig }) => getConfig())
      .then((config) => {
        const modelList: ModelInfo[] = [];
        if (config?.models) {
          const modelConfig = config.models as Record<string, unknown>;
          for (const [id, val] of Object.entries(modelConfig)) {
            const m = val as Record<string, unknown>;
            modelList.push({
              id,
              name: (m.name as string) || id,
              provider: (m.provider as string) || 'unknown',
              contextWindow: (m.contextWindow as number) || 128000,
            });
          }
        }
        setModels(modelList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={`model-manager-tab flex flex-col h-full ${className}`}>
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
        ) : models.length > 0 ? (
          <div className="space-y-2">
            {models.map((model) => (
              <div
                key={model.id}
                className="p-2 bg-bg-primary border border-border-primary rounded hover:border-accent-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Cpu size={14} className="text-accent-primary flex-shrink-0" />
                    <span className="text-xs font-medium text-text-primary truncate">
                      {model.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted px-1.5 py-0.5 bg-bg-secondary rounded">
                    {model.provider}
                  </span>
                </div>
                <div className="text-[10px] text-text-muted mt-1">
                  ID: {model.id}
                  {model.contextWindow && ` · Context: ${(model.contextWindow / 1000).toFixed(0)}K`}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-text-muted text-sm py-8">
            <Cpu size={32} className="mx-auto mb-2 opacity-30" />
            <p>{t("empty")}</p>
          </div>
        )}
      </div>

      <div className="border-t border-border-primary p-3">
        <SchemaHelpPanel schema={null} />
      </div>
    </div>
  );
}

export default ModelManagerTab;
