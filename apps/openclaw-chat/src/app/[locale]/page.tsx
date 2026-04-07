import TopBar from "@/components/layout/TopBar";
import LeftSidebar from "@/components/layout/LeftSidebar";
import MainContent from "@/components/layout/MainContent";
import { RightSidebar } from "@/components/layout/RightSidebar";
import IDEProvider from "@/components/IDEProvider";
import {
  listAgents,
  getAgentMetadata,
  listSessions,
  readSessionMessages,
  readOpenClawConfig,
  listSkills,
  getOpenClawVersion,
  readLogFile,
  getCronStore,
  listWorkspaceFiles,
} from "@/lib/data/fs-reader";
import type { AgentMetadata, SessionMetadata, SessionMessage } from "@/types";

async function getServerData() {
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

  return { agents, sessions, messages, version, config, skills, logs, cronJobs: cronStore.jobs ?? [] };
}

export default async function Home() {
  const data = await getServerData();

  return (
    <IDEProvider
      initialAgents={data.agents}
      initialSessions={data.sessions}
      initialMessages={data.messages}
      version={data.version}
    >
      <div className="h-full flex flex-col bg-bg-primary">
        <TopBar version={data.version} />
        <div className="flex-1 flex overflow-hidden relative">
          <LeftSidebar
            initialAgents={data.agents}
            initialSessions={data.sessions}
          />
          <MainContent
            messages={data.messages}
            isRunning={false}
            models={[]}
          />
          <RightSidebar
            agentId={data.sessions.length > 0 ? data.sessions[0].agentId : data.agents[0]?.id}
          />
        </div>
      </div>
    </IDEProvider>
  );
}
