"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { FolderOpen, FilePlus, FolderPlus, File, Folder, Loader2 } from "lucide-react";
import type { WorkspaceFileInfo } from "@/types";

interface WorkspaceBrowserTabProps {
  agentId?: string;
  className?: string;
}

export function WorkspaceBrowserTab({ agentId, className = "" }: WorkspaceBrowserTabProps) {
  const t = useTranslations("detailPanel.workspaceBrowser");
  const [files, setFiles] = useState<WorkspaceFileInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) {
      setFiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    import('@/lib/actions').then(({ getWorkspaceFiles }) => getWorkspaceFiles(agentId))
      .then((files) => { setFiles(files); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agentId]);

  const directories = files.filter((f) => f.type === "directory");
  const fileItems = files.filter((f) => f.type === "file");

  return (
    <div className={`workspace-browser-tab flex flex-col h-full ${className}`}>
      <div className="px-3 py-2 border-b border-border-primary bg-bg-secondary">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {t("title")}
          </h3>
          <div className="flex items-center gap-1">
            <button className="p-1 hover:bg-bg-hover rounded" title={t("newFolder")}>
              <FolderPlus size={14} className="text-text-muted" />
            </button>
            <button className="p-1 hover:bg-bg-hover rounded" title={t("newFile")}>
              <FilePlus size={14} className="text-text-muted" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-text-muted" />
          </div>
        ) : files.length > 0 ? (
          <div className="space-y-0.5">
            {files.map((file) => (
              <div
                key={file.path}
                className="flex items-center gap-2 px-2 py-1 hover:bg-bg-hover rounded cursor-pointer transition-colors"
              >
                {file.type === "directory" ? (
                  <Folder size={14} className="text-accent-primary flex-shrink-0" />
                ) : (
                  <File size={14} className="text-text-muted flex-shrink-0" />
                )}
                <span className="text-xs text-text-primary truncate flex-1">
                  {file.name}
                </span>
                {file.size !== undefined && (
                  <span className="text-[10px] text-text-muted flex-shrink-0">
                    {file.size > 1024 ? `${(file.size / 1024).toFixed(1)}KB` : `${file.size}B`}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-text-muted text-sm py-8">
            <FolderOpen size={32} className="mx-auto mb-2 opacity-30" />
            <p>{t("empty")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkspaceBrowserTab;
