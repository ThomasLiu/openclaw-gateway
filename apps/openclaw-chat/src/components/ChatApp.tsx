'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { AgentSidebar } from '@/components/AgentSidebar';
import { SessionSidebar } from '@/components/SessionSidebar';
import { AppTitleBar } from '@/components/AppTitleBar';
import { GatewayAlertDialog } from '@/components/GatewayAlertDialog';
import type { GatewaySessionRow } from '@/components/chat-types';
import type { ComposerSlashDynamicContext } from '@/lib/slash-commands/composer-slash-registry';

const ChatPanel = dynamic(() => import('@/components/ChatPanel'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-zinc-500">加载聊天面板…</div>
  ),
});

const OpenClawLogsPanel = dynamic(
  () => import('@/components/OpenClawLogsPanel').then((m) => ({ default: m.OpenClawLogsPanel })),
  { ssr: false }
);

interface ChatAppProps {
  /** 当前选中的 agent id */
  agentId?: string;
  /** 当前会话 key */
  sessionKey?: string;
}

export function ChatApp({
  agentId: initialAgentId = 'main',
  sessionKey: initialSessionKey,
}: ChatAppProps) {
  const [agentId, setAgentId] = useState<string>(initialAgentId);
  const [sessionKey, setSessionKey] = useState<string | undefined>(initialSessionKey);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<string>('logs');
  const [gatewaySessions, setGatewaySessions] = useState<GatewaySessionRow[]>([]);
  const [gatewayModels, setGatewayModels] = useState<string[]>([]);
  const [gatewayConnected] = useState(false);
  const [gatewayAlert, setGatewayAlert] = useState<string | null>(null);

  // Build dynamic context for slash command enrichment
  const slashDynamicContext: ComposerSlashDynamicContext = {
    sessions: gatewaySessions,
    models: gatewayModels,
  };

  // Fetch sessions and models for slash command dynamic args
  useEffect(() => {
    fetch('/api/gateway/sessions?limit=100')
      .then((r) => r.json())
      .then((data) => {
        if (data.sessions) setGatewaySessions(data.sessions);
      })
      .catch(() => {/* gateway may be offline */});

    fetch('/api/openclaw/models')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.models)) setGatewayModels(data.models);
      })
      .catch(() => {/* gateway may be offline */});
  }, []);

  const handleSelectSession = (sk: string) => {
    setSessionKey(sk);
  };

  const handleOpenRightPanel = (tab: string) => {
    setRightPanelTab(tab);
    setRightPanelOpen(true);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950">
      <AppTitleBar
        gatewayConnected={gatewayConnected}
        onOpenPanel={handleOpenRightPanel}
        onGatewayAlert={setGatewayAlert}
      />

      <div className="flex flex-1 min-h-0">
        <AgentSidebar
          agentId={agentId}
          onSelectAgent={(id) => {
            setAgentId(id);
            setSessionKey(undefined);
          }}
          gatewaySessions={gatewaySessions}
        />

        <SessionSidebar
          agentId={agentId}
          sessionKey={sessionKey}
          gatewaySessions={gatewaySessions}
          onSelectSession={handleSelectSession}
          onNewSession={() => setSessionKey(undefined)}
        />

        <main className="flex-1 min-w-0 flex flex-col">
          <ChatPanel
            agentId={agentId}
            sessionKey={sessionKey}
            onSessionKeyChange={setSessionKey}
            gatewayConnected={gatewayConnected}
            slashDynamicContext={slashDynamicContext}
          />
        </main>

        {rightPanelOpen && (
          <OpenClawLogsPanel
            agentId={agentId}
            sessionKey={sessionKey}
            activeTab={rightPanelTab}
            onClose={() => setRightPanelOpen(false)}
            onTabChange={(tabId) => setRightPanelTab(tabId)}
          />
        )}
      </div>

      {gatewayAlert && (
        <GatewayAlertDialog message={gatewayAlert} onClose={() => setGatewayAlert(null)} />
      )}
    </div>
  );
}
