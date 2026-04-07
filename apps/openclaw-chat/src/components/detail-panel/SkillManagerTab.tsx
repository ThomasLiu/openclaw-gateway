"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Zap, Plus, Eye } from "lucide-react";
import type { SkillInfo } from "@/types";

interface SkillManagerTabProps {
  agentId?: string;
  className?: string;
}

export function SkillManagerTab({ agentId, className = "" }: SkillManagerTabProps) {
  const t = useTranslations("detailPanel.skillManager");
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    import('@/lib/actions').then(({ getSkills }) => getSkills())
      .then((skills) => { setSkills(skills); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={`skill-manager-tab flex flex-col h-full ${className}`}>
      <div className="px-3 py-2 border-b border-border-primary bg-bg-secondary">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          {t("title")}
        </h3>
      </div>

      <div className="flex gap-1 px-3 py-2 border-b border-border-primary">
        <button className="px-2 py-1 text-xs bg-accent-primary text-white rounded">
          {t("categories.bundled")}
        </button>
        <button className="px-2 py-1 text-xs bg-bg-primary text-text-muted rounded hover:bg-bg-hover">
          {t("categories.global")}
        </button>
        <button className="px-2 py-1 text-xs bg-bg-primary text-text-muted rounded hover:bg-bg-hover">
          {t("categories.workspace")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Zap size={20} className="animate-pulse text-text-muted" />
          </div>
        ) : skills.length > 0 ? (
          <div className="space-y-2">
            {skills.map((skill) => (
              <div
                key={skill.name}
                className="flex items-center justify-between p-2 bg-bg-primary border border-border-primary rounded hover:border-accent-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Zap size={14} className="text-accent-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-text-primary truncate">
                      {skill.name}
                    </div>
                    {skill.description && (
                      <div className="text-[10px] text-text-muted truncate">
                        {skill.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {skill.version && (
                    <span className="text-[10px] text-text-muted">v{skill.version}</span>
                  )}
                  <span className={`w-2 h-2 rounded-full ${skill.enabled !== false ? 'bg-status-success' : 'bg-text-muted'}`} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-text-muted text-sm py-8">
            <Zap size={32} className="mx-auto mb-2 opacity-30" />
            <p>{t("empty")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SkillManagerTab;
