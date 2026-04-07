"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Server, Plus, Trash2, Loader2 } from "lucide-react";
import { SchemaHelpPanel } from "./SchemaHelpPanel";

interface McpManagerTabProps {
  agentId?: string;
  className?: string;
}

interface McpServer {
  name: string;
  command?: string;
  url?: string;
  enabled?: boolean;
}

export function McpManagerTab({ agentId, className = "" }: McpManagerTabProps) {
  const t = useTranslations("detailPanel.mcpManager");
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    import('@/lib/actions').then(({ getConfig }) => getConfig())
      .then((config) => {
        if (config?.mcpServers) {
          const mcpServers = config.mcpServers as Record<string, unknown>;
          const list: McpServer[] = Object.entries(mcpServers).map(([name, val]) => {
            const s = val as Record<string, unknown>;
            return { name, command: s.command as string | undefined, url: s.url as string | undefined, enabled: s.enabled as boolean | undefined };
          });
          setServers(list);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={`mcp-manager-tab flex flex-col h-full ${className}`}>
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
        ) : servers.length > 0 ? (
          <div className="space-y-2">
            {servers.map((server) => (
              <div
                key={server.name}
                className="p-2 bg-bg-primary border border-border-primary rounded hover:border-accent-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Server size={14} className="text-accent-primary flex-shrink-0" />
                    <span className="text-xs font-medium text-text-primary truncate">
                      {server.name}
                    </span>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${server.enabled !== false ? 'bg-status-success' : 'bg-text-muted'}`} />
                </div>
                {(server.command || server.url) && (
                  <div className="text-[10px] text-text-muted mt-1 font-mono truncate">
                    {server.command ?? server.url}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-text-muted text-sm py-8">
            <Server size={32} className="mx-auto mb-2 opacity-30" />
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

export default McpManagerTab;
