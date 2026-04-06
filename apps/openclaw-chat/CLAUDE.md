# OpenClaw Chat - 开发文档

## 统一确认框组件

### ConfirmDialog

项目使用统一的 `ConfirmDialog` 组件替代浏览器原生的 `confirm()` 对话框，提供一致的用户体验。

#### 使用示例

```tsx
import ConfirmDialog from "@/components/ConfirmDialog";

function MyComponent() {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = () => {
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    // 执行删除操作
    setConfirmOpen(false);
  };

  return (
    <>
      <button onClick={handleDelete}>删除</button>
      
      <ConfirmDialog
        open={confirmOpen}
        title="确认删除"
        description="确定要删除这个项目吗？此操作无法撤销。"
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `open` | `boolean` | - | 是否显示对话框 |
| `title` | `string` | `"确认操作"` | 对话框标题 |
| `description` | `string` | - | 对话框内容/描述 |
| `confirmText` | `string` | `"确认"` | 确认按钮文本 |
| `cancelText` | `string` | `"取消"` | 取消按钮文本 |
| `variant` | `"primary" \| "danger" \| "warning"` | `"danger"` | 确认按钮的颜色主题 |
| `showIcon` | `boolean` | `true` | 是否显示图标 |
| `loading` | `boolean` | `false` | 是否正在加载/处理中 |
| `onConfirm` | `() => void` | - | 确认回调 |
| `onCancel` | `() => void` | - | 取消回调 |

#### 颜色主题

- **primary** (蓝色) - 用于一般确认操作
- **danger** (红色) - 用于危险操作（删除等）
- **warning** (黄色) - 用于警告性操作

#### 设计规范

- 所有需要用户确认的操作都应使用 `ConfirmDialog` 组件
- 不要使用浏览器原生的 `confirm()`、`alert()` 或 `prompt()`
- 按钮文案应清晰表达操作意图
- 描述文本应说明操作的后果

## 其他对话框组件

项目中还有其他专用对话框组件，遵循相同的设计规范：

- `GatewayAlertDialog` - 网关错误/告警弹窗
- `UpdateDialog` - 版本更新弹窗
- `AgentConfigModal` - Agent 配置编辑弹窗
