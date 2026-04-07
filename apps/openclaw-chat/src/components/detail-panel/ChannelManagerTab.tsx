"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { MessageSquare, Plus, Trash2, Loader2 } from "lucide-react";

interface ChannelManagerTabProps {
  agentId?: string;
  className?: string;
}

interface ChannelInfo {
  name: string;
  type?: string;
  enabled?: boolean;
}

export function ChannelManagerTab({ agentId, className = "" }: ChannelManagerTabProps) {
  const t = useTranslations("detailPanel.channelManager");
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    import('@/lib/actions').then(({ getConfig }) => getConfig())
      .then((config) => {
        const channelList: ChannelInfo[] = [];
        if (config?.channels) {
          const channelConfig = config.channels as Record<string, unknown>;
          for (const [name, val] of Object.entries(channelConfig)) {
            const c = val as Record<string, unknown>;
            channelList.push({ name, type: c.type as string | undefined, enabled: c.enabled as boolean | undefined });
          }
        }
        setChannels(channelList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={`channel-manager-tab flex flex-col h-full ${className}`}>
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
        ) : channels.length > 0 ? (
          <div className="space-y-2">
            {channels.map((channel) => (
              <div
                key={channel.name}
                className="p-2 bg-bg-primary border border-border-primary rounded hover:border-accent-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare size={14} className="text-accent-primary flex-shrink-0" />
                    <span className="text-xs font-medium text-text-primary truncate">
                      {channel.name}
                    </span>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${channel.enabled !== false ? 'bg-status-success' : 'bg-text-muted'}`} />
                </div>
                {channel.type && (
                  <div className="text-[10px] text-text-muted mt-1">
                    Type: {channel.type}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-text-muted text-sm py-8">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
            <p>{t("empty")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChannelManagerTab;
