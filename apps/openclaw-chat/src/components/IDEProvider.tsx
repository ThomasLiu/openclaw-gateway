"use client";

import { useEffect, useRef } from "react";
import { useIDEStore } from "@/store";
import { useAppTimers, useSelectionTimers } from "@/hooks/use-timers";
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
  const agentId = useIDEStore((s) => s.selection.agentId);
  const sessionId = useIDEStore((s) => s.selection.sessionId);
  const sessions = useIDEStore((s) => s.data.sessions);
  const initialized = useRef(false);

  // 初始化全局定时器（Gateway 健康检查、Agent 列表刷新）
  useAppTimers();

  // 获取当前选中 session 的 filePath
  const currentSessionPath = sessionId && sessions.find(s => s.id === sessionId)?.filePath || null;

  // 初始化选择相关的动态定时器（Session 列表、消息刷新）
  useSelectionTimers(agentId, currentSessionPath);

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

    // 初始数据获取（定时器会自动接管后续轮询）
    initGateway();
    fetchModels();
  }, [initialAgents, initialSessions, initialMessages, version, setAgents, setSessions, setMessages, setVersion, selectAgent, selectSession, initGateway, fetchModels]);

  return <>{children}</>;
}
