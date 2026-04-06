/**
 * 默认模型读写工具
 *
 * 从网关 config 对象中读取和修改 defaultModel 字段
 *
 * server-only
 */

export type DefaultModelConfig = Record<string, unknown>;

/**
 * 从网关配置中提取默认模型 ID
 */
export function getDefaultModelId(config: DefaultModelConfig): string | null {
  // 支持多种可能的字段名
  const candidates = [
    "defaultModel",
    "default_model",
    "model.default",
    "defaultmodel",
  ];

  for (const key of candidates) {
    const value = config[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }

  // 也支持嵌套结构
  const model = config.model as DefaultModelConfig | undefined;
  if (model && typeof model === "object") {
    const nestedCandidates = ["default", "defaultModel", "default_model"];
    for (const key of nestedCandidates) {
      const value = (model as DefaultModelConfig)[key];
      if (typeof value === "string" && value.trim() !== "") {
        return value.trim();
      }
    }
  }

  return null;
}

/**
 * 在配置对象中设置默认模型（纯函数，返回新对象）
 *
 * @param config 原始配置对象
 * @param modelId 要设置为默认的模型 ID
 * @returns 新配置对象（不修改原对象）
 */
export function setDefaultModelInConfig(
  config: DefaultModelConfig,
  modelId: string
): DefaultModelConfig {
  // 尝试直接设置 defaultModel
  if (!config.defaultModel) {
    return { ...config, defaultModel: modelId };
  }

  // 尝试嵌套 model.default
  const model = config.model as DefaultModelConfig | undefined;
  if (model && !model.default && !model.defaultModel) {
    return {
      ...config,
      model: { ...model, default: modelId },
    };
  }

  // 尝试顶层 defaultModel
  return { ...config, defaultModel: modelId };
}

/**
 * 从配置对象中构建 config.patch 的 patch 对象
 */
export function buildDefaultModelPatch(modelId: string): Record<string, unknown> {
  return { defaultModel: modelId };
}
