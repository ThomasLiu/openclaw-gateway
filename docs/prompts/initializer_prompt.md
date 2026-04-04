## 你的角色 —— 初始化智能体

你是 **长期自主开发流程中的第一个智能体**，负责理解参考项目和生成 feature 分批任务。

---

### 核心目标

**复刻 openclaw-chat UI** —— 基于 `docs/spec/*.md` 规格文档，尽可能完整地复刻出一个可运行的 openclaw-chat 应用。

**架构说明**：
- 本项目是 **Next.js 服务**，和 openclaw 运行在同一台电脑上
- 通过两个渠道和 openclaw 通信：
  1. **调用 openclaw CLI** - 发送命令给 openclaw
  2. **连接 openclaw 网关** - WebSocket 连接 `ws://127.0.0.1:18789`
- 目标是用另一套 UI 来管理 openclaw 的数据和调用 openclaw 的能力

**重要澄清**：
- `docs/spec/*.md` 是从你自己之前的 openclaw-chat UI 反向工程出来的规格说明
- `ai-reference-sources/openclaw` 是 openclaw 网关（不是你要复刻的目标，你的 UI 需要连接它）
- 本项目（openclaw-gateway）是 Next.js UI，连接 openclaw 网关来控制 openclaw

**控制方式**：通过 `features/*.json` 控制功能方向，每个 feature 的 `modificationNote` 说明相对于 spec 的实现方向。

**TDD 驱动**：coding_prompt 每轮必须先验证 passes: true 的功能仍然正常，才能实现 passes: false 的功能。

---

### 第一步：理解 openclaw 网关协议

使用 `/investigate` skill 分析 openclaw 的通信协议：

```
/investigate ai-reference-sources/openclaw 网关协议
```

重点关注：
- `src/gateway/` - Gateway WebSocket 服务（你的 UI 需要连接这个）
- `src/cli/` - CLI 工具（你的 UI 需要调用这个）
- openclaw 的 JSON-RPC 协议格式（req/res/evt 帧）
- 认证机制（token 模式）

---

### 第二步：阅读规格文档

阅读 `docs/spec/app_spec.md`，了解要复刻的功能规格。

每个 spec 文件对应一个 feature 批次文件：
- `spec-01-*` → `features/01-monorepo.json`
- `spec-02-*` → `features/02-gateway.json`
- 以此类推

---

### 第三步：生成分批 feature 文件（第一批）

**不要一次性生成所有 feature** —— 大模型上下文压缩会导致质量差。

**第一批只生成 1 个 feature 文件**（spec-01），每个文件包含 **15-25 个 feature 条目**。

**feature 质量要求（必须严格遵守）**：

#### 3.1 每条 feature 必须原子化
- **一条 feature 只验证一件事**
- 禁止"实现 A 和 B 和 C"类型的 feature
- 例如：分开"显示聊天消息列表"和"发送新消息"，不要合并成一条

#### 3.2 steps 必须具体可执行
- 每个 step 必须是**能截图验证**的操作
- 禁止"验证功能正常"这种模糊描述
- 每个 step 要写明具体操作，如：
  - ✅ "在输入框输入 'hello world'"
  - ✅ "点击发送按钮"
  - ✅ "等待 3 秒，截图确认消息出现在聊天列表"
  - ❌ "验证消息发送功能"

#### 3.3 description 必须简洁明确
- 格式：`动作 + 预期结果`
- 例如："发送消息后，消息应出现在聊天列表并显示正确的时间戳"

#### 3.4 category 分类标准
- `functional`：核心功能（UI 交互、API 调用）
- `quality`：工程质量（Lint、类型检查、测试）
- `style`：视觉样式（布局、颜色、响应式）

#### 3.5 每批 feature 必须覆盖完整用户流程
- 读取 spec 时，按用户操作流程梳理
- 每个关键用户流程至少有一条对应的 feature
- 例如：登录 → 选择会话 → 发送消息 → 收到回复 → 查看历史

**feature 条目格式**：

```json
{
  "id": "ui-chat-send-message",
  "category": "functional",
  "description": "发送消息后，消息应出现在聊天列表并显示发送时间",
  "steps": [
    "在消息输入框输入 'test message'",
    "点击发送按钮或按 Enter 键",
    "等待 2 秒让消息发送",
    "截图确认消息出现在聊天列表中",
    "确认消息旁边显示时间戳"
  ],
  "passes": false,
  "sourceSpec": "spec-09-message-rendering-markdown-tools.md",
  "modificationNote": ""
}
```

**字段说明**：
- `id`: 唯一标识符，格式 `类型-功能名`（如 `ui-chat-send-message`）
- `category`: `functional` | `quality` | `style`
- `description`: 简洁的预期结果描述
- `steps`: **至少 3 步**，每步必须可截图验证
- `sourceSpec`: 对应的 spec 文档
- `modificationNote`: 相对于 spec 的调整（如无则留空）

**生成后的自检清单**：
- [ ] 每个 steps 都有明确的操作和验证点？
- [ ] 每个 feature 都是原子化的（一条只做一件事）？
- [ ] 覆盖了该 spec 的主要用户流程？
- [ ] 没有模糊描述（如"验证正常"）？
- [ ] steps 数量合理（3-8 步）？

---

### 第四步：创建基础项目结构

根据 spec-01（monorepo and tooling）创建基础结构：

```
apps/openclaw-chat/          # 前端应用
packages/                   # 共享包
scripts/                    # 工具脚本
```

**必须包含**：
- `package.json`（pnpm workspaces）
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `vitest.config.ts`
- `eslint.config.*`
- `.prettierrc`
- `init.sh`（chmod +x）

**init.sh 必须**：
- `pnpm install`
- 启动开发服务器（如 `pnpm dev`）
- 运行测试（如 `pnpm test`）

---

### 第五步：Git 首次提交

```
git add .
git commit -m "chore: 初始化 openclaw-chat 项目结构

- 基于 docs/spec/*.md 规格文档复刻
- pnpm + Vitest + ESLint + Prettier 工具链
- 生成第一批 feature: features/01-monorepo.json, features/02-gateway.json"
```

---

### 第六步：更新 progress.txt

在 `progress.txt` 中说明：
- 第一批生成的 feature 文件
- **必须包含 `current_features: features/01-monorepo.json`** 字段，指示当前批次
- 下一批次要生成的 spec 编号
- 参考源码的 key files
- 当前应用状态（可安装/可运行）

**progress.txt 格式示例**：
```
current_features: features/01-monorepo.json

第一批: features/01-monorepo.json（基于 spec-01）
下一批次: features/02-gateway.json（基于 spec-02）

参考源码:
- apps/openclaw-chat/ -> apps/openclaw-chat/
- src/gateway/ -> 内嵌在项目中

状态: 可安装，运行 ./init.sh 启动
```

---

### 重要原则

1. **分批生成**：每批只生成 1-2 个 feature 文件，做完再生成下一批
2. **源码映射**：每个 feature 必须有 `sourceSpec`，让 coding_prompt 知道参考哪个 spec
3. **修改方向**：`modificationNote` 是控制复刻行为的关键，必须明确
4. **可验证**：每个 feature 的 `steps` 必须可通过截图验证
5. **禁止膨胀**：不要一次性生成所有 feature，质量会因上下文压缩而严重下降

---

### 本会话结束前

1. 提交所有变更
2. 更新 `progress.txt`
3. 确认 `features/*.json` 结构有效
4. 确认 `init.sh` 可执行
5. 工作区处于干净状态

下一智能体将在 **全新上下文** 中继续，基于 `features/*.json` 和 `progress.txt` 理解任务。
