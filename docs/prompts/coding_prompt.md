## 角色定位 - 编程智能体

你正在持续执行一个长时间运行的自主开发任务。
这是一个全新的上下文窗口——你对之前的会话没有记忆。

**核心约束**：
- **TDD 驱动**：passes: false 的功能必须等到 passes: true 验证通过后才能实现
- **先验证再实现**：每轮必须先验证当前功能正常，再实现新功能
- **源码参考**：通过 feature 的 `sourceSpec` 和 `modificationNote` 理解实现方向

---

### Step 1：找准方向（必须执行）

首先明确你的工作环境：

```bash
# 1. 查看当前工作目录
pwd

# 2. 列出文件以了解项目结构
ls -la

# 3. 阅读 progress.txt 了解当前进度和当前批次
cat progress.txt

# 4. 从 progress.txt 提取当前批次的 feature 文件名
# progress.txt 格式：包含 "current_features: features/xx-name.json"
CURRENT_FEATURES=$(grep -m1 "^current_features:" progress.txt | sed 's/^current_features: *//')
echo "当前批次: $CURRENT_FEATURES"

# 5. 查看所有已生成的 feature 文件
ls features/

# 6. 读取当前批次 feature 文件
cat "$CURRENT_FEATURES"

# 7. 查看 git 历史
git log --oneline -10

# 8. 检查 openclaw gateway 是否运行（端口 18789）
lsof -i :18789 || echo "Gateway 未运行"
```

**关键**：`progress.txt` 中的 `current_features` 字段指示当前批次，coding_prompt 必须读取这个字段而不是 hardcode 文件名。

---

### Step 2：启动服务器（如未运行）

如果存在 `init.sh`，运行它：

```bash
chmod +x init.sh
./init.sh
```

否则手动启动服务器并记录过程。

**注意**：openclaw-chat 需要 openclaw gateway 运行在 `ws://127.0.0.1:18789`。

---

### Step 3：验证当前状态（关键！必须先做！）

**在实现任何 passes: false 的功能之前，必须先验证 passes: true 的功能仍然正常。**

**强制验证流程**：

1. 使用 `/browse` skill 验证应用可访问：
   ```
   /browse http://localhost:3005
   ```
   截图确认 UI 正常渲染。

2. 验证核心功能（选择当前批次中 passes: true 的 1-2 个功能）：
   - 尝试复现 feature 的验证步骤
   - 截图记录验证结果

3. **如果发现问题**：
   - 立即将该功能标记为 `"passes": false`
   - 修复问题
   - 再次验证
   - 只有问题修复后才能继续实现新功能

**禁止**：跳过验证步骤直接实现新功能。这会导致到处是 bug，最终产物完全不可用。

---

### Step 4：选择要实现的功能

从当前批次的 `features/*.json` 中选择：

1. 找到所有 `"passes": false` 的条目
2. 按顺序选择优先级最高的
3. 理解该条目的：
   - `sourceSpec` - 对应的 spec 文档
   - `modificationNote` - 相对于 spec 的实现方向
   - `steps` - 验证步骤

**一次只实现一个功能**（或强相关的一小组），做完再处理下一个。

---

### Step 5：理解 spec 文档

在实现之前，先阅读对应的 spec 文档：

```bash
# 阅读 sourceSpec 指定的 spec 文件
cat docs/spec/spec-01-monorepo-and-tooling.md

# 查看完整的 app_spec.md
cat docs/spec/app_spec.md
```

理解：
- spec 描述的功能需求
- `modificationNote` 要求的实现调整

---

### Step 6：实现功能

根据 spec 文档实现功能：

1. 编写代码（前端和/或后端）
2. 遵循项目的代码风格（ESLint/Prettier）
3. 如果需要，创建对应的测试
4. 对照 `modificationNote` 确认实现方向正确

---

### Step 7：验证实现

**使用 `/browse` skill 进行端到端验证**：

1. 截图确认 UI 正常渲染
2. 按 feature 的 `steps` 逐项验证
3. 检查浏览器控制台是否有错误
4. 截图记录验证结果

**必须截图验证后才能标记 passes: true**。

---

### Step 8：更新 feature 文件

**只能修改 `passes` 字段**（false → true）：

```json
"passes": false  →  "passes": true
```

**禁止**：
- 修改 `description`
- 修改 `steps`
- 修改 `sourceSpec`
- 修改 `modificationNote`
- 删除条目

---

### Step 9：提交进度

```bash
git add .
git commit -m "feat: 实现 [功能名称] - 验证通过

- 功能：xxx
- 基于 spec：docs/spec/xxx.md
- 修改方向：xxx
- 使用 /browse 验证截图：verification/xxx.png
- 更新 features/xx.json：将 #N 标记为通过"
```

---

### Step 10：更新 progress.txt

在 `progress.txt` 中更新：
- 本会话完成的工作
- 完成的 feature 编号
- 发现或修复的问题
- 下一个要实现的 feature
- 当前状态（如 "features/01: 5/10 通过"）

**如果当前批次所有 feature 都 passes: true**，需要切换到下一批次：

```bash
# 从 progress.txt 读取当前批次
CURRENT=$(grep -m1 "^current_features:" progress.txt | sed 's/^current_features: *//')

# 从当前批次文件名提取编号（如 01）
CURRENT_NUM=$(echo "$CURRENT" | sed 's/features\/\([0-9]*\)-.*/\1/')

# 计算下一个批次编号
NEXT_NUM=$(printf "%02d" $((CURRENT_NUM + 1)))

# 查找下一个 spec 对应的 feature 文件
# 例如 features/02-gateway.json（如果存在）
NEXT_FEATURES=$(ls features/${NEXT_NUM}-*.json 2>/dev/null | head -1)

if [ -n "$NEXT_FEATURES" ]; then
  # 更新 progress.txt 的 current_features 字段
  sed -i '' "s/^current_features:.*/current_features: $NEXT_FEATURES/" progress.txt
  echo "已切换到下一批次: $NEXT_FEATURES"
else
  echo "所有批次已完成或下一批次文件不存在"
fi
```

---

### Step 11：生成下一批 features（如需要）

如果 `progress.txt` 中 `current_features` 已更新到下一批次：

1. 阅读下一个 spec 文件（如 `docs/spec/spec-03-*.md`）
2. 使用 `/investigate` 分析对应的 `docs/spec/*.md` 规格文档
3. 生成下一个 `features/xx-name.json`（5-15 条）
4. **重要**：在 `progress.txt` 中设置 `current_features: features/xx-name.json`
5. 提交新生成的 feature 文件

---

### 浏览器自动化工具

**使用 `/browse` skill 进行浏览器自动化**（首选）：

```
/browse <url>                    # 打开页面
/browse screenshot               # 截图
/browse click <selector>         # 点击元素
/browse fill <selector> <value>  # 填写表单
```

**或者直接使用 Playwright MCP 工具**：

- `mcp__playwright__playwright_navigate`
- `mcp__playwright__playwright_screenshot`
- `mcp__playwright__playwright_click`
- `mcp__playwright__playwright_fill`
- `mcp__playwright__playwright_select`

**禁止使用已废弃的工具名**：
- `puppeteer_navigate`（错误）
- `puppeteer_screenshot`（错误）

---

### gstack skills 使用指南

| 场景 | 使用的 skill |
|------|-------------|
| 理解源码结构 | `/investigate` |
| 验证 UI 功能 | `/browse` |
| 代码质量审查 | `/review` |
| 发现 bug | `/qa` |
| 设计方案咨询 | `/design-consultation` |
| 发布前检查 | `/ship` |

---

### openclaw 集成方式

本项目（openclaw-gateway）是 Next.js UI，和 openclaw 运行在同一台机器上。

**与 openclaw 通信的方式**：
1. **调用 openclaw CLI** - 通过子进程调用 `openclaw` 命令（如 `openclaw agents list`）
2. **连接 openclaw 网关** - WebSocket 到 `ws://127.0.0.1:18789`

**Gateway 协议**：
- WebSocket 连接，使用 JSON 帧（`{type: "req"/"res"/"evt", ...}`）
- 支持 `agent`、`sessions.send`、`chat.send`、`config.patch` 等方法
- 认证使用 token 模式

**如果 openclaw 未运行**：
- 检查 `lsof -i :18789`
- 需要先启动 openclaw 才能完整验证功能

---

### 质量标准

- **零控制台错误**：浏览器控制台不能有 Error level 日志
- **UI 精致**：符合 spec 中指定的设计
- **功能完整**：每个 feature 必须端到端可工作
- **截图验证**：每次验证必须截图存档在 `verification/` 目录

---

### 重要提醒

**你的目标**：完整复刻 openclaw-chat 功能到当前项目。

**本会话目标**：完美完成至少一个 feature。

**优先级**：
1. 验证已有功能（Step 3）
2. 修复发现的问题
3. 实现新功能
4. 验证新功能

**先验证再实现是铁律**——跳过验证会导致不可用的产物。

---

### 首先执行 Step 1（找准方向）。
