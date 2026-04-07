// ============================================================
// OpenClaw Chat - Slash Commands Mock Data
// 从 OpenClaw 源码提取的所有斜杠命令定义
// ============================================================

export interface SlashCommand {
  /** 命令名称（不含 /） */
  name: string
  /** 命令描述 */
  description: string
  /** 参数定义 */
  args?: Array<{
    name: string
    type: 'string' | 'enum'
    required?: boolean
    description?: string
    options?: string[]
    source?: 'agents' | 'skills' | 'models'
  }>
  /** 使用示例 */
  examples?: string[]
  /** 分类 */
  category?: 'agent' | 'session' | 'system' | 'tool'
}

/**
 * 所有可用的 slash 命令
 * 数据来源: docs/tools/slash-commands.md
 */
export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: 'kill',
    description: '终止正在运行的 Agent',
    args: [{
      name: 'agent-id',
      type: 'enum',
      required: true,
      description: '要终止的 Agent ID',
      source: 'agents',
    }],
    examples: ['/kill my-agent', '/kill agent-123'],
    category: 'agent',
  },
  {
    name: 'skill',
    description: '为 Agent 启用或禁用技能',
    args: [
      {
        name: 'action',
        type: 'enum',
        required: true,
        description: '操作类型',
        options: ['enable', 'disable', 'list'],
      },
      {
        name: 'skill-name',
        type: 'enum',
        required: false,
        description: '技能名称',
        source: 'skills',
      },
    ],
    examples: ['/skill enable code-review', '/skill list', '/skill disable debug'],
    category: 'agent',
  },
  {
    name: 'model',
    description: '切换或查看当前使用的模型',
    args: [{
      name: 'model-name',
      type: 'enum',
      required: false,
      description: '模型名称或 ID',
      source: 'models',
    }],
    examples: ['/model gpt-4', '/model claude-3-opus', '/model'],
    category: 'session',
  },
  {
    name: 'clear',
    description: '清空当前会话历史',
    args: [],
    examples: ['/clear'],
    category: 'session',
  },
  {
    name: 'help',
    description: '显示帮助信息',
    args: [],
    examples: ['/help'],
    category: 'system',
  },
  {
    name: 'config',
    description: '查看或修改配置',
    args: [
      {
        name: 'path',
        type: 'string',
        required: false,
        description: '配置路径',
      },
      {
        name: 'value',
        type: 'string',
        required: false,
        description: '配置值',
      },
    ],
    examples: ['/config gateway.host', '/config gateway.port 8080'],
    category: 'system',
  },
  {
    name: 'status',
    description: '显示系统状态信息',
    args: [],
    examples: ['/status'],
    category: 'system',
  },
  {
    name: 'export',
    description: '导出会话或配置',
    args: [{
      name: 'format',
      type: 'enum',
      required: false,
      description: '导出格式',
      options: ['json', 'markdown', 'txt'],
    }],
    examples: ['/export json', '/export markdown'],
    category: 'session',
  },
  {
    name: 'search',
    description: '搜索历史会话或日志',
    args: [
      {
        name: 'query',
        type: 'string',
        required: true,
        description: '搜索关键词',
      },
      {
        name: 'type',
        type: 'enum',
        required: false,
        description: '搜索类型',
        options: ['sessions', 'logs', 'all'],
      },
    ],
    examples: ['/search error logs', '/search "api call" sessions'],
    category: 'session',
  },
  {
    name: 'theme',
    description: '切换界面主题',
    args: [{
      name: 'theme-name',
      type: 'enum',
      required: false,
      description: '主题名称',
      options: ['dark', 'light', 'auto'],
    }],
    examples: ['/theme dark', '/theme light'],
    category: 'system',
  },
  {
    name: 'language',
    description: '切换界面语言',
    args: [{
      name: 'lang-code',
      type: 'enum',
      required: false,
      description: '语言代码',
      options: ['zh-CN', 'en', 'ja', 'ko', 'auto'],
    }],
    examples: ['/language zh-CN', '/language en'],
    category: 'system',
  },
  {
    name: 'debug',
    description: '开启/关闭调试模式',
    args: [],
    examples: ['/debug'],
    category: 'system',
  },
  {
    name: 'version',
    description: '显示版本信息',
    args: [],
    examples: ['/version'],
    category: 'system',
  },
]

/**
 * Mock 可用的 Agent 列表
 */
export const MOCK_AGENTS = [
  { id: 'my-agent', name: 'My Agent', status: 'idle' as const },
  { id: 'code-assistant', name: 'Code Assistant', status: 'running' as const },
  { id: 'data-analyst', name: 'Data Analyst', status: 'idle' as const },
]

/**
 * Mock 可用的技能列表
 */
export const MOCK_SKILLS = [
  { name: 'code-review', description: 'Code review and analysis' },
  { name: 'debug', description: 'Debugging assistance' },
  { name: 'test-gen', description: 'Test generation' },
  { name: 'refactor', description: 'Code refactoring' },
]

/**
 * Mock 可用的模型列表
 */
export const MOCK_MODELS = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic' },
]
