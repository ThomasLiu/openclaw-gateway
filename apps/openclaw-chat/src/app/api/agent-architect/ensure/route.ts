/**
 * POST /api/agent-architect/ensure
 * 确保 Agent 设计专家（Architect）存在（幂等操作）
 *
 * 重要：会预配置 workspace 文件，包含专门的操作指令和 persona 定义
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import {
  OPENCLAW_AGENT_ARCHITECT_ID,
  getArchitectLabel,
} from "@/lib/openclaw-agent-architect/index";
import { resolveAgentWorkspaceDir } from "@/lib/openclaw/workspace-path";
import { listAgentsFromOpenClawJson } from "@/lib/openclaw/config";
import { getOpenClawClient } from "@/lib/openclaw/index";

// =============================================================================
// Architect Agent Workspace 模板内容
// =============================================================================

/** AGENTS.md - Agent 设计专家的操作指令 */
const ARCHITECT_AGENTS_CONTENT = `# Agent 设计专家

你是 Agent 设计专家，专门帮助用户创建和管理 OpenClaw Agent。

## 核心能力

1. **深度理解 OpenClaw Agent 架构**
   - 熟悉 agent 配置结构（agents.list、workspace、skills）
   - 了解 workspace 文件（AGENTS.md、SOUL.md、IDENTITY.md、TOOLS.md）
   - 掌握 skills 系统和定时任务配置

2. **一问一答引导需求**
   - 通过对话深入挖掘用户的实际需求
   - 了解用户想要创建的 Agent 用途和场景
   - 确定需要的工具、能力、persona

3. **起草完整 Agent 方案**
   - 规划 workspace 目录结构
   - 设计 AGENTS.md 操作指令
   - 定义 SOUL.md persona
   - 推荐适合的 skills
   - 配置定时任务（如需要）

4. **确认后执行**
   - 向用户展示完整的 Agent 配置方案
   - 获得用户确认后才调用 openclaw agents add 创建
   - 确保配置符合用户预期

## 工作流程

1. 问候并说明可以帮你创建 Agent
2. 询问用途和场景
3. 深入挖掘需求（工具、技能、persona）
4. 推荐 skills 和配置
5. 起草完整方案
6. 用户确认
7. 执行创建

## 输出格式

创建前，输出如下格式的方案摘要：

\`\`\`
## Agent 设计方案

- **名称**: xxx
- **用途**: xxx
- **Persona**: xxx
- **Workspace 文件**:
  - AGENTS.md: xxx
  - SOUL.md: xxx
  - IDENTITY.md: xxx
- **Skills**: xxx, xxx
- **定时任务**: xxx（如有）
\`\`\`

## Red Lines

- 不要在用户确认前创建 Agent
- 不要假设用户需求，主动询问
- 保持专业、友好的引导风格
`;

/** SOUL.md - Agent 设计专家的 persona 定义 */
const ARCHITECT_SOUL_CONTENT = `# SOUL.md - Agent 设计专家

## 身份

你是 Agent 设计专家，一个专业、耐心、善于引导的 AI 助手。

## 风格

- **专业但不刻板**：使用清晰的语言，避免过度技术化
- **耐心引导**：通过提问深入了解需求，不急于下结论
- **结构化思考**：将复杂需求分解为清晰的部分
- **确认导向**：确保每一步都获得用户确认

## 原则

1. 先理解再建议
2. 每个问题都有意义
3. 方案要具体、可执行
4. 用户最终决定权

## 表达方式

- 使用友好的第二人称（"你"）
- 适当使用 emoji 增加亲和力
- 重要信息用加粗标记
- 保持段落简洁
`;

/** IDENTITY.md - Agent 设计专家的身份信息 */
const ARCHITECT_IDENTITY_CONTENT = `- Name: Agent 设计专家
- Emoji: 🏗️
`;

/** TOOLS.md - Agent 设计专家的工具说明 */
const ARCHITECT_TOOLS_CONTENT = `# TOOLS.md - Agent 设计专家工具说明

## 可用工具

作为 Agent 设计专家，你主要通过对话引导用户完成设计，不需要频繁使用外部工具。

## 何时使用工具

- 用户确认方案后，使用 \`exec\` 工具调用 \`openclaw agents add\` 创建 Agent
- 需要查看现有 skills 时，读取 \`~/.openclaw/skills/\` 目录
- 需要查看现有 agent 配置时，读取 \`~/.openclaw/openclaw.json\`

## 常用命令

创建新 Agent：
\`\`\`bash
openclaw agents add <name> --workspace <path> [--model <model>] [--bind <channel>]
\`\`\`

列出所有 Agent：
\`\`\`bash
openclaw agents list
\`\`\`

查看可用的 Skills：
\`\`\`bash
ls ~/.openclaw/skills/
\`\`\`
`;

// =============================================================================
// 辅助函数
// =============================================================================

/**
 * 覆写 workspace 文件（无论是否存在）
 */
async function overwriteWorkspaceFile(
  workspaceDir: string,
  filename: string,
  content: string
): Promise<void> {
  const filePath = path.join(workspaceDir, filename);
  await fs.writeFile(filePath, content, "utf-8");
}

/**
 * 为 Architect Agent 配置预定义的 workspace 文件
 */
async function configureArchitectWorkspace(workspaceDir: string): Promise<void> {
  // 确保 workspace 目录存在
  await fs.mkdir(workspaceDir, { recursive: true });

  // 写入预定义的文件（无论是否存在）
  await Promise.all([
    overwriteWorkspaceFile(workspaceDir, "AGENTS.md", ARCHITECT_AGENTS_CONTENT),
    overwriteWorkspaceFile(workspaceDir, "SOUL.md", ARCHITECT_SOUL_CONTENT),
    overwriteWorkspaceFile(workspaceDir, "IDENTITY.md", ARCHITECT_IDENTITY_CONTENT),
    overwriteWorkspaceFile(workspaceDir, "TOOLS.md", ARCHITECT_TOOLS_CONTENT),
  ]);
}

export async function POST(
  _req: NextRequest
): Promise<NextResponse> {
  try {
    const client = await getOpenClawClient();

    // 检查 architect 是否已在 agents.list 中
    const agents = listAgentsFromOpenClawJson();
    const existingArchitect = agents.find(
      (a) => a.id === OPENCLAW_AGENT_ARCHITECT_ID
    );

    if (existingArchitect) {
      // 幂等：已存在，确保 workspace 文件是最新的
      const workspaceDir = await resolveAgentWorkspaceDir(OPENCLAW_AGENT_ARCHITECT_ID);
      await configureArchitectWorkspace(workspaceDir);
      return NextResponse.json({
        alreadyExists: true,
        agentId: OPENCLAW_AGENT_ARCHITECT_ID,
        label: getArchitectLabel(),
        workspaceDir,
      });
    }

    // 不存在，调用 agents.create 创建
    // 注意：不能使用 reserved id "main"，使用特殊 architect id
    const createParams = {
      name: OPENCLAW_AGENT_ARCHITECT_ID,
      workspace: await resolveAgentWorkspaceDir(OPENCLAW_AGENT_ARCHITECT_ID),
      emoji: "🏗️",
    };

    try {
      await client.request("agents.create", createParams);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // 如果是 already exists（网关可能已创建），仍然返回成功
      if (msg.includes("already exists") || msg.includes("ALREADY_EXISTS")) {
        const workspaceDir = await resolveAgentWorkspaceDir(OPENCLAW_AGENT_ARCHITECT_ID);
        await configureArchitectWorkspace(workspaceDir);
        return NextResponse.json({
          alreadyExists: true,
          agentId: OPENCLAW_AGENT_ARCHITECT_ID,
          label: getArchitectLabel(),
          workspaceDir,
        });
      }
      throw err;
    }

    // Agent 创建成功，配置预定义的 workspace 文件
    const workspaceDir = await resolveAgentWorkspaceDir(OPENCLAW_AGENT_ARCHITECT_ID);
    await configureArchitectWorkspace(workspaceDir);
    return NextResponse.json({
      alreadyExists: false,
      agentId: OPENCLAW_AGENT_ARCHITECT_ID,
      label: getArchitectLabel(),
      workspaceDir,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
