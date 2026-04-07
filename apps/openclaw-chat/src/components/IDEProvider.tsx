"use client";

import { useEffect, useRef } from "react";
import { useIDEStore } from "@/store";
import type { AgentMetadata, SessionMetadata, SessionMessage } from "@/types";

interface IDEProviderProps {
  children: React.ReactNode;
  initialAgents: AgentMetadata[];
  initialSessions: SessionMetadata[];
  initialMessages: SessionMessage[];
  version: string;
}

export default function IDEProvider({
  children,
  initialAgents,
  initialSessions,
  initialMessages,
  version,
}: IDEProviderProps) {
  const setAgents = useIDEStore((s) => s.setAgents);
  const setSessions = useIDEStore((s) => s.setSessions);
  const setMessages = useIDEStore((s) => s.setMessages);
  const setVersion = useIDEStore((s) => s.setVersion);
  const selectAgent = useIDEStore((s) => s.selectAgent);
  const selectSession = useIDEStore((s) => s.selectSession);
  const initGateway = useIDEStore((s) => s.initGateway);
  const fetchModels = useIDEStore((s) => s.fetchModels);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setAgents(initialAgents);
    setSessions(initialSessions);
    setMessages(initialMessages);
    setVersion(version);

    if (initialAgents.length > 0) {
      const agentWithSessions = initialSessions.length > 0
        ? initialAgents.find((a) => initialSessions.some((s) => s.agentId === a.id))
        : null;
      selectAgent((agentWithSessions ?? initialAgents[0]).id);
    }
    if (initialSessions.length > 0) {
      selectSession(initialSessions[0].id);
    }

    initGateway();
    fetchModels();
  }, [initialAgents, initialSessions, initialMessages, version, setAgents, setSessions, setMessages, setVersion, selectAgent, selectSession, initGateway, fetchModels]);

  return <>{children}</>;
}
