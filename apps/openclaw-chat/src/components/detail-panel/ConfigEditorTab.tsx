"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  FileText,
  Edit3,
  Save,
  X,
  Eye,
  Code,
  Settings,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { SchemaHelpPanel } from "./SchemaHelpPanel";

interface ConfigFile {
  id: string;
  name: string;
  description: string;
  badge?: string;
}

interface ConfigEditorTabProps {
  agentId?: string;
  className?: string;
}

const CONFIG_FILES: ConfigFile[] = [
  { id: "agents", name: "AGENTS.md", description: "Agent 定义与角色说明" },
  { id: "soul", name: "SOUL.md", description: "Agent 性格与行为准则" },
  { id: "tools", name: "TOOLS.md", description: "工具使用指南" },
  { id: "bootstrap", name: "BOOTSTRAP.md", description: "一次性引导配置", badge: "一次性引导" },
  { id: "identity", name: "IDENTITY.md", description: "身份标识配置" },
  { id: "user", name: "USER.md", description: "用户偏好设置" },
  { id: "heartbeat", name: "HEARTBEAT.md", description: "心跳任务定义", badge: "心跳任务" },
  { id: "memory", name: "MEMORY.md", description: "Agent 记忆存储", badge: "记忆" },
];

const FILE_NAME_MAP: Record<string, string> = {
  agents: "AGENTS.md",
  soul: "SOUL.md",
  tools: "TOOLS.md",
  bootstrap: "BOOTSTRAP.md",
  identity: "IDENTITY.md",
  user: "USER.md",
  heartbeat: "HEARTBEAT.md",
  memory: "MEMORY.md",
};

export function ConfigEditorTab({ agentId, className = "" }: ConfigEditorTabProps) {
  const t = useTranslations("detailPanel.configEditor");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showGlobalConfig, setShowGlobalConfig] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [globalConfig, setGlobalConfig] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileSelect = useCallback(async (fileId: string) => {
    setSelectedFile(fileId);
    setIsEditing(false);
    setShowGlobalConfig(false);
    setFileContent(null);

    if (!agentId) return;
    const filename = FILE_NAME_MAP[fileId];
    if (!filename) return;

    setLoading(true);
    try {
      const { getAgentMdFile } = await import('@/lib/actions');
      const result = await getAgentMdFile(agentId, filename as typeof import('@/lib/data/fs-reader').AGENT_MD_FILES[number]);
      setFileContent(result?.content ?? "(empty file)");
    } catch {
      setFileContent("(failed to load)");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const handleToggleGlobalConfig = useCallback(async () => {
    setShowGlobalConfig(!showGlobalConfig);
    setSelectedFile(null);
    setIsEditing(false);

    if (!showGlobalConfig && globalConfig === null) {
      try {
        const { getConfig } = await import('@/lib/actions');
        const config = await getConfig();
        setGlobalConfig(JSON.stringify(config, null, 2));
      } catch {
        setGlobalConfig("(failed to load)");
      }
    }
  }, [showGlobalConfig, globalConfig]);

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div className={`config-editor-tab flex flex-col h-full ${className}`}>
      <div className="border-b border-border-primary">
        <div className="px-3 py-2 bg-bg-secondary">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {t("title")}
          </h3>
        </div>

        <div className="max-h-[200px] overflow-y-auto">
          {CONFIG_FILES.map((file) => {
            const isSelected = selectedFile === file.id;
            return (
              <button
                key={file.id}
                onClick={() => handleFileSelect(file.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-bg-hover transition-colors ${
                  isSelected ? "bg-bg-hover border-l-2 border-accent-primary" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={14} className="text-text-muted flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-text-primary truncate">
                      {file.name}
                    </div>
                    <div className="text-[10px] text-text-muted truncate">
                      {file.description}
                    </div>
                  </div>
                </div>
                {file.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent-primary/10 text-accent-primary flex-shrink-0">
                    {file.badge}
                  </span>
                )}
                <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
              </button>
            );
          })}

          <button
            onClick={handleToggleGlobalConfig}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-hover transition-colors border-t border-border-primary ${
              showGlobalConfig ? "bg-bg-hover" : ""
            }`}
          >
            <Settings size={14} className="text-text-muted" />
            <span className="text-xs font-medium text-text-primary">
              {t("globalConfig")}
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {selectedFile && !showGlobalConfig && (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border-primary bg-bg-secondary">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-text-muted" />
                <span className="text-xs font-medium text-text-primary">
                  {CONFIG_FILES.find((f) => f.id === selectedFile)?.name}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 hover:bg-bg-hover rounded transition-colors"
                    title={t("editMode")}
                  >
                    <Edit3 size={14} className="text-text-secondary" />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-1 px-2 py-1 bg-status-success text-white rounded text-xs hover:bg-status-success/90 transition-colors"
                    >
                      <Save size={12} />
                      {t("save")}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-1 px-2 py-1 bg-status-error text-white rounded text-xs hover:bg-status-error/90 transition-colors"
                    >
                      <X size={12} />
                      {t("reset")}
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto p-3">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-text-muted" />
                </div>
              ) : isEditing ? (
                <textarea
                  className="w-full h-full bg-bg-input border border-border-primary rounded p-2 text-xs font-mono text-text-primary resize-none focus:outline-none focus:border-accent-primary"
                  value={fileContent ?? ""}
                  onChange={(e) => setFileContent(e.target.value)}
                />
              ) : (
                <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap break-words">
                  {fileContent ?? "Select a file to view content"}
                </pre>
              )}
            </div>
          </div>
        )}

        {showGlobalConfig && (
          <div className="h-full flex flex-col">
            <div className="px-3 py-2 border-b border-border-primary bg-bg-secondary">
              <h4 className="text-xs font-medium text-text-primary">
                {t("globalConfig")}
              </h4>
            </div>
            <div className="flex-1 overflow-auto p-3">
              <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap break-words">
                {globalConfig ?? "Loading..."}
              </pre>
            </div>
            <div className="border-t border-border-primary p-3">
              <SchemaHelpPanel schema={null} />
            </div>
          </div>
        )}

        {!selectedFile && !showGlobalConfig && (
          <div className="h-full flex items-center justify-center text-text-muted text-sm">
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-3 opacity-30" />
              <p>选择一个配置文件进行查看或编辑</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConfigEditorTab;
