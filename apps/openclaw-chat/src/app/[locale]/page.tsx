import React from "react";
import HomeContent from "./HomeContent";
import IDEProvider from "@/components/IDEProvider";
import type { AgentMetadata, SessionMetadata, SessionMessage } from "@/types";

// Server Component for data fetching
async function ServerDataProvider({ children }: { children: React.ReactNode }) {
  try {
    // Dynamically import server-side modules
    const {
      listAgents,
      getAgentMetadata,
      listSessions,
      readSessionMessages,
      readOpenClawConfig,
      listSkills,
      getOpenClawVersion,
      readLogFile,
      getCronStore,
    } = await import("@/lib/data/fs-reader");
    
    const [agentIds, config, version, skills, logs, cronStore] = await Promise.all([
      listAgents().catch(() => []),
      readOpenClawConfig().catch(() => ({})),
      getOpenClawVersion().catch(() => "unknown"),
      listSkills().catch(() => []),
      readLogFile().catch(() => []),
      getCronStore().catch(() => ({ jobs: [] })),
    ]);

    const agents: AgentMetadata[] = [];
    for (const id of agentIds) {
      const meta = await getAgentMetadata(id).catch(() => null);
      if (meta) agents.push(meta);
    }

    let sessions: SessionMetadata[] = [];
    let messages: SessionMessage[] = [];

    for (const agent of agents) {
      sessions = await listSessions(agent.id).catch(() => []);
      if (sessions.length > 0) {
        const latestSession = sessions[0];
        if (latestSession.filePath) {
          messages = await readSessionMessages(latestSession.filePath, 0, 200).catch(() => []);
        }
        break;
      }
    }

    const data = { agents, sessions, messages, version, config, skills, logs, cronJobs: cronStore.jobs ?? [] };
    
    return (
      <IDEProvider
        initialAgents={data.agents}
        initialSessions={data.sessions}
        initialMessages={data.messages}
        version={data.version}
      >
        {children}
      </IDEProvider>
    );
  } catch (error) {
    console.error("Failed to load initial data:", error);
    return (
      <IDEProvider
        initialAgents={[]}
        initialSessions={[]}
        initialMessages={[]}
        version="unknown"
      >
        {children}
      </IDEProvider>
    );
  }
}

export default function Home() {
  return (
    <ServerDataProvider>
      <HomeContent />
    </ServerDataProvider>
  );
}
