"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComposerProps, ChatAttachment } from "./chat-types";

// ============================================================================
// 常量 & 类型
// ============================================================================

/** Token 估算阈值（低于此不显示） */
const TOKEN_ESTIMATE_MIN_LENGTH = 100;

/** 最大高度 */
const MAX_HEIGHT = 150;

/** Slash 命令参数选项定义 */
type ArgOption = {
  value: string;
  description: string;
  descriptionZh?: string;
};

/** Slash 命令详细参数定义 */
type ArgSpec = {
  hint: string;
  options?: ArgOption[];
  description?: string;
  descriptionZh?: string;
  /** 动态建议的 API 端点（可选） */
  suggestionsKey?: string;
};

/** Slash 命令定义 */
type SlashCommand = {
  name: string;
  description: string;
  icon: string;
  category: "session" | "model" | "agents" | "tools" | "status" | "management" | "options" | "media";
  /** 是否接受参数 */
  acceptsArgs?: boolean;
  /** 参数提示（简单字符串形式） */
  argHint?: string;
  /** 详细说明（英文） */
  detail?: string;
  /** 详细说明（中文） */
  detailZh?: string;
  /** 参数详细定义 */
  args?: ArgSpec[];
};

/** 内置 slash 命令 (完整列表，来源: ai-reference-sources/openclaw) */
const SLASH_COMMANDS: SlashCommand[] = [
  // 会话命令
  {
    name: "new",
    description: "新建会话",
    icon: "plus",
    category: "session",
    acceptsArgs: true,
    detail: "Create a new chat session. Without arguments, creates a blank session. With arguments, creates a session with the given message.",
    detailZh: "创建新的聊天会话。无参数时创建空白会话，带参数时创建包含指定消息的会话。",
    args: [{ hint: "[message]", description: "Optional initial message for the new session", descriptionZh: "可选的会话初始消息" }],
  },
  {
    name: "reset",
    description: "重置当前会话",
    icon: "refresh",
    category: "session",
    acceptsArgs: true,
    detail: "Reset the current session, clearing all messages and context. Prompts for confirmation if session has significant content.",
    detailZh: "重置当前会话，清除所有消息和上下文。如果会话有重要内容会提示确认。",
    args: [{ hint: "[confirm]", options: [
      { value: "yes", description: "Skip confirmation and reset immediately", descriptionZh: "跳过确认并立即重置" },
    ], description: "Pass 'yes' to skip confirmation prompt", descriptionZh: "传入 'yes' 跳过确认提示" }],
  },
  {
    name: "stop",
    description: "停止当前生成",
    icon: "stop",
    category: "session",
    detail: "Stop the currently streaming response from the AI. Useful when the response is taking too long or you want to try a different approach.",
    detailZh: "停止 AI 当前正在流式输出的响应。当响应时间过长或想尝试不同方法时很有用。",
  },
  {
    name: "compact",
    description: "压缩会话上下文",
    icon: "compress",
    category: "session",
    acceptsArgs: true,
    detail: "Compact the conversation context by summarizing older messages to save tokens while preserving key information.",
    detailZh: "通过总结早期消息来压缩会话上下文，在保留关键信息的同时节省 token。",
    args: [{ hint: "[level]", options: [
      { value: "light", description: "Light summarization - preserves most detail", descriptionZh: "轻度总结 - 保留大部分细节" },
      { value: "medium", description: "Medium summarization - balanced approach", descriptionZh: "中度总结 - 平衡方案" },
      { value: "aggressive", description: "Aggressive summarization - maximum token savings", descriptionZh: "激进总结 - 最大程度节省 token" },
    ], description: "Summarization intensity level", descriptionZh: "总结强度级别" }],
  },
  {
    name: "session",
    description: "管理会话设置",
    icon: "settings",
    category: "session",
    acceptsArgs: true,
    detail: "Manage session settings including idle timeout and max age. Control how long sessions persist and when they auto-expire.",
    detailZh: "管理会话设置，包括空闲超时和最大年龄。控制会话保留时间及自动过期时机。",
    args: [{ hint: "idle|max-age [value]", options: [
      { value: "idle", description: "Set idle timeout", descriptionZh: "设置空闲超时" },
      { value: "max-age", description: "Set max session age", descriptionZh: "设置最大会话年龄" },
    ], description: "Set idle timeout or max session age", descriptionZh: "设置空闲超时或最大会话年龄" }],
  },

  // 模型命令
  {
    name: "model",
    description: "显示或设置模型",
    icon: "brain",
    category: "model",
    acceptsArgs: true,
    detail: "Display available models or switch to a different AI model. Shows model capabilities and pricing if no argument provided.",
    detailZh: "显示可用模型或切换到不同的 AI 模型。无参数时显示模型能力和价格。",
    args: [{ hint: "[model-name]", description: "Name of the model to switch to", descriptionZh: "要切换的模型名称", suggestionsKey: "models" }],
  },
  {
    name: "models",
    description: "列出模型提供商",
    icon: "list",
    category: "model",
    acceptsArgs: true,
    detail: "List all available model providers and their available models. Shows pricing, capabilities, and current status.",
    detailZh: "列出所有可用的模型提供商及其模型。显示价格、功能和当前状态。",
    args: [{ hint: "[provider]", description: "Filter by specific provider", descriptionZh: "按特定提供商筛选", suggestionsKey: "providers" }],
  },
  {
    name: "think",
    description: "设置思考级别",
    icon: "brain",
    category: "options",
    acceptsArgs: true,
    detail: "Set the thinking level for reasoning. Higher levels enable more extensive reasoning chains but use more tokens.",
    detailZh: "设置推理的思考级别。更高级别启用更长的推理链但会消耗更多 token。",
    args: [{ hint: "level", options: [
      { value: "off", description: "No extended thinking", descriptionZh: "无扩展思考" },
      { value: "minimal", description: "Minimal reasoning steps", descriptionZh: "最少推理步骤" },
      { value: "low", description: "Low reasoning effort", descriptionZh: "低推理努力" },
      { value: "medium", description: "Balanced reasoning", descriptionZh: "平衡推理" },
      { value: "high", description: "High reasoning effort", descriptionZh: "高推理努力" },
      { value: "xhigh", description: "Maximum reasoning depth", descriptionZh: "最大推理深度" },
    ], description: "Thinking effort level", descriptionZh: "思考努力级别" }],
  },
  {
    name: "thinking",
    description: "同 /think",
    icon: "brain",
    category: "options",
    acceptsArgs: true,
    detail: "Alias for /think command.",
    detailZh: "/think 命令的别名。",
    args: [{ hint: "level", options: [
      { value: "off", description: "No extended thinking", descriptionZh: "无扩展思考" },
      { value: "minimal", description: "Minimal reasoning steps", descriptionZh: "最少推理步骤" },
      { value: "low", description: "Low reasoning effort", descriptionZh: "低推理努力" },
      { value: "medium", description: "Balanced reasoning", descriptionZh: "平衡推理" },
      { value: "high", description: "High reasoning effort", descriptionZh: "高推理努力" },
      { value: "xhigh", description: "Maximum reasoning depth", descriptionZh: "最大推理深度" },
    ], description: "Thinking effort level", descriptionZh: "思考努力级别" }],
  },
  {
    name: "t",
    description: "同 /think",
    icon: "brain",
    category: "options",
    acceptsArgs: true,
    detail: "Short form of /think command.",
    detailZh: "/think 命令的简写形式。",
    args: [{ hint: "level", options: [
      { value: "off", description: "No extended thinking", descriptionZh: "无扩展思考" },
      { value: "minimal", description: "Minimal reasoning steps", descriptionZh: "最少推理步骤" },
      { value: "low", description: "Low reasoning effort", descriptionZh: "低推理努力" },
      { value: "medium", description: "Balanced reasoning", descriptionZh: "平衡推理" },
      { value: "high", description: "High reasoning effort", descriptionZh: "高推理努力" },
      { value: "xhigh", description: "Maximum reasoning depth", descriptionZh: "最大推理深度" },
    ], description: "Thinking effort level", descriptionZh: "思考努力级别" }],
  },
  {
    name: "fast",
    description: "切换快速模式",
    icon: "zap",
    category: "options",
    acceptsArgs: true,
    detail: "Toggle fast mode which prioritizes response speed over depth. Useful for quick questions and simple tasks.",
    detailZh: "切换快速模式，优先考虑响应速度而非深度。适用于快速问题和简单任务。",
    args: [{ hint: "status|on|off", options: [
      { value: "status", description: "Show current fast mode status", descriptionZh: "显示当前快速模式状态" },
      { value: "on", description: "Enable fast mode", descriptionZh: "启用快速模式" },
      { value: "off", description: "Disable fast mode", descriptionZh: "禁用快速模式" },
    ], description: "Fast mode action", descriptionZh: "快速模式操作" }],
  },
  {
    name: "verbose",
    description: "切换详细模式",
    icon: "maximize",
    category: "options",
    acceptsArgs: true,
    detail: "Toggle verbose mode which includes more detailed explanations and reasoning traces in responses.",
    detailZh: "切换详细模式，在响应中包含更详细的解释和推理过程。",
    args: [{ hint: "on|off", options: [
      { value: "on", description: "Enable verbose output", descriptionZh: "启用详细输出" },
      { value: "off", description: "Disable verbose output", descriptionZh: "禁用详细输出" },
    ], description: "Verbose mode toggle", descriptionZh: "详细模式开关" }],
  },
  {
    name: "v",
    description: "同 /verbose",
    icon: "maximize",
    category: "options",
    acceptsArgs: true,
    detail: "Short form of /verbose command.",
    detailZh: "/verbose 命令的简写形式。",
    args: [{ hint: "on|off", options: [
      { value: "on", description: "Enable verbose output", descriptionZh: "启用详细输出" },
      { value: "off", description: "Disable verbose output", descriptionZh: "禁用详细输出" },
    ], description: "Verbose mode toggle", descriptionZh: "详细模式开关" }],
  },
  {
    name: "reasoning",
    description: "切换推理可见性",
    icon: "git-branch",
    category: "options",
    acceptsArgs: true,
    detail: "Control visibility of reasoning traces. Can show, hide, or stream the internal reasoning process.",
    detailZh: "控制推理过程的可见性。可以显示、隐藏或流式输出内部推理过程。",
    args: [{ hint: "on|off|stream", options: [
      { value: "on", description: "Show reasoning after response", descriptionZh: "在响应后显示推理" },
      { value: "off", description: "Hide reasoning entirely", descriptionZh: "完全隐藏推理" },
      { value: "stream", description: "Stream reasoning in real-time", descriptionZh: "实时流式显示推理" },
    ], description: "Reasoning visibility mode", descriptionZh: "推理可见性模式" }],
  },
  {
    name: "reason",
    description: "同 /reasoning",
    icon: "git-branch",
    category: "options",
    acceptsArgs: true,
    detail: "Alias for /reasoning command.",
    detailZh: "/reasoning 命令的别名。",
    args: [{ hint: "on|off|stream", options: [
      { value: "on", description: "Show reasoning after response", descriptionZh: "在响应后显示推理" },
      { value: "off", description: "Hide reasoning entirely", descriptionZh: "完全隐藏推理" },
      { value: "stream", description: "Stream reasoning in real-time", descriptionZh: "实时流式显示推理" },
    ], description: "Reasoning visibility mode", descriptionZh: "推理可见性模式" }],
  },
  {
    name: "elevated",
    description: "切换提升模式",
    icon: "shield",
    category: "options",
    acceptsArgs: true,
    detail: "Toggle elevated mode which grants temporary elevated privileges for sensitive operations like exec or file access.",
    detailZh: "切换提升模式，临时授予敏感操作（如 exec 或文件访问）的提升权限。",
    args: [{ hint: "on|off|ask|full", options: [
      { value: "on", description: "Enable elevated mode", descriptionZh: "启用提升模式" },
      { value: "off", description: "Disable elevated mode", descriptionZh: "禁用提升模式" },
      { value: "ask", description: "Ask before each elevated action", descriptionZh: "每次提升操作前询问" },
      { value: "full", description: "Full elevated mode with no prompts", descriptionZh: "完全提升模式，无提示" },
    ], description: "Elevated mode level", descriptionZh: "提升模式级别" }],
  },
  {
    name: "elev",
    description: "同 /elevated",
    icon: "shield",
    category: "options",
    acceptsArgs: true,
    detail: "Short form of /elevated command.",
    detailZh: "/elevated 命令的简写形式。",
    args: [{ hint: "on|off|ask|full", options: [
      { value: "on", description: "Enable elevated mode", descriptionZh: "启用提升模式" },
      { value: "off", description: "Disable elevated mode", descriptionZh: "禁用提升模式" },
      { value: "ask", description: "Ask before each elevated action", descriptionZh: "每次提升操作前询问" },
      { value: "full", description: "Full elevated mode with no prompts", descriptionZh: "完全提升模式，无提示" },
    ], description: "Elevated mode level", descriptionZh: "提升模式级别" }],
  },
  {
    name: "exec",
    description: "设置 exec 默认值",
    icon: "terminal",
    category: "options",
    acceptsArgs: true,
    detail: "Configure default execution behavior for code blocks and terminal commands.",
    detailZh: "配置代码块和终端命令的默认执行行为。",
    args: [{ hint: "[setting]", options: [
      { value: "on", description: "Enable auto-execution", descriptionZh: "启用自动执行" },
      { value: "off", description: "Disable auto-execution", descriptionZh: "禁用自动执行" },
      { value: "status", description: "Show exec status", descriptionZh: "显示执行状态" },
    ], description: "Execution setting to configure", descriptionZh: "要配置的执行设置" }],
  },
  {
    name: "queue",
    description: "调整队列设置",
    icon: "list-ordered",
    category: "options",
    acceptsArgs: true,
    detail: "Configure queue behavior for handling multiple messages and concurrent requests.",
    detailZh: "配置队列行为以处理多条消息和并发请求。",
    args: [{ hint: "[setting]", options: [
      { value: "on", description: "Enable message queuing", descriptionZh: "启用消息排队" },
      { value: "off", description: "Disable message queuing", descriptionZh: "禁用消息排队" },
      { value: "clear", description: "Clear the message queue", descriptionZh: "清空消息队列" },
      { value: "status", description: "Show queue status", descriptionZh: "显示队列状态" },
    ], description: "Queue setting to configure", descriptionZh: "要配置的队列设置" }],
  },

  // 代理命令
  {
    name: "agents",
    description: "列出线程绑定的代理",
    icon: "users",
    category: "agents",
    detail: "List all agents bound to the current thread, showing their status, capabilities, and recent activity.",
    detailZh: "列出绑定到当前线程的所有代理，显示其状态、功能和最近活动。",
  },
  {
    name: "subagents",
    description: "管理子代理运行",
    icon: "layers",
    category: "management",
    acceptsArgs: true,
    detail: "Manage sub-agent executions including listing, killing, viewing logs, and spawning new sub-agents.",
    detailZh: "管理子代理执行，包括列表、终止、查看日志和生成新子代理。",
    args: [{ hint: "action", options: [
      { value: "list", description: "List all running sub-agents", descriptionZh: "列出所有运行中的子代理" },
      { value: "kill", description: "Terminate a running sub-agent", descriptionZh: "终止运行中的子代理" },
      { value: "log", description: "View logs for a sub-agent", descriptionZh: "查看子代理日志" },
      { value: "info", description: "Get detailed info about a sub-agent", descriptionZh: "获取子代理详细信息" },
      { value: "send", description: "Send a message to a sub-agent", descriptionZh: "向子代理发送消息" },
      { value: "steer", description: "Provide guidance to a sub-agent", descriptionZh: "为子代理提供指导" },
      { value: "spawn", description: "Spawn a new sub-agent", descriptionZh: "生成新的子代理" },
    ], description: "Action to perform on sub-agents", descriptionZh: "对子代理执行的操作" }],
  },
  {
    name: "kill",
    description: "终止运行中的子代理",
    icon: "x-circle",
    category: "management",
    acceptsArgs: true,
    detail: "Terminate a running sub-agent by its ID. Use /subagents list to find running agent IDs.",
    detailZh: "通过 ID 终止运行中的子代理。使用 /subagents list 查找运行中的代理 ID。",
    args: [{ hint: "<agent-id>", description: "ID of the agent to terminate", descriptionZh: "要终止的代理 ID", suggestionsKey: "running-agents" }],
  },
  {
    name: "steer",
    description: "向运行中的子代理发送指导",
    icon: "navigation",
    category: "management",
    acceptsArgs: true,
    detail: "Send steering instructions to a running sub-agent to guide its behavior without interrupting its task.",
    detailZh: "向运行中的子代理发送引导指令，在不中断其任务的情况下指导其行为。",
    args: [{ hint: "<agent-id> <message>", description: "Agent ID and steering message", descriptionZh: "代理 ID 和引导消息", suggestionsKey: "running-agents" }],
  },
  {
    name: "tell",
    description: "同 /steer",
    icon: "navigation",
    category: "management",
    acceptsArgs: true,
    detail: "Alias for /steer command.",
    detailZh: "/steer 命令的别名。",
    args: [{ hint: "<agent-id> <message>", description: "Agent ID and message", descriptionZh: "代理 ID 和消息", suggestionsKey: "running-agents" }],
  },
  {
    name: "focus",
    description: "将会话绑定到目标",
    icon: "target",
    category: "management",
    acceptsArgs: true,
    detail: "Bind the current session to a specific target entity, enabling context-aware responses.",
    detailZh: "将会话绑定到特定目标实体，启用上下文感知响应。",
    args: [{ hint: "<target>", description: "Target to bind session to", descriptionZh: "要绑定会话的目标", suggestionsKey: "sessions" }],
  },
  {
    name: "unfocus",
    description: "移除当前绑定",
    icon: "x",
    category: "management",
    detail: "Remove the current session binding, returning to general-purpose mode.",
    detailZh: "移除当前会话绑定，返回通用模式。",
  },

  // 工具命令
  {
    name: "help",
    description: "显示可用命令",
    icon: "help-circle",
    category: "status",
    detail: "Display help information about available commands and how to use them.",
    detailZh: "显示可用命令及使用方法的信息。",
  },
  {
    name: "commands",
    description: "列出所有斜杠命令",
    icon: "terminal",
    category: "status",
    detail: "List all available slash commands with their descriptions.",
    detailZh: "列出所有可用的斜杠命令及其描述。",
  },
  {
    name: "tools",
    description: "列出可用运行时工具",
    icon: "tool",
    category: "status",
    acceptsArgs: true,
    detail: "List all available runtime tools and their current status.",
    detailZh: "列出所有可用的运行时工具及其当前状态。",
    args: [{ hint: "compact|verbose", options: [
      { value: "compact", description: "Show compact list view", descriptionZh: "显示紧凑列表视图" },
      { value: "verbose", description: "Show detailed tool information", descriptionZh: "显示详细工具信息" },
    ], description: "Display format", descriptionZh: "显示格式" }],
  },
  {
    name: "status",
    description: "显示当前状态",
    icon: "activity",
    category: "status",
    detail: "Display current system status including model, session info, token usage, and active features.",
    detailZh: "显示当前系统状态，包括模型、会话信息、token 使用情况和活动功能。",
  },
  {
    name: "tasks",
    description: "列出后台任务",
    icon: "list-checks",
    category: "status",
    detail: "List all background tasks and their current status.",
    detailZh: "列出所有后台任务及其当前状态。",
  },
  {
    name: "usage",
    description: "显示用量/成本摘要",
    icon: "bar-chart-2",
    category: "options",
    acceptsArgs: true,
    detail: "Display usage statistics and cost summary for the current session or time period.",
    detailZh: "显示当前会话或时间段的用量统计和成本摘要。",
    args: [{ hint: "off|tokens|full|cost", options: [
      { value: "off", description: "Disable usage display", descriptionZh: "禁用用量显示" },
      { value: "tokens", description: "Show only token usage", descriptionZh: "仅显示 token 用量" },
      { value: "full", description: "Show complete usage stats", descriptionZh: "显示完整用量统计" },
      { value: "cost", description: "Show cost breakdown", descriptionZh: "显示成本明细" },
    ], description: "Usage display mode", descriptionZh: "用量显示模式" }],
  },
  {
    name: "context",
    description: "解释上下文如何构建",
    icon: "file-text",
    category: "status",
    acceptsArgs: true,
    detail: "Explain how the current context is built, showing which messages and data contribute to the context window.",
    detailZh: "解释当前上下文是如何构建的，显示哪些消息和数据对上下文窗口有贡献。",
    args: [{ hint: "[detail]", options: [
      { value: "detail", description: "Show detailed context breakdown", descriptionZh: "显示详细的上下文分解" },
      { value: "tokens", description: "Show token count per message", descriptionZh: "显示每条消息的 token 数" },
    ], description: "Show detailed context breakdown", descriptionZh: "显示详细的上下文分解" }],
  },
  {
    name: "whoami",
    description: "显示发送者 ID",
    icon: "user",
    category: "status",
    detail: "Display the current sender ID and associated metadata.",
    detailZh: "显示当前发送者 ID 和关联的元数据。",
  },
  {
    name: "id",
    description: "同 /whoami",
    icon: "user",
    category: "status",
    detail: "Alias for /whoami command.",
    detailZh: "/whoami 命令的别名。",
  },
  {
    name: "btw",
    description: "提问但不影响会话上下文",
    icon: "message-circle",
    category: "tools",
    acceptsArgs: true,
    detail: "Ask a question that won't affect the conversation context. Useful for quick clarifications without derailing the main discussion.",
    detailZh: "提出一个不影响会话上下文的问题。适用于在不偏离主讨论的情况下快速澄清。",
    args: [{ hint: "<question>", description: "Question to ask", descriptionZh: "要问的问题" }],
  },
  {
    name: "export",
    description: "导出会话到 HTML 文件",
    icon: "download",
    category: "status",
    acceptsArgs: true,
    detail: "Export the current session to an HTML file for archiving or sharing.",
    detailZh: "将会话导出为 HTML 文件以便存档或分享。",
    args: [{ hint: "[filename]", description: "Optional output filename", descriptionZh: "可选的输出文件名" }],
  },
  {
    name: "export-session",
    description: "同 /export",
    icon: "download",
    category: "status",
    acceptsArgs: true,
    detail: "Alias for /export command.",
    detailZh: "/export 命令的别名。",
    args: [{ hint: "[filename]", description: "Optional output filename", descriptionZh: "可选的输出文件名" }],
  },
  {
    name: "skill",
    description: "按名称运行技能",
    icon: "zap",
    category: "tools",
    acceptsArgs: true,
    detail: "Run a specific skill by name with optional input parameters. Skills are reusable prompt templates or workflows.",
    detailZh: "按名称运行特定技能，带可选的输入参数。技能是可复用的提示模板或工作流程。",
    args: [{ hint: "name [input]", description: "Skill name and optional input", descriptionZh: "技能名称和可选输入", suggestionsKey: "skills" }],
  },
  {
    name: "restart",
    description: "重启 OpenClaw",
    icon: "refresh-cw",
    category: "tools",
    detail: "Restart the OpenClaw service. This will reset all runtime state and reinitialize components.",
    detailZh: "重启 OpenClaw 服务。这将重置所有运行时状态并重新初始化组件。",
  },

  // 管理命令
  {
    name: "allowlist",
    description: "列出/添加/移除白名单条目",
    icon: "check-circle",
    category: "management",
    acceptsArgs: true,
    detail: "Manage the allowlist for controlling what operations are permitted without confirmation.",
    detailZh: "管理白名单以控制哪些操作无需确认即可执行。",
    args: [{ hint: "add|remove|list [entry]", options: [
      { value: "add", description: "Add an entry to the allowlist", descriptionZh: "添加条目到白名单" },
      { value: "remove", description: "Remove an entry from the allowlist", descriptionZh: "从白名单移除条目" },
      { value: "list", description: "List all allowlist entries", descriptionZh: "列出所有白名单条目" },
    ], description: "Action and optional entry", descriptionZh: "操作和可选条目" }],
  },
  {
    name: "approve",
    description: "批准或拒绝 exec 请求",
    icon: "check",
    category: "management",
    acceptsArgs: true,
    detail: "Approve or deny pending exec requests from the AI.",
    detailZh: "批准或拒绝来自 AI 的待处理 exec 请求。",
    args: [{ hint: "<request-id> <approve|deny>", options: [
      { value: "approve", description: "Approve the pending exec request", descriptionZh: "批准待处理的 exec 请求" },
      { value: "deny", description: "Deny the pending exec request", descriptionZh: "拒绝待处理的 exec 请求" },
    ], description: "Request ID and decision", descriptionZh: "请求 ID 和决定" }],
  },
  {
    name: "acp",
    description: "管理 ACP 会话和运行时选项",
    icon: "settings",
    category: "management",
    acceptsArgs: true,
    detail: "Manage ACP (Agent Communication Protocol) session settings and runtime options.",
    detailZh: "管理 ACP（代理通信协议）会话设置和运行时选项。",
    args: [{ hint: "[setting]", options: [
      { value: "show", description: "Show current ACP settings", descriptionZh: "显示当前 ACP 设置" },
      { value: "reset", description: "Reset ACP settings to defaults", descriptionZh: "重置 ACP 设置为默认值" },
    ], description: "ACP setting to manage", descriptionZh: "要管理的 ACP 设置" }],
  },
  {
    name: "config",
    description: "显示或设置配置值",
    icon: "sliders",
    category: "management",
    acceptsArgs: true,
    detail: "Display or modify configuration values. Supports showing all config, or getting/setting specific values.",
    detailZh: "显示或修改配置值。支持显示所有配置，或获取/设置特定值。",
    args: [{ hint: "show|get|set|unset", options: [
      { value: "show", description: "Display all configuration", descriptionZh: "显示所有配置" },
      { value: "get", description: "Get a specific config value", descriptionZh: "获取特定配置值" },
      { value: "set", description: "Set a config value", descriptionZh: "设置配置值" },
      { value: "unset", description: "Unset a config value", descriptionZh: "取消设置配置值" },
    ], description: "Config action", descriptionZh: "配置操作" }],
  },
  {
    name: "mcp",
    description: "显示或设置 OpenClaw MCP 服务器",
    icon: "server",
    category: "management",
    acceptsArgs: true,
    detail: "Manage MCP (Model Context Protocol) servers that provide additional tools and capabilities.",
    detailZh: "管理提供额外工具和功能的 MCP（模型上下文协议）服务器。",
    args: [{ hint: "[action]", options: [
      { value: "list", description: "List all MCP servers", descriptionZh: "列出所有 MCP 服务器" },
      { value: "show", description: "Show MCP server details", descriptionZh: "显示 MCP 服务器详情" },
      { value: "add", description: "Add an MCP server", descriptionZh: "添加 MCP 服务器" },
      { value: "remove", description: "Remove an MCP server", descriptionZh: "移除 MCP 服务器" },
    ], description: "MCP server action", descriptionZh: "MCP 服务器操作" }],
  },
  {
    name: "plugins",
    description: "列出/显示/启用/禁用插件",
    icon: "package",
    category: "management",
    acceptsArgs: true,
    detail: "Manage plugins including listing available plugins, showing plugin details, enabling or disabling them.",
    detailZh: "管理插件，包括列出可用插件、显示插件详情、启用或禁用插件。",
    args: [{ hint: "list|show|enable|disable [plugin]", options: [
      { value: "list", description: "List all available plugins", descriptionZh: "列出所有可用插件" },
      { value: "show", description: "Show plugin details", descriptionZh: "显示插件详情" },
      { value: "enable", description: "Enable a plugin", descriptionZh: "启用插件" },
      { value: "disable", description: "Disable a plugin", descriptionZh: "禁用插件" },
    ], description: "Plugin action and optional plugin name", descriptionZh: "插件操作和可选插件名称" }],
  },
  {
    name: "plugin",
    description: "同 /plugins",
    icon: "package",
    category: "management",
    acceptsArgs: true,
    detail: "Alias for /plugins command.",
    detailZh: "/plugins 命令的别名。",
    args: [{ hint: "list|show|enable|disable [plugin]", options: [
      { value: "list", description: "List all available plugins", descriptionZh: "列出所有可用插件" },
      { value: "show", description: "Show plugin details", descriptionZh: "显示插件详情" },
      { value: "enable", description: "Enable a plugin", descriptionZh: "启用插件" },
      { value: "disable", description: "Disable a plugin", descriptionZh: "禁用插件" },
    ], description: "Plugin action and optional plugin name", descriptionZh: "插件操作和可选插件名称" }],
  },
  {
    name: "debug",
    description: "设置运行时调试覆盖",
    icon: "bug",
    category: "management",
    acceptsArgs: true,
    detail: "Set runtime debug overrides to enable verbose logging or trace specific operations.",
    detailZh: "设置运行时调试覆盖以启用详细日志或跟踪特定操作。",
    args: [{ hint: "<key> <value>", options: [
      { value: "on", description: "Enable all debug flags", descriptionZh: "启用所有调试标志" },
      { value: "off", description: "Disable all debug flags", descriptionZh: "禁用所有调试标志" },
    ], description: "Debug key and override value", descriptionZh: "调试键和覆盖值" }],
  },
  {
    name: "activation",
    description: "设置群组激活模式",
    icon: "users",
    category: "management",
    acceptsArgs: true,
    detail: "Set how group activations are handled - either always active or only when mentioned.",
    detailZh: "设置群组激活的处理方式 - 始终激活或仅在被提及时激活。",
    args: [{ hint: "mention|always", options: [
      { value: "mention", description: "Only activate when mentioned", descriptionZh: "仅在被提及时激活" },
      { value: "always", description: "Always active in group", descriptionZh: "在群组中始终活跃" },
    ], description: "Activation mode", descriptionZh: "激活模式" }],
  },
  {
    name: "send",
    description: "设置发送策略",
    icon: "send",
    category: "management",
    acceptsArgs: true,
    detail: "Configure message sending strategy - enable, disable, or use inherit mode.",
    detailZh: "配置消息发送策略 - 启用、禁用或使用继承模式。",
    args: [{ hint: "on|off|inherit", options: [
      { value: "on", description: "Enable automatic sending", descriptionZh: "启用自动发送" },
      { value: "off", description: "Disable automatic sending", descriptionZh: "禁用自动发送" },
      { value: "inherit", description: "Use inherited setting", descriptionZh: "使用继承的设置" },
    ], description: "Send policy mode", descriptionZh: "发送策略模式" }],
  },

  // 媒体命令
  {
    name: "tts",
    description: "控制文本转语音",
    icon: "volume-2",
    category: "media",
    acceptsArgs: true,
    detail: "Control text-to-speech settings and playback for AI responses.",
    detailZh: "控制 AI 响应的文本转语音设置和播放。",
    args: [{ hint: "[setting]", options: [
      { value: "on", description: "Enable text-to-speech", descriptionZh: "启用文本转语音" },
      { value: "off", description: "Disable text-to-speech", descriptionZh: "禁用文本转语音" },
      { value: "status", description: "Show TTS status", descriptionZh: "显示 TTS 状态" },
    ], description: "TTS setting to adjust", descriptionZh: "要调整的 TTS 设置" }],
  },
];

const COMMAND_ICONS: Record<string, React.ReactNode> = {
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  trash: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  ),
  refresh: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  ),
  "refresh-cw": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  ),
  stop: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    </svg>
  ),
  brain: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4.5a2.5 2.5 0 00-4.96-.46 2.5 2.5 0 00-1.98 3 2.5 2.5 0 00.47 3.13 2.5 2.5 0 003.13.47 2.5 2.5 0 003.36 4.96A2.5 2.5 0 0012 19.5a2.5 2.5 0 004.96.46 2.5 2.5 0 001.98-3 2.5 2.5 0 00-.47-3.13 2.5 2.5 0 00-3.13-.47 2.5 2.5 0 00-3.36-4.96A2.5 2.5 0 0012 4.5" />
      <path d="M12 4.5v15" />
      <path d="M4.5 12h15" />
    </svg>
  ),
  zap: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  "bar-chart": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  "bar-chart-2": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  download: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  book: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  ),
  "help-circle": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  terminal: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
  tool: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  activity: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  "list-checks": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  user: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  "message-circle": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  sliders: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  ),
  server: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  ),
  package: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  bug: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2l1.88 1.88" />
      <path d="M14.12 3.88L16 2" />
      <path d="M9 7.13v-1a3.003 3.003 0 116 0v1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6z" />
      <path d="M12 20v-9" />
      <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
      <path d="M6 13H2" />
      <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
      <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
      <path d="M22 13h-4" />
      <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
    </svg>
  ),
  "x-circle": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  navigation: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  ),
  target: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  x: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  layers: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  maximize: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
    </svg>
  ),
  "git-branch": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 01-9 9" />
    </svg>
  ),
  shield: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  list: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  "list-ordered": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <path d="M4 6h1v4" />
      <path d="M4 10h2" />
      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
    </svg>
  ),
  "file-text": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  send: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  "check-circle": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  "volume-2": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  ),
  compress: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  ),
};

const CATEGORY_LABELS: Record<string, string> = {
  session: "会话",
  model: "模型",
  agents: "代理",
  tools: "工具",
  status: "状态",
  management: "管理",
  options: "选项",
  media: "媒体",
};

// ============================================================================
// 语音识别 (STT)
// ============================================================================

type SpeechRecognitionEvent = Event & {
  results: SpeechRecognitionResultList;
  resultIndex: number;
};

type SpeechRecognitionErrorEvent = Event & {
  error: string;
  message?: string;
};

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = globalThis as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SpeechRecognitionCtor | null;
}

function isSttSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

type SttCallbacks = {
  onTranscript: (text: string, isFinal: boolean) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
};

let activeRecognition: SpeechRecognitionInstance | null = null;

function startStt(callbacks: SttCallbacks): boolean {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    callbacks.onError?.("当前浏览器不支持语音识别");
    return false;
  }

  stopStt();

  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = navigator.language || "zh-CN";

  recognition.addEventListener("start", () => callbacks.onStart?.());

  recognition.addEventListener("result", (event) => {
    const speechEvent = event as unknown as SpeechRecognitionEvent;
    let interimTranscript = "";
    let finalTranscript = "";

    for (let i = speechEvent.resultIndex; i < speechEvent.results.length; i++) {
      const result = speechEvent.results[i];
      if (!result?.[0]) continue;
      const transcript = result[0].transcript;
      if (result.isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    if (finalTranscript) {
      callbacks.onTranscript(finalTranscript, true);
    } else if (interimTranscript) {
      callbacks.onTranscript(interimTranscript, false);
    }
  });

  recognition.addEventListener("error", (event) => {
    const speechEvent = event as unknown as SpeechRecognitionErrorEvent;
    if (speechEvent.error === "aborted" || speechEvent.error === "no-speech") {
      return;
    }
    callbacks.onError?.(speechEvent.error);
  });

  recognition.addEventListener("end", () => {
    if (activeRecognition === recognition) {
      activeRecognition = null;
    }
    callbacks.onEnd?.();
  });

  activeRecognition = recognition;
  recognition.start();
  return true;
}

function stopStt(): void {
  if (activeRecognition) {
    const r = activeRecognition;
    activeRecognition = null;
    try {
      r.stop();
    } catch {
      // already stopped
    }
  }
}

// ============================================================================
// 工具函数
// ============================================================================

/** 估算 token 数量 */
function tokenEstimate(text: string): string | null {
  if (text.length < TOKEN_ESTIMATE_MIN_LENGTH) return null;
  return `~${Math.ceil(text.length / 4)} tokens`;
}

/** 生成附件 ID */
function generateAttachmentId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 获取 slash 命令补全 */
function getSlashCommandCompletions(filter: string): SlashCommand[] {
  if (!filter) return SLASH_COMMANDS;
  const lower = filter.toLowerCase();
  return SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.name.startsWith(lower) ||
      cmd.description.toLowerCase().includes(lower)
  );
}

// ============================================================================
// SlashMenuDetail 子组件 - 右侧详情面板
// ============================================================================

type SuggestionItem = {
  id: string;
  label: string;
};

function SlashMenuDetail({ command, hideDynamicSuggestions = false }: { command: SlashCommand; hideDynamicSuggestions?: boolean }) {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestionLabel, setSuggestionLabel] = useState("");

  // 获取动态建议
  useEffect(() => {
    const argWithSuggestions = command.args?.find((arg) => arg.suggestionsKey);
    if (!argWithSuggestions?.suggestionsKey) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    const key = argWithSuggestions.suggestionsKey;

    // 根据 key 设置标签
    switch (key) {
      case "running-agents":
        setSuggestionLabel("运行中的 Agent");
        break;
      case "sessions":
        setSuggestionLabel("会话列表");
        break;
      case "models":
        setSuggestionLabel("可用模型");
        break;
      case "skills":
        setSuggestionLabel("可用技能");
        break;
      default:
        setSuggestionLabel("可选值");
    }

    fetch(`/api/openclaw/argument-suggestions?key=${encodeURIComponent(key)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.agents) {
          setSuggestions(data.agents);
        } else if (data.sessions) {
          setSuggestions(data.sessions);
        } else if (data.models) {
          setSuggestions(data.models.map((m: { id: string; name?: string; provider?: string }) => ({
            id: m.id,
            label: m.provider ? `${m.name || m.id} (${m.provider})` : (m.name || m.id),
          })));
        } else if (data.skills) {
          setSuggestions(data.skills);
        } else {
          setSuggestions([]);
        }
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, [command]);

  return (
    <div className="flex flex-col w-80 h-80 border-l border-zinc-700 bg-zinc-850 overflow-y-auto">
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 flex items-center justify-center text-zinc-400">
            {COMMAND_ICONS[command.icon] || COMMAND_ICONS.book}
          </span>
          <span className="text-base font-semibold text-zinc-100">/{command.name}</span>
          {command.acceptsArgs && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-zinc-700 text-zinc-400 rounded">
              带参数
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-400">{command.description}</p>
      </div>

      {/* 详细说明 */}
      <div className="px-4 py-3 border-b border-zinc-700/50">
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">说明</h4>
        <p className="text-sm text-zinc-300 leading-relaxed">
          {command.detailZh || command.detail}
        </p>
        {command.detail && command.detailZh && command.detail !== command.detailZh && (
          <p className="mt-2 text-sm text-zinc-500 leading-relaxed italic">
            {command.detail}
          </p>
        )}
      </div>

      {/* 参数说明 */}
      {command.args && command.args.length > 0 && (
        <div className="px-4 py-3 border-b border-zinc-700/50">
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">参数</h4>
          {command.args.map((arg, idx) => (
            <div key={idx} className="mb-3 last:mb-0">
              <div className="flex items-center gap-2 mb-1">
                <code className="px-1.5 py-0.5 bg-zinc-700 text-zinc-300 text-xs rounded font-mono">
                  {arg.hint}
                </code>
              </div>
              {arg.descriptionZh && (
                <p className="text-xs text-zinc-400 mb-1">{arg.descriptionZh}</p>
              )}
              {arg.description && (
                <p className="text-xs text-zinc-500 italic">{arg.description}</p>
              )}

              {/* 参数选项 - 静态选项 */}
              {arg.options && arg.options.length > 0 && (
                <div className="mt-2 space-y-1">
                  {arg.options.map((opt) => (
                    <div key={opt.value} className="flex items-start gap-2 py-1">
                      <code className="px-1.5 py-0.5 bg-zinc-800 text-emerald-400 text-xs rounded font-mono whitespace-nowrap">
                        {opt.value}
                      </code>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-zinc-300">
                          {opt.descriptionZh || opt.description}
                        </span>
                        {opt.descriptionZh && opt.description && opt.descriptionZh !== opt.description && (
                          <p className="text-xs text-zinc-500 italic truncate">
                            {opt.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 动态建议 - 当参数建议已显示时隐藏 */}
              {arg.suggestionsKey && !hideDynamicSuggestions && (
                <div className="mt-2">
                  <div className="flex items-center gap-1 mb-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-500">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                    <span className="text-xs text-zinc-500">{suggestionLabel}</span>
                  </div>
                  {loading ? (
                    <div className="text-xs text-zinc-500 py-1">加载中...</div>
                  ) : suggestions.length > 0 ? (
                    <div className="space-y-1">
                      {suggestions.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 py-1 px-2 bg-zinc-800/50 rounded cursor-pointer hover:bg-zinc-700/50 transition-colors"
                        >
                          <code className="px-1.5 py-0.5 bg-zinc-700 text-emerald-400 text-xs rounded font-mono whitespace-nowrap">
                            {item.id}
                          </code>
                          <span className="text-xs text-zinc-400 truncate">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500 py-1">暂无可用选项</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 使用示例 */}
      <div className="px-4 py-3">
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">示例</h4>
        <code className="block px-3 py-2 bg-zinc-900 text-zinc-300 text-xs rounded border border-zinc-700/50 font-mono">
          /{command.name}
          {command.args && command.args.length > 0 && command.args[0].hint && (
            <span className="text-zinc-500"> </span>
          )}
          {command.args && command.args.length > 0 && command.args[0].hint && (
            <span className="text-emerald-400">
              {command.args[0].hint}
            </span>
          )}
        </code>
      </div>
    </div>
  );
}

// ============================================================================
// ArgSuggestionsDropdown 子组件 - 参数建议下拉
// ============================================================================

type ArgSuggestionItem = {
  id: string;
  label: string;
};

function ArgSuggestionsDropdown({
  suggestions,
  loading,
  onSelect,
  onClose,
  suggestionLabel,
  selectedIdx,
  onSelectedIdxChange,
}: {
  suggestions: ArgSuggestionItem[];
  loading: boolean;
  onSelect: (value: string) => void;
  onClose: () => void;
  suggestionLabel: string;
  selectedIdx: number;
  onSelectedIdxChange: (idx: number) => void;
}) {
  // 重置选中索引当建议列表变化时
  useEffect(() => {
    onSelectedIdxChange(0);
  }, [suggestions, onSelectedIdxChange]);

  if (suggestions.length === 0 && !loading) return null;

  return (
    <div
      className="border-t border-zinc-700 bg-zinc-800/95 max-h-48 overflow-y-auto"
    >
      {/* 头部 */}
      <div className="px-3 py-1.5 text-xs text-zinc-500 bg-zinc-800/80 border-b border-zinc-700/50 flex items-center justify-between">
        <span>{suggestionLabel}</span>
        <button
          onClick={onClose}
          className="px-1 py-0.5 bg-zinc-700 rounded hover:bg-zinc-600 transition-colors"
        >
          <kbd className="text-zinc-400">Esc</kbd>
        </button>
      </div>

      {/* 建议列表 */}
      {loading ? (
        <div className="px-3 py-2 text-xs text-zinc-500">加载中...</div>
      ) : (
        suggestions.map((item, idx) => (
          <div
            key={item.id}
            className={`px-3 py-2 cursor-pointer transition-colors flex items-center gap-2 ${
              idx === selectedIdx
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200"
            }`}
            onClick={() => onSelect(item.id)}
            onMouseEnter={() => onSelectedIdxChange(idx)}
          >
            <code className="px-1.5 py-0.5 bg-zinc-900 text-emerald-400 text-xs rounded font-mono whitespace-nowrap">
              {item.id}
            </code>
            <span className="text-sm truncate">{item.label}</span>
          </div>
        ))
      )}

      {/* 底部提示 */}
      <div className="px-3 py-1 bg-zinc-800/80 border-t border-zinc-700/50 text-xs text-zinc-500">
        <kbd className="px-1 py-0.5 bg-zinc-700 rounded text-zinc-400">↑↓</kbd> 导航{" "}
        <kbd className="px-1 py-0.5 bg-zinc-700 rounded text-zinc-400">Enter</kbd> 选择
      </div>
    </div>
  );
}

// ============================================================================
// SlashMenu 子组件
// ============================================================================

function SlashMenu({
  commands,
  selectedIndex,
  onSelect,
  onHover,
  inputValue,
  cursorPosition,
  onArgSelect,
  justSelectedCommandRef,
  argSelectedIdx,
  onArgSelectedIdxChange,
  currentArgSuggestionsRef,
}: {
  commands: SlashCommand[];
  selectedIndex: number;
  onSelect: (cmd: SlashCommand) => void;
  onHover: (index: number) => void;
  inputValue: string;
  cursorPosition: number;
  onArgSelect: (argValue: string) => void;
  justSelectedCommandRef?: React.RefObject<SlashCommand | null>;
  argSelectedIdx: number;
  onArgSelectedIdxChange: (idx: number) => void;
  currentArgSuggestionsRef?: React.MutableRefObject<ArgSuggestionItem[]>;
}) {
  // 列表容器的 ref
  const listContainerRef = useRef<HTMLDivElement>(null);
  // 选中项的 ref 映射
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // 滚动选中项到可视区域
  useEffect(() => {
    const item = itemRefs.current.get(selectedIndex);
    if (item && listContainerRef.current) {
      const container = listContainerRef.current;
      const itemTop = item.offsetTop;
      const itemHeight = item.offsetHeight;
      const containerHeight = container.clientHeight;
      const containerScrollTop = container.scrollTop;

      // 如果项不在可视区域内，则滚动
      if (itemTop < containerScrollTop) {
        container.scrollTop = itemTop;
      } else if (itemTop + itemHeight > containerScrollTop + containerHeight) {
        container.scrollTop = itemTop - containerHeight + itemHeight;
      }
    }
  }, [selectedIndex]);

  // 按分类分组
  const grouped = commands.reduce<Record<string, SlashCommand[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  const selectedCommand = commands[selectedIndex];

  // 计算当前参数位置和正在输入的参数值
  const { currentArgIndex, currentArgValue, argSuggestions, argLoading, suggestionLabel } =
    useArgSuggestions(selectedCommand, inputValue, cursorPosition);

  let globalIndex = 0;

  // 刚选中了带参命令时，cursorPosition 还未更新（setTimeout 中），
  // useArgSuggestions 无法正确解析，需要直接从 justSelectedCommandRef 获取建议
  const justSelected = justSelectedCommandRef?.current;
  const forceArgSuggestions: ArgSuggestionItem[] = useMemo(() => {
    if (!justSelected?.args?.[0]?.options) return [];
    return justSelected.args[0].options.map((opt) => ({
      id: opt.value,
      label: opt.descriptionZh || opt.description,
    }));
  }, [justSelected]);

  // 当有参数建议 或 刚选中带参命令时，只显示参数建议下拉
  const showArgSuggestions = argSuggestions.length > 0 || argLoading || forceArgSuggestions.length > 0;

  if (showArgSuggestions) {
    const suggestionsToShow = forceArgSuggestions.length > 0 ? forceArgSuggestions : argSuggestions;
    const loadingToShow = forceArgSuggestions.length > 0 ? false : argLoading;
    const labelToShow = forceArgSuggestions.length > 0 ? "可选值" : suggestionLabel;

    // 同步当前建议列表到父级 ref，供 handleKeyDown 读取
    if (currentArgSuggestionsRef) {
      currentArgSuggestionsRef.current = suggestionsToShow;
    }

    return (
      <div className="absolute left-0 right-0 bottom-full mb-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-50 flex flex-col">
        {/* 参数建议下拉 - 全宽显示 */}
        <ArgSuggestionsDropdown
          suggestions={suggestionsToShow}
          loading={loadingToShow}
          suggestionLabel={labelToShow}
          onSelect={onArgSelect}
          onClose={() => {}}
          selectedIdx={argSelectedIdx}
          onSelectedIdxChange={onArgSelectedIdxChange}
        />
      </div>
    );
  }

  return (
    <div className="absolute left-0 right-0 bottom-full mb-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-50 flex flex-col">
      <div className="flex">
        {/* 左侧命令列表 */}
        <div ref={listContainerRef} className="flex-1 min-w-0 h-80 overflow-y-auto">
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category}>
              <div className="px-3 py-1.5 text-xs text-zinc-500 bg-zinc-800/80 sticky top-0">
                {CATEGORY_LABELS[category] || category}
              </div>
              {cmds.map((cmd) => {
                const idx = globalIndex++;
                return (
                  <div
                    key={cmd.name}
                    ref={(el) => {
                      if (el) itemRefs.current.set(idx, el);
                      else itemRefs.current.delete(idx);
                    }}
                    className={`px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                      idx === selectedIndex
                        ? "bg-zinc-700 text-zinc-100"
                        : "text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200"
                    }`}
                    onClick={() => onSelect(cmd)}
                    onMouseEnter={() => onHover(idx)}
                  >
                    <span className="w-5 h-5 flex items-center justify-center text-zinc-500">
                      {COMMAND_ICONS[cmd.icon] || COMMAND_ICONS.book}
                    </span>
                    <span className="flex-1 text-sm truncate">
                      /{cmd.name}
                      {cmd.args?.[0]?.hint && (
                        <span className="text-zinc-500 font-normal"> {cmd.args[0].hint}</span>
                      )}
                    </span>
                    {!cmd.args?.[0]?.hint && (
                      <span className="text-xs text-zinc-500 truncate">{cmd.description}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          <div className="px-3 py-1.5 bg-zinc-800/80 border-t border-zinc-700 text-xs text-zinc-500">
            <kbd className="px-1 py-0.5 bg-zinc-700 rounded text-zinc-400">↑↓</kbd> 导航{" "}
            <kbd className="px-1 py-0.5 bg-zinc-700 rounded text-zinc-400">Enter</kbd> 选择{" "}
            <kbd className="px-1 py-0.5 bg-zinc-700 rounded text-zinc-400">Esc</kbd> 关闭
          </div>
        </div>

        {/* 右侧详情面板 */}
        {selectedCommand && <SlashMenuDetail key={selectedCommand.name} command={selectedCommand} />}
      </div>
    </div>
  );
}

// ============================================================================
// useArgSuggestions hook - 管理参数建议状态
// ============================================================================

function useArgSuggestions(
  selectedCommand: SlashCommand | undefined,
  inputValue: string,
  cursorPosition: number
) {
  const [argSuggestions, setArgSuggestions] = useState<ArgSuggestionItem[]>([]);
  const [argLoading, setArgLoading] = useState(false);
  const [suggestionLabel, setSuggestionLabel] = useState("");

  // 解析当前参数位置
  const { currentArgIndex, currentArgValue } = useMemo(() => {
    if (!selectedCommand) return { currentArgIndex: -1, currentArgValue: "" };

    // 找到 /command 的位置
    const textBeforeCursor = inputValue.slice(0, cursorPosition);
    const lastSlashIndex = textBeforeCursor.lastIndexOf("/");

    if (lastSlashIndex === -1) return { currentArgIndex: -1, currentArgValue: "" };

    // 提取命令名称和参数部分
    const afterSlash = textBeforeCursor.slice(lastSlashIndex + 1);
    const spaceIndex = afterSlash.indexOf(" ");

    // 如果没有空格，说明正在输入命令名
    if (spaceIndex === -1) return { currentArgIndex: -1, currentArgValue: "" };

    // 提取参数部分
    const argsPart = afterSlash.slice(spaceIndex + 1);
    const args = argsPart.split(/\s+/);

    return {
      currentArgIndex: args.length - 1, // 0-based index of current argument
      currentArgValue: args[args.length - 1] || "",
    };
  }, [selectedCommand, inputValue, cursorPosition]);

  // 获取参数建议
  useEffect(() => {
    if (!selectedCommand || currentArgIndex < 0) {
      setArgSuggestions([]);
      setArgLoading(false);
      return;
    }

    // 获取当前参数的 ArgSpec
    const argSpec = selectedCommand.args?.[currentArgIndex];
    if (!argSpec) {
      setArgSuggestions([]);
      return;
    }

    // 如果参数已经有值，过滤建议
    const suggestionsKey = argSpec.suggestionsKey;
    const staticOptions = argSpec.options;

    if (!suggestionsKey && !staticOptions) {
      setArgSuggestions([]);
      return;
    }

    // 如果有静态选项，直接使用
    if (staticOptions && staticOptions.length > 0) {
      const filtered = currentArgValue
        ? staticOptions.filter(
            (opt) =>
              opt.value.toLowerCase().includes(currentArgValue.toLowerCase()) ||
              (opt.descriptionZh || opt.description).toLowerCase().includes(currentArgValue.toLowerCase())
          )
        : staticOptions;

      setArgSuggestions(
        filtered.map((opt) => ({
          id: opt.value,
          label: opt.descriptionZh || opt.description,
        }))
      );
      setSuggestionLabel("可选值");
      setArgLoading(false);
      return;
    }

    // 获取动态建议
    setArgLoading(true);

    // 设置标签
    switch (suggestionsKey) {
      case "running-agents":
        setSuggestionLabel("运行中的 Agent");
        break;
      case "sessions":
        setSuggestionLabel("会话列表");
        break;
      case "models":
        setSuggestionLabel("可用模型");
        break;
      case "skills":
        setSuggestionLabel("可用技能");
        break;
      default:
        setSuggestionLabel("可选值");
    }

    fetch(`/api/openclaw/argument-suggestions?key=${encodeURIComponent(suggestionsKey!)}`)
      .then((res) => res.json())
      .then((data) => {
        let items: ArgSuggestionItem[] = [];

        if (data.agents) {
          items = data.agents;
        } else if (data.sessions) {
          items = data.sessions;
        } else if (data.models) {
          items = data.models.map((m: { id: string; name?: string; provider?: string }) => ({
            id: m.id,
            label: m.provider ? `${m.name || m.id} (${m.provider})` : (m.name || m.id),
          }));
        } else if (data.skills) {
          items = data.skills;
        }

        // 如果当前参数已有输入，过滤建议
        if (currentArgValue) {
          items = items.filter(
            (item) =>
              item.id.toLowerCase().includes(currentArgValue.toLowerCase()) ||
              item.label.toLowerCase().includes(currentArgValue.toLowerCase())
          );
        }

        setArgSuggestions(items);
      })
      .catch(() => setArgSuggestions([]))
      .finally(() => setArgLoading(false));
  }, [selectedCommand, currentArgIndex, currentArgValue]);

  return { currentArgIndex, currentArgValue, argSuggestions, argLoading, suggestionLabel };
}

// ============================================================================
// 附件预览子组件
// ============================================================================

function AttachmentPreview({
  attachments,
  onRemove,
}: {
  attachments: ChatAttachment[];
  onRemove: (id: string) => void;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex gap-2 p-2 border-t border-zinc-800/50 overflow-x-auto">
      {attachments.map((att) => (
        <div key={att.id} className="relative flex-shrink-0">
          <img
            src={att.dataUrl}
            alt="Attachment"
            className="w-16 h-16 object-cover rounded-lg border border-zinc-700"
          />
          <button
            onClick={() => onRemove(att.id)}
            className="absolute -top-1 -right-1 w-5 h-5 bg-zinc-900 border border-zinc-600 rounded-full
              flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="1" y1="1" x2="9" y2="9" />
              <line x1="9" y1="1" x2="1" y2="9" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Composer 主组件
// ============================================================================

export default function Composer({
  disabled,
  streaming,
  queueLength = 0,
  modelName,
  availableModels = [],
  onModelChange,
  attachments = [],
  onAttachmentsChange,
  onSend,
  onAbort,
  onNewSession,
}: ComposerProps) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const justSelectedCommandRef = useRef<SlashCommand | null>(null);
  const currentArgSuggestionsRef = useRef<ArgSuggestionItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Slash 菜单状态
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuFilter, setSlashMenuFilter] = useState("");
  const [slashCommands, setSlashCommands] = useState<SlashCommand[]>([]);
  const [slashMenuIndex, setSlashMenuIndex] = useState(0);
  const [argSelectedIdx, setArgSelectedIdx] = useState(0);

  // 输入历史状态
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 语音录制状态
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");

  // 浏览器是否支持语音识别
  const sttSupported = typeof window !== "undefined" && isSttSupported();

  // Token 计数
  const tokens = tokenEstimate(draft);

  // 占位符文本
  const placeholder =
    disabled ? "请先选择一个会话" : streaming ? "AI 正在生成中..." : "输入消息，Enter 发送，Shift+Enter 换行...";

  // 自动调整高度
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT)}px`;
  }, []);

  // 处理输入变化
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart ?? 0;
    setDraft(value);
    adjustHeight();

    // 检测 slash 命令
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastSlashIndex = textBeforeCursor.lastIndexOf("/");

    if (lastSlashIndex !== -1) {
      // 检查 slash 是否是命令的开始（前面是空格或字符串开头）
      const charBeforeSlash = lastSlashIndex > 0 ? textBeforeCursor[lastSlashIndex - 1] : ' ';
      if (charBeforeSlash !== ' ' && lastSlashIndex !== 0) {
        // slash 不在空格后面，可能是 URL 或其他内容，关闭菜单
        setSlashMenuOpen(false);
        setSlashMenuFilter("");
        return;
      }

      const textAfterSlash = textBeforeCursor.slice(lastSlashIndex + 1);
      const spaceIndex = textAfterSlash.indexOf(" ");

      // 提取命令名称
      const commandName = spaceIndex === -1
        ? textAfterSlash.trim().toLowerCase()
        : textAfterSlash.slice(0, spaceIndex).trim().toLowerCase();

      // 如果只输入了 /，显示所有命令
      if (commandName.length === 0) {
        setSlashCommands(SLASH_COMMANDS);
        setSlashMenuFilter("");
        setSlashMenuOpen(true);
        setSlashMenuIndex(0);
        return;
      }

      const filtered = getSlashCommandCompletions(commandName);
      if (filtered.length > 0) {
        setSlashCommands(filtered);
        setSlashMenuFilter(commandName);
        setSlashMenuOpen(true);
        // 如果有空格（正在输入参数），选中第一个匹配的命令并显示详情
        if (textAfterSlash.includes(" ")) {
          setSlashMenuIndex(0);
        } else {
          setSlashMenuIndex(0);
        }
        return;
      }
    }
    setSlashMenuOpen(false);
    setSlashMenuFilter("");
  }, [adjustHeight]);

  // 选择参数建议值（定义在 handleKeyDown 之前，因为 handleKeyDown 引用它）
  const handleArgSelect = useCallback((argValue: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart ?? 0;
    const textBeforeCursor = draft.slice(0, cursorPos);
    const lastSlashIndex = textBeforeCursor.lastIndexOf("/");

    if (lastSlashIndex === -1) return;

    // 找到命令名称和参数部分的边界
    const afterSlash = textBeforeCursor.slice(lastSlashIndex + 1);
    const spaceIndex = afterSlash.indexOf(" ");

    if (spaceIndex === -1) return;

    // 找到参数部分（从命令后的空格开始到光标位置）
    const argsStart = lastSlashIndex + 1 + spaceIndex + 1; // 跳过 "/command "
    const textBeforeArg = draft.slice(0, argsStart);
    const textAfterCursor = draft.slice(cursorPos);

    // 构建新文本："/command value " + 剩余内容
    const newText = textBeforeArg + argValue + " " + textAfterCursor;
    setDraft(newText);
    setSlashMenuOpen(false);
    setSlashMenuFilter("");

    // 设置光标位置到参数值后面
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = textBeforeArg.length + argValue.length + 1;
        textareaRef.current.setSelectionRange(newPos, newPos);
        textareaRef.current.focus();
      }
    }, 0);
  }, [draft]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 检测是否正在输入参数（draft 包含空格说明在输入参数而非选择命令）
    const isTypingArg = draft.includes(" ");

    // Slash 菜单导航 - 只有在选择命令时拦截，输入参数时让参数建议面板处理
    if (slashMenuOpen && slashCommands.length > 0 && !isTypingArg) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSlashMenuIndex((i) => (i + 1) % slashCommands.length);
          return;
        case "ArrowUp":
          e.preventDefault();
          setSlashMenuIndex((i) => (i - 1 + slashCommands.length) % slashCommands.length);
          return;
        case "Enter":
          e.preventDefault();
          selectSlashCommand(slashCommands[slashMenuIndex]);
          return;
        case "Escape":
          e.preventDefault();
          setSlashMenuOpen(false);
          return;
        case "Tab":
          e.preventDefault();
          selectSlashCommand(slashCommands[slashMenuIndex]);
          return;
      }
    }

    // 参数建议键盘导航 - 当 slash 菜单打开且正在输入参数时
    if (slashMenuOpen && draft.includes(" ")) {
      const suggestions = currentArgSuggestionsRef.current;
      switch (e.key) {
        case "ArrowDown":
          if (suggestions.length > 0) {
            e.preventDefault();
            setArgSelectedIdx((i) => (i + 1) % suggestions.length);
          }
          return;
        case "ArrowUp":
          if (suggestions.length > 0) {
            e.preventDefault();
            setArgSelectedIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
          }
          return;
        case "Enter":
        case "Tab":
          if (suggestions.length > 0 && suggestions[argSelectedIdx]) {
            e.preventDefault();
            handleArgSelect(suggestions[argSelectedIdx].id);
          }
          return;
        case "Escape":
          e.preventDefault();
          const lastSlashIndex = draft.lastIndexOf("/");
          if (lastSlashIndex > -1) {
            setDraft(draft.slice(0, lastSlashIndex));
          }
          setSlashMenuOpen(false);
          setSlashMenuFilter("");
          return;
        default:
          // 其他按键（Backspace/Delete/字母等）不拦截，让 textarea 正常处理
          break;
      }
    }

    // 输入历史导航（ArrowUp/Down）
    if (inputHistory.length > 0) {
      if (e.key === "ArrowUp" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        // 如果当前不在历史中，先保存当前输入
        if (historyIndex === -1 && draft) {
          setInputHistory((prev) => [draft, ...prev]);
        }
        const newIndex = Math.min(historyIndex + 1, inputHistory.length - 1);
        setHistoryIndex(newIndex);
        setDraft(inputHistory[newIndex] || "");
        adjustHeight();
        // 将光标移到末尾
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.value.length;
            textareaRef.current.selectionEnd = textareaRef.current.value.length;
          }
        }, 0);
        return;
      }
      if (e.key === "ArrowDown" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (historyIndex === -1) return;
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setDraft(newIndex === -1 ? "" : inputHistory[newIndex] || "");
        adjustHeight();
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.value.length;
            textareaRef.current.selectionEnd = textareaRef.current.value.length;
          }
        }, 0);
        return;
      }
    }

    // 发送消息
    if (e.key === "Enter" && !e.shiftKey) {
      // 当 slash 菜单打开且正在输入参数时，不触发发送消息，让 ArgSuggestionsDropdown 处理
      if (slashMenuOpen && draft.includes(" ")) {
        return;
      }
      
      e.preventDefault();
      if (draft.trim() && !disabled && !streaming) {
        // 添加到输入历史
        const trimmedDraft = draft.trim();
        setInputHistory((prev) => {
          // 避免重复连续相同的输入
          if (prev[0] === trimmedDraft) return prev;
          return [trimmedDraft, ...prev].slice(0, 50); // 最多保留50条
        });
        setHistoryIndex(-1); // 重置历史索引
        onSend(trimmedDraft);
        setDraft("");
        setSlashMenuOpen(false);
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    }
  }, [draft, disabled, streaming, onSend, slashMenuOpen, slashCommands, slashMenuIndex, inputHistory, historyIndex, adjustHeight, handleArgSelect, argSelectedIdx]);

  // 选择 slash 命令
  const selectSlashCommand = useCallback((cmd: SlashCommand) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart ?? 0;
    const textBeforeCursor = draft.slice(0, cursorPos);
    const lastSlashIndex = textBeforeCursor.lastIndexOf("/");

    // 替换 /command 为完整的命令
    const newText =
      draft.slice(0, lastSlashIndex) + "/" + cmd.name + " " + draft.slice(cursorPos);
    setDraft(newText);
    setSlashMenuFilter("");

    // 如果命令没有参数，关闭菜单
    if (!cmd.args || cmd.args.length === 0) {
      setSlashMenuOpen(false);
      justSelectedCommandRef.current = null;
    } else {
      // 标记刚选中了带参命令，让 SlashMenu 强制显示可选值面板
      justSelectedCommandRef.current = cmd;
      setSlashCommands([cmd]);
      setSlashMenuIndex(0);
      setArgSelectedIdx(0);
    }

    // 设置光标位置到命令后面
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = lastSlashIndex + cmd.name.length + 2;
        textareaRef.current.setSelectionRange(newPos, newPos);
        textareaRef.current.focus();
        // 光标就位后清除标记，下次渲染由 useArgSuggestions 正常驱动
        justSelectedCommandRef.current = null;
      }
    }, 0);
  }, [draft]);

  // 处理文件选择
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !onAttachmentsChange) return;

    const newAttachments: ChatAttachment[] = [];
    let pending = files.length;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        pending--;
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        newAttachments.push({
          id: generateAttachmentId(),
          dataUrl: reader.result as string,
          mimeType: file.type,
        });
        pending--;
        if (pending === 0) {
          onAttachmentsChange([...attachments, ...newAttachments]);
        }
      });
      reader.readAsDataURL(file);
    });

    // 重置 input
    e.target.value = "";
  }, [attachments, onAttachmentsChange]);

  // 移除附件
  const handleRemoveAttachment = useCallback((id: string) => {
    if (!onAttachmentsChange) return;
    onAttachmentsChange(attachments.filter((a) => a.id !== id));
  }, [attachments, onAttachmentsChange]);

  // 点击发送
  const handleSend = useCallback(() => {
    if (draft.trim() && !disabled && !streaming) {
      onSend(draft.trim());
      setDraft("");
      setSlashMenuOpen(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }, [draft, disabled, streaming, onSend]);

  // 拖放处理
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files || !onAttachmentsChange) return;

    const newAttachments: ChatAttachment[] = [];
    let pending = 0;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      pending++;

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        newAttachments.push({
          id: generateAttachmentId(),
          dataUrl: reader.result as string,
          mimeType: file.type,
        });
        pending--;
        if (pending === 0) {
          onAttachmentsChange([...attachments, ...newAttachments]);
        }
      });
      reader.readAsDataURL(file);
    });
  }, [attachments, onAttachmentsChange]);

  // 粘贴处理
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !onAttachmentsChange) return;

    const imageItems: DataTransferItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        imageItems.push(item);
      }
    }

    if (imageItems.length === 0) return;

    e.preventDefault();
    const newAttachments: ChatAttachment[] = [];
    let pending = imageItems.length;

    imageItems.forEach((item) => {
      const file = item.getAsFile();
      if (!file) {
        pending--;
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        newAttachments.push({
          id: generateAttachmentId(),
          dataUrl: reader.result as string,
          mimeType: file.type,
        });
        pending--;
        if (pending === 0) {
          onAttachmentsChange([...attachments, ...newAttachments]);
        }
      });
      reader.readAsDataURL(file);
    });
  }, [attachments, onAttachmentsChange]);

  return (
    <div
      className="flex-shrink-0 mx-4 mb-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md
        flex flex-col transition-colors focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-zinc-700/50"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* 附件预览 */}
      <AttachmentPreview
        attachments={attachments}
        onRemove={handleRemoveAttachment}
      />

      {/* Slash 命令菜单 */}
      {slashMenuOpen && (
        <SlashMenu
          commands={slashCommands}
          selectedIndex={slashMenuIndex}
          onSelect={selectSlashCommand}
          onHover={setSlashMenuIndex}
          inputValue={draft}
          cursorPosition={textareaRef.current?.selectionStart ?? 0}
          onArgSelect={handleArgSelect}
          justSelectedCommandRef={justSelectedCommandRef}
          argSelectedIdx={argSelectedIdx}
          onArgSelectedIdxChange={setArgSelectedIdx}
          currentArgSuggestionsRef={currentArgSuggestionsRef}
        />
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* 文本输入区 */}
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className="w-full min-h-10 max-h-36 bg-transparent px-4 pt-3 pb-2
          text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none
          disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
      />

      {/* 底部工具栏 */}
      <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-zinc-800/50">
        {/* 左侧工具栏 */}
        <div className="flex items-center gap-1">
          {/* 附件按钮 */}
          <button
            className="w-8 h-8 flex items-center justify-center rounded-md text-zinc-500
              hover:text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={disabled}
            title="添加附件"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          {/* 语音输入按钮 */}
          {sttSupported && (
            <button
              className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isRecording
                  ? "text-red-400 bg-red-500/20 hover:bg-red-500/30"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
              disabled={disabled}
              title={isRecording ? "停止录音" : "语音输入"}
              onClick={() => {
                if (isRecording) {
                  stopStt();
                  setIsRecording(false);
                  setInterimTranscript("");
                } else {
                  startStt({
                    onTranscript: (text, isFinal) => {
                      if (isFinal) {
                        setDraft((prev) => {
                          const sep = prev && !prev.endsWith(" ") ? " " : "";
                          return prev + sep + text;
                        });
                        setInterimTranscript("");
                      } else {
                        setInterimTranscript(text);
                      }
                    },
                    onStart: () => {
                      setIsRecording(true);
                      setInterimTranscript("");
                    },
                    onEnd: () => {
                      setIsRecording(false);
                      setInterimTranscript("");
                    },
                    onError: (error) => {
                      setIsRecording(false);
                      setInterimTranscript("");
                      console.error("STT error:", error);
                    },
                  });
                  setIsRecording(true);
                }
              }}
            >
              {isRecording ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
          )}

          {/* 临时转录文本 */}
          {interimTranscript && (
            <span className="text-xs text-zinc-400 italic px-1 animate-pulse">
              {interimTranscript}...
            </span>
          )}

          {/* Token 计数 */}
          {tokens && (
            <span className="text-xs text-zinc-500 px-1">{tokens}</span>
          )}

          {/* 排队消息数 */}
          {queueLength > 0 && (
            <span className="text-xs text-zinc-500 px-1">
              {queueLength} 条排队
            </span>
          )}
        </div>

        {/* 右侧工具栏 */}
        <div className="flex items-center gap-2">
          {/* 新建会话按钮（非流式时显示） */}
          {!streaming && onNewSession && (
            <button
              className="w-8 h-8 flex items-center justify-center rounded-md text-zinc-500
                hover:text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-40"
              disabled={disabled}
              title="新建会话"
              onClick={onNewSession}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          )}

          {/* 停止 / 发送按钮 */}
          {streaming ? (
            <button
              onClick={onAbort}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-500
                text-white transition-colors"
              title="停止生成"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <rect x="1" y="1" width="10" height="10" rx="1" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!draft.trim() || disabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg
                bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600
                text-zinc-300 transition-colors disabled:cursor-not-allowed"
              title="发送消息 (Enter)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
