"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Clock, Plus, Play, Pause, Trash2, Loader2 } from "lucide-react";
import type { CronJobConfig } from "@/types";

interface CronManagerTabProps {
  agentId?: string;
  className?: string;
}

export function CronManagerTab({ agentId, className = "" }: CronManagerTabProps) {
  const t = useTranslations("detailPanel.cronManager");
  const [jobs, setJobs] = useState<CronJobConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    import('@/lib/actions').then(({ getCronJobs }) => getCronJobs())
      .then((cronStore) => { setJobs(cronStore.jobs ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={`cron-manager-tab flex flex-col h-full ${className}`}>
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
        ) : jobs.length > 0 ? (
          <div className="space-y-2">
            {jobs.map((job, idx) => (
              <div
                key={job.jobId ?? idx}
                className="p-2 bg-bg-primary border border-border-primary rounded hover:border-accent-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-accent-primary flex-shrink-0" />
                    <span className="text-xs font-medium text-text-primary">
                      {job.agentId}
                    </span>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${job.enabled !== false ? 'bg-status-success' : 'bg-text-muted'}`} />
                </div>
                <div className="text-[10px] text-text-muted font-mono">
                  {job.schedule}
                </div>
                <div className="text-[10px] text-text-muted mt-1">
                  {job.command}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-text-muted text-sm py-8">
            <Clock size={32} className="mx-auto mb-2 opacity-30" />
            <p>{t("empty")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CronManagerTab;
