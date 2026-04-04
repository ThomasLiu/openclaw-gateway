/**
 * MCP 服务配置解析工具
 *
 * 从网关 config 对象中读取和修改 mcpServers 字段
 *
 * server-only
 */

export type McpServerConfig = {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  description?: string;
};

export type McpServersConfig = Record<string, McpServerConfig>;

export type McpConfig = Record<string, unknown>;

/**
 * 从配置对象中提取 mcpServers
 */
export function getMcpServersFromConfig(config: McpConfig): McpServersConfig {
  const mcpServers = config.mcpServers;

  if (!mcpServers || typeof mcpServers !== "object") {
    return {};
  }

  if (Array.isArray(mcpServers)) {
    // 数组格式：[{ id, command, args? }, ...]
    const result: McpServersConfig = {};
    for (const item of mcpServers) {
      if (item && typeof item === "object" && "id" in item) {
        const server = item as Record<string, unknown>;
        result[String(server.id)] = {
          command: typeof server.command === "string" ? server.command : undefined,
          args: Array.isArray(server.args) ? (server.args as string[]) : undefined,
          env:
            typeof server.env === "object" && server.env !== null
              ? (server.env as Record<string, string>)
              : undefined,
          description:
            typeof server.description === "string" ? server.description : undefined,
        };
      }
    }
    return result;
  }

  // 对象格式：{ [id]: { command, args? }, ... }
  const obj = mcpServers as Record<string, unknown>;
  const result: McpServersConfig = {};

  for (const [id, server] of Object.entries(obj)) {
    if (server && typeof server === "object") {
      const s = server as Record<string, unknown>;
      result[id] = {
        command: typeof s.command === "string" ? s.command : undefined,
        args: Array.isArray(s.args) ? (s.args as string[]) : undefined,
        env:
          typeof s.env === "object" && s.env !== null
            ? (s.env as Record<string, string>)
            : undefined,
        description: typeof s.description === "string" ? s.description : undefined,
      };
    }
  }

  return result;
}

/**
 * 按 ID 查找 MCP 服务
 */
export function getMcpServerById(
  config: McpConfig,
  id: string
): McpServerConfig | null {
  const servers = getMcpServersFromConfig(config);
  return servers[id] ?? null;
}

/**
 * 构建移除 MCP 服务的 config.patch 对象
 *
 * @param id MCP 服务 ID
 */
export function removeMcpServerFromConfig(id: string): Record<string, unknown> {
  return {
    mcpServers: {
      remove: [id],
    },
  };
}

/**
 * 构建添加 MCP 服务的 config.patch 对象
 *
 * @param id MCP 服务 ID
 * @param server MCP 服务配置
 */
export function addMcpServerToConfig(
  id: string,
  server: McpServerConfig
): Record<string, unknown> {
  return {
    mcpServers: {
      [id]: server,
    },
  };
}
