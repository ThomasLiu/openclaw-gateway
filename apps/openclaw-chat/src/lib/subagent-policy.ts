/**
 * 子代理策略（Subagent Policy）merge-patch 工具
 *
 * 用于构造 config.patch 调用所需的 patch 对象，
 * 与网关的 merge-patch 语义对齐。
 *
 * server-only
 */

export type SubagentPolicyKind = "defaults" | "tools" | "agent";

/**
 * 校验 kind 是否为有效值
 */
export function validateSubagentPolicyKind(kind: string): kind is SubagentPolicyKind {
  return kind === "defaults" || kind === "tools" || kind === "agent";
}

/**
 * kind=agent 时 agentId 必填，校验并返回
 */
export function validateAgentId(kind: SubagentPolicyKind, agentId: string | undefined): string {
  if (kind === "agent") {
    if (!agentId || typeof agentId !== "string" || agentId.trim() === "") {
      throw new Error("agentId is required when kind is 'agent'");
    }
    return agentId.trim();
  }
  return "";
}

/**
 * 构建子代理策略的 merge-patch 对象
 *
 * @param kind - 策略类型：defaults | tools | agent
 * @param agentId - 当 kind=agent 时必填
 * @param subagents - 子代理配置对象；null 表示移除
 */
export function buildSubagentPolicyPatch(
  kind: SubagentPolicyKind,
  agentId: string | undefined,
  subagents: Record<string, unknown> | null
): Record<string, unknown> {
  const validatedAgentId = validateAgentId(kind, agentId);

  if (kind === "agent") {
    // agent 级策略：放在 agents[].subagents 下
    return {
      agents: {
        patch: {
          [validatedAgentId]: {
            subagents: subagents,
          },
        },
      },
    };
  }

  // defaults 或 tools：放在顶层
  return {
    [`subagentPolicy.${kind}`]: subagents,
  };
}

/**
 * 构建移除子代理策略的 patch（设为 null 删除）
 */
export function buildSubagentPolicyRemove(
  kind: SubagentPolicyKind,
  agentId: string | undefined
): Record<string, unknown> {
  return buildSubagentPolicyPatch(kind, agentId, null);
}

/**
 * 解析请求体，验证并返回结构化参数
 */
export interface SubagentPolicyPatchBody {
  baseHash: string;
  kind: SubagentPolicyKind;
  agentId?: string;
  subagents: Record<string, unknown> | null;
}

export function parseSubagentPolicyPatchBody(body: unknown): SubagentPolicyPatchBody {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const obj = body as Record<string, unknown>;

  if (typeof obj.baseHash !== "string" || obj.baseHash.trim() === "") {
    throw new Error("baseHash is required");
  }

  if (typeof obj.kind !== "string" || !validateSubagentPolicyKind(obj.kind)) {
    throw new Error("kind must be one of: defaults, tools, agent");
  }

  const kind = obj.kind as SubagentPolicyKind;
  validateAgentId(kind, obj.agentId as string | undefined);

  if (obj.subagents !== null && (typeof obj.subagents !== "object" || obj.subagents === undefined)) {
    throw new Error("subagents must be an object or null");
  }

  return {
    baseHash: (obj.baseHash as string).trim(),
    kind,
    agentId: typeof obj.agentId === "string" ? obj.agentId.trim() : undefined,
    subagents: obj.subagents as Record<string, unknown> | null,
  };
}
