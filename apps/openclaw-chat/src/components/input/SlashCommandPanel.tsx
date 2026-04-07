// ============================================================
// OpenClaw Chat - SlashCommandPanel Component
// 命令面板，支持斜杠命令、参数补全、详情展示
// ============================================================

'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { X, Search, ChevronRight, Terminal } from 'lucide-react'
import type { SlashCommand } from '@/mocks/slash-commands.mock'

interface AgentInfo {
  id: string
  name: string
  status?: string
}

interface SkillInfo {
  name: string
  description?: string
}

interface ModelInfo {
  id: string
  name: string
  provider?: string
}

interface SlashCommandPanelProps {
  /** 是否打开 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 选择命令回调 */
  onSelect: (command: string) => void
  /** 可用命令列表 */
  commands?: SlashCommand[]
  /** 可用 Agent 列表 */
  agents?: AgentInfo[]
  /** 可用技能列表 */
  skills?: SkillInfo[]
  /** 可用模型列表 */
  models?: ModelInfo[]
  /** 当前输入值（用于参数补全） */
  inputValue?: string
  /** 搜索关键词 */
  searchQuery?: string
}

/**
 * 斜杠命令面板组件
 * 
 * 特性：
 * - 输入 `/` 触发面板弹出
 * - 左右分栏布局
 * - 命令列表显示 `/abc` 或 `/abc [arg]` 格式
 * - 选中命令右侧显示详情（参数说明+示例）
 * - 参数值智能补全：
 *   - `/kill ` → 显示 agent-id 列表
 *   - `/skill ` → 显示 skill 列表  
 *   - `/model ` → 显示模型列表
 * - 参数值选中后右侧显示详情
 * - ESC 关闭面板
 * - 点击外部关闭面板
 * - 所有面板文案 i18n ('slashCommand.*')
 */
export default function SlashCommandPanel({
  isOpen,
  onClose,
  onSelect,
  commands = [],
  agents = [],
  skills = [],
  models = [],
  inputValue = '',
  searchQuery = '',
}: SlashCommandPanelProps) {
  const t = useTranslations('slashCommand')
  const [selectedCommand, setSelectedCommand] = useState<SlashCommand | null>(null)
  const [selectedArgValue, setSelectedArgValue] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 过滤命令列表
  const filteredCommands = useMemo(() => {
    if (!searchQuery) return commands
    
    return commands.filter(cmd =>
      cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [commands, searchQuery])

  // 检测当前正在输入的参数类型
  const currentArgType = useMemo((): 'agents' | 'skills' | 'models' | null => {
    if (inputValue.startsWith('/kill ') || inputValue.startsWith('/kill\t')) return 'agents'
    if (inputValue.startsWith('/skill ') || inputValue.startsWith('/skill\t')) return 'skills'
    if (inputValue.startsWith('/model ') || inputValue.startsWith('/model\t')) return 'models'
    return null
  }, [inputValue])

  // ESC 关闭
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // 处理命令选择
  const handleCommandSelect = (cmd: SlashCommand) => {
    setSelectedCommand(cmd)
    setSelectedArgValue(null)
  }

  // 处理参数值选择
  const handleArgValueSelect = (value: string) => {
    setSelectedArgValue(value)
  }

  // 渲染参数值列表
  const renderArgValueList = () => {
    let items: Array<{ id: string; name: string; description?: string }> = []
    
    switch (currentArgType) {
      case 'agents':
        items = agents.map(a => ({ id: a.id, name: a.name, description: a.status }))
        break
      case 'skills':
        items = skills.map(s => ({ id: s.name, name: s.name, description: s.description }))
        break
      case 'models':
        items = models.map(m => ({ id: m.id, name: m.name, description: m.provider }))
        break
    }

    if (items.length === 0) return null

    return (
      <div data-testid={`${currentArgType}-list`} className="p-3 border-t border-border-primary">
        <h4 className="text-xs font-medium text-text-secondary mb-2">
          {t(currentArgType === 'agents' ? 'agents' : currentArgType === 'skills' ? 'skills' : 'models')}
        </h4>
        <ul className="space-y-1">
          {items.map(item => (
            <li key={item.id}>
              <button
                onClick={() => handleArgValueSelect(item.id)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-bg-hover transition-colors text-sm"
              >
                <span className="font-medium">{item.name}</span>
                {item.description && (
                  <span className="text-xs text-text-muted ml-2">{item.description}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div
      data-testid="slash-command-panel"
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 mb-2 bg-bg-secondary border border-border-primary rounded-lg shadow-xl z-50 max-h-[400px] flex overflow-hidden"
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-primary bg-bg-tertiary">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-accent-primary" />
          <span className="text-sm font-medium">{t('title')}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-bg-hover rounded transition-colors"
          aria-label={t('pressEsc')}
        >
          <X size={14} />
        </button>
      </div>

      {/* 主内容区：左右分栏 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：命令列表 */}
        <div data-testid="command-list" className="w-1/2 border-r border-border-primary overflow-y-auto">
          {/* 搜索框 */}
          <div className="p-2 border-b border-border-primary">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                defaultValue={searchQuery}
                className="w-full pl-7 pr-3 py-1.5 bg-bg-input border border-border-primary rounded text-sm outline-none focus:border-accent-primary"
              />
            </div>
          </div>

          {/* 命令列表 */}
          <ul className="py-1">
            {filteredCommands.length === 0 ? (
              <li className="px-3 py-4 text-sm text-text-muted text-center">
                {t('noResults')}
              </li>
            ) : (
              filteredCommands.map((cmd) => (
                <li key={cmd.name}>
                  <button
                    onClick={() => handleCommandSelect(cmd)}
                    className={`w-full px-3 py-2 text-left hover:bg-bg-hover transition-colors flex items-center gap-2 ${
                      selectedCommand?.name === cmd.name ? 'bg-bg-hover' : ''
                    }`}
                  >
                    <span className="font-mono text-sm text-accent-primary">
                      /{cmd.name}
                      {cmd.args?.length ? ` [${cmd.args[0].name}]` : ''}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>

          {/* 参数值补全列表 */}
          {currentArgType && renderArgValueList()}
        </div>

        {/* 右侧：命令详情 */}
        <div data-testid="command-detail" className="w-1/2 p-4 overflow-y-auto bg-bg-secondary">
          {selectedCommand ? (
            <div className="space-y-4">
              {/* 命令名称和描述 */}
              <div>
                <h3 className="font-mono text-lg font-bold text-accent-primary mb-1">
                  /{selectedCommand.name}
                </h3>
                <p className="text-sm text-text-secondary">{selectedCommand.description}</p>
              </div>

              {/* 参数说明 */}
              {selectedCommand.args && selectedCommand.args.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    {t('argument')}
                  </h4>
                  <dl className="space-y-2">
                    {selectedCommand.args.map((arg) => (
                      <div key={arg.name} className="bg-bg-tertiary rounded p-2">
                        <dt className="font-mono text-sm font-medium">
                          --{arg.name}
                          {arg.required && <span className="text-error ml-1">*</span>}
                        </dt>
                        <dd className="text-xs text-text-muted mt-1">{arg.description}</dd>
                        {arg.options && (
                          <dd className="mt-1">
                            <div className="flex flex-wrap gap-1">
                              {arg.options.map(opt => (
                                <code key={opt} className="text-xs bg-bg-secondary px-1.5 py-0.5 rounded">
                                  {opt}
                                </code>
                              ))}
                            </div>
                          </dd>
                        )}
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* 使用示例 */}
              {selectedCommand.examples && selectedCommand.examples.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    {t('example')}
                  </h4>
                  <ul className="space-y-1">
                    {selectedCommand.examples.map((ex, idx) => (
                      <li key={idx}>
                        <code className="text-xs bg-bg-tertiary px-2 py-1 rounded block">
                          {ex}
                        </code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 选中的参数值详情 */}
              {selectedArgValue && (
                <div className="border-t border-border-primary pt-3 mt-3">
                  <p className="text-sm text-text-secondary">
                    已选择: <code className="text-accent-primary">{selectedArgValue}</code>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-text-muted text-sm">
              <p>{t('selectAgent')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
