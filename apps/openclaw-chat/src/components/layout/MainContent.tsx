'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useIDEStore } from '@/store'
import MessageList from '@/components/message/MessageList'
import ChatInput from '@/components/input/ChatInput'
import ModelSelector from '@/components/input/ModelSelector'
import LanguageSelector from '@/components/input/LanguageSelector'
import type { SessionMessage, ModelInfo } from '@/types'

const EMPTY_ARRAY: string[] = []

interface MainContentProps {
  messages?: SessionMessage[]
  isRunning?: boolean
  models?: ModelInfo[]
  onSend?: (message: string) => void
  onStop?: () => void
  onQuote?: (message: SessionMessage) => void
  onDelete?: (message: SessionMessage) => void
}

export default function MainContent({
  messages: propMessages = [],
  isRunning = false,
  models: propModels = [],
  onSend,
  onStop,
  onQuote,
  onDelete,
}: MainContentProps) {
  const [slashPanelOpen, setSlashPanelOpen] = useState(false)

  const sessionId = useIDEStore((state) => state.selection.sessionId)
  const storeMessages = useIDEStore((state) => state.data.messages)
  const storeModels = useIDEStore((state) => state.data.models)
  const selectedModel = useIDEStore((state) =>
    sessionId ? state.input.modelOverride[sessionId] : undefined
  )
  const preferredLanguage = useIDEStore((state) => state.input.preferredLanguage)
  const inputHistory = useIDEStore((state) =>
    sessionId ? (state.input.history[sessionId] ?? EMPTY_ARRAY) : EMPTY_ARRAY
  )
  const agentId = useIDEStore((state) => state.selection.agentId)
  const sendMessage = useIDEStore((state) => state.sendMessage)

  const setSessionModel = useIDEStore((state) => state.setSessionModel)
  const setPreferredLanguage = useIDEStore((state) => state.setPreferredLanguage)
  const pushInputHistory = useIDEStore((state) => state.pushInputHistory)

  const effectiveMessages = storeMessages.length > 0 ? storeMessages : propMessages
  const effectiveModels = storeModels.length > 0 ? storeModels : propModels

  const handleSend = useCallback((message: string) => {
    if (onSend) {
      onSend(message)
    }
    if (agentId) {
      sendMessage(agentId, message, sessionId ?? undefined)
    }
    if (sessionId) {
      pushInputHistory(sessionId, message)
    }
  }, [onSend, agentId, sessionId, sendMessage, pushInputHistory])

  const handleModelChange = (modelId: string) => {
    if (sessionId && modelId) {
      setSessionModel(sessionId, modelId)
    }
  }

  const handleLanguageChange = (language: typeof preferredLanguage) => {
    setPreferredLanguage(language)
  }

  const handleInputChange = (value: string) => {
    if (value.startsWith('/') || value === '/') {
      setSlashPanelOpen(true)
    } else {
      setSlashPanelOpen(false)
    }
  }

  return (
    <main data-testid="main-content" className="flex-1 flex flex-col bg-bg-panel overflow-hidden">
      <div className="relative flex-1 flex flex-col overflow-hidden">
        <MessageList
          messages={effectiveMessages}
          isStreaming={isRunning}
          onQuote={onQuote}
          onDelete={onDelete}
          virtualScroll={effectiveMessages.length > 100}
        />
      </div>

      <div className="flex-shrink-0 border-t border-border-primary bg-bg-secondary px-6 py-5">
        <div className="mx-auto max-w-[820px] space-y-4">
          <div className="flex items-center justify-between gap-4 px-1">
            <ModelSelector
              models={effectiveModels}
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
            />

            <LanguageSelector
              currentLanguage={preferredLanguage}
              onLanguageChange={handleLanguageChange}
            />
          </div>

          <div className="relative">
            <ChatInput
              onSend={handleSend}
              onStop={onStop}
              isRunning={isRunning}
              inputHistory={inputHistory}
            />
          </div>

          <div className="flex items-center justify-between px-1 pt-0.5 text-[11px] text-text-muted">
            <span>Press Enter to send</span>
            <span>Powered by OpenClaw</span>
          </div>
        </div>
      </div>
    </main>
  )
}
