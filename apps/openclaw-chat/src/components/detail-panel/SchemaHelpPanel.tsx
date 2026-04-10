// ============================================================
// OpenClaw Chat - SchemaHelpPanel 通用组件
// 跨 Tab 复用的 JSON 配置说明面板
// ============================================================

"use client";

import React, { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, Search, Lock, AlertCircle } from "lucide-react";

// ==================== 类型定义 ====================

/** Schema 字段定义 */
export interface SchemaField {
  type?: string;
  description?: string;
  required?: boolean;
  sensitive?: boolean;
  example?: unknown;
  enum?: string[];
  [key: string]: unknown;
}

/** Schema 对象结构 */
export interface SchemaObject {
  type: string;
  properties?: Record<string, SchemaField>;
  required?: string[];
  [key: string]: unknown;
}

/** SchemaHelpPanel Props */
interface SchemaHelpPanelProps {
  /** Schema 数据（从 config.schema RPC 获取的格式） */
  schema: SchemaObject | null;
  /** 是否加载中 */
  isLoading?: boolean;
  /** 默认是否展开 */
  defaultExpanded?: boolean;
  /** 点击字段时的回调 */
  onFieldClick?: (fieldName: string) => void;
  /** 自定义类名 */
  className?: string;
}

// ==================== 组件实现 ====================

/**
 * SchemaHelpPanel - 配置说明面板组件
 *
 * 功能：
 * - 默认折叠态显示字段数量横幅
 * - 点击展开树形字段列表
 * - 每个字段显示：名称 + 类型标签 + 描述 + 示例 + 敏感标记
 * - 必填/可选标识、enum 可选值列表
 * - 搜索过滤功能
 * - i18n 支持
 */
export function SchemaHelpPanel({
  schema,
  isLoading = false,
  defaultExpanded = false,
  onFieldClick,
  className = "",
}: SchemaHelpPanelProps) {
  const t = useTranslations("detailPanel.configHelp");
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [searchQuery, setSearchQuery] = useState("");

  // 计算字段列表
  const fields = useMemo(() => {
    if (!schema?.properties) return [];

    const entries = Object.entries(schema.properties);

    // 应用搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return entries.filter(([name, field]) =>
        name.toLowerCase().includes(query) ||
        field.description?.toLowerCase().includes(query) ||
        field.type?.toLowerCase().includes(query)
      );
    }

    return entries;
  }, [schema, searchQuery]);

  const fieldCount = schema?.properties ? Object.keys(schema.properties).length : 0;

  // 处理横幅点击
  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  // 处理字段点击
  const handleFieldClick = (fieldName: string) => {
    onFieldClick?.(fieldName);
  };

  return (
    <div className={`schema-help-panel ${className}`}>
      {/* 折叠态横幅 */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-2 px-3 py-2 bg-bg-secondary hover:bg-bg-hover border border-border-primary rounded-md transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown size={14} className="text-text-muted flex-shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
        )}
        <span className="text-xs font-medium text-text-secondary">
          {t("title")}
        </span>
        {!isLoading && schema && (
          <span className="text-xs text-text-muted">
            ({t("fieldCount", { count: fieldCount })})
          </span>
        )}
      </button>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="schema-fields mt-2 border border-border-primary rounded-md overflow-hidden">
          {/* Loading 状态 */}
          {isLoading && (
            <div className="p-4 text-center text-sm text-text-muted">
              {t("loading")}
            </div>
          )}

          {/* 无 Schema 提示 */}
          {!isLoading && !schema && (
            <div className="p-4 text-center text-sm text-text-muted flex items-center justify-center gap-2">
              <AlertCircle size={14} />
              {t("noSchema")}
            </div>
          )}

          {/* 搜索框 */}
          {!isLoading && schema && (
            <>
              <div className="p-2 border-b border-border-primary">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-bg-primary border border-border-primary rounded focus:outline-none focus:border-accent-primary text-text-primary placeholder:text-text-muted"
                  />
                </div>
              </div>

              {/* 字段列表 */}
              <div className="max-h-[400px] overflow-y-auto">
                {fields.length === 0 && searchQuery.trim() && (
                  <div className="p-4 text-center text-sm text-text-muted">
                    无匹配字段
                  </div>
                )}

                <table className="w-full text-xs">
                  <thead className="bg-bg-secondary sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-text-secondary">
                        {t("fieldName")}
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-text-secondary w-20">
                        {t("fieldType")}
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-text-secondary">
                        {t("fieldDescription")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map(([name, field]) => {
                      const isRequired = schema.required?.includes(name);
                      const isSensitive = field.sensitive;

                      return (
                        <tr
                          key={name}
                          onClick={() => handleFieldClick(name)}
                          className="border-t border-border-primary hover:bg-bg-hover cursor-pointer transition-colors"
                        >
                          {/* 字段名 */}
                          <td className="px-3 py-2 align-top">
                            <div className="flex items-center gap-1.5">
                              <code className="font-mono text-accent-primary font-medium">
                                {name}
                              </code>
                              {/* 必填/可选标识 */}
                              {isRequired && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-status-error/10 text-status-error">
                                  {t("fieldRequired")}
                                </span>
                              )}
                              {!isRequired && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-status-info/10 text-status-info">
                                  {t("fieldOptional")}
                                </span>
                              )}
                              {/* 敏感标记 */}
                              {isSensitive && (
                                <Lock size={12} className="text-warning" />
                              )}
                            </div>

                            {/* Enum 值列表 */}
                            {field.enum && field.enum.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {field.enum.map((value) => (
                                  <span
                                    key={value}
                                    className="px-1.5 py-0.5 rounded bg-bg-secondary text-text-muted font-mono"
                                  >
                                    {value}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* 类型标签 */}
                          <td className="px-3 py-2 align-top">
                            <span className="px-1.5 py-0.5 rounded bg-accent-primary/10 text-accent-primary font-mono">
                              {field.type || "any"}
                            </span>
                          </td>

                          {/* 描述和示例 */}
                          <td className="px-3 py-2 align-top">
                            <div className="text-text-secondary">
                              {field.description || "-"}
                            </div>
                            {field.example !== undefined && (
                              <div className="mt-1 text-text-muted">
                                <span className="font-medium">{t("fieldExample")}: </span>
                                <code className="font-mono bg-bg-secondary px-1 rounded">
                                  {typeof field.example === "object"
                                    ? JSON.stringify(field.example)
                                    : String(field.example)}
                                </code>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default SchemaHelpPanel;
