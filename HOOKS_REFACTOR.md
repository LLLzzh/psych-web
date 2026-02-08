# 自定义 Hooks 重构总结

## 创建的自定义 Hooks

### 1. `useTextInput` - 文本输入管理

**位置**: `src/hooks/useTextInput.ts`

**功能**:
- 管理文本输入状态
- 处理发送逻辑
- 处理 Enter 键提交
- 自动清空输入框

**API**:
```typescript
const {
  inputText,        // 当前输入文本
  setInputText,     // 修改输入文本
  handleSend,       // 发送消息
  handleKeyPress,   // 键盘事件处理（Enter键）
  clearInput,       // 清空输入
  canSend,         // 是否可以发送（启用 + 有内容）
} = useTextInput({
  onSend: (text: string) => void,  // 发送回调
  enabled?: boolean,                // 是否启用（默认 true）
});
```

**优势**:
- 封装了输入相关的所有状态和逻辑
- 自动处理空字符串验证
- 提供 Enter 键提交功能
- 使用 `useCallback` 优化性能

---

### 2. `useVoiceRecording` - 语音录制管理

**位置**: `src/hooks/useVoiceRecording.ts`

**功能**:
- 管理录音状态
- 开始/停止录音
- 切换录音状态

**API**:
```typescript
const {
  isRecording,       // 当前是否正在录音
  startRecording,    // 开始录音
  stopRecording,     // 停止录音
  toggleRecording,   // 切换录音状态
  canRecord,        // 是否可以录音
} = useVoiceRecording({
  onStartRecording: () => Promise<boolean>,  // 开始录音回调
  onStopRecording: () => Promise<void>,      // 停止录音回调
  enabled?: boolean,                          // 是否启用（默认 true）
});
```

**优势**:
- 封装了录音状态管理
- 提供便捷的切换功能
- 防止重复操作
- 异步操作支持

---

### 3. `useSendMessage` - 消息发送管理

**位置**: `src/hooks/useSendMessage.ts`

**功能**:
- 整合消息发送和本地存储
- 自动添加到消息列表
- 统一处理发送逻辑

**API**:
```typescript
const {
  sendMessage,  // 发送消息（同时更新本地状态）
} = useSendMessage({
  sendText: (text: string) => Promise<void>,  // 发送到服务器的函数
});
```

**优势**:
- 将发送逻辑从组件中分离
- 自动处理本地消息列表更新
- 统一消息 ID 和时间戳生成
- 简化组件代码

---

## 重构前后对比

### InputArea 组件

**重构前** (112 行):
- 直接管理 `inputText` 和 `isRecording` 状态
- 包含所有事件处理逻辑
- 代码耦合度高

**重构后** (更简洁):
- 使用 `useTextInput` 管理输入
- 使用 `useVoiceRecording` 管理录音
- 代码更清晰，职责分离

### ChatPage 组件

**重构前**:
- 手动处理消息发送和添加到列表
- 逻辑分散

**重构后**:
- 使用 `useSendMessage` 统一处理
- 代码更简洁

---

## 使用示例

### 在其他组件中使用 useTextInput

```typescript
function MyInputComponent() {
  const { inputText, setInputText, handleSend, canSend } = useTextInput({
    onSend: async (text) => {
      await api.sendMessage(text);
    },
    enabled: true,
  });

  return (
    <div>
      <input 
        value={inputText} 
        onChange={(e) => setInputText(e.target.value)} 
      />
      <button onClick={handleSend} disabled={!canSend}>
        发送
      </button>
    </div>
  );
}
```

### 在其他组件中使用 useVoiceRecording

```typescript
function VoiceButton() {
  const { isRecording, toggleRecording } = useVoiceRecording({
    onStartRecording: async () => {
      const success = await audioService.start();
      return success;
    },
    onStopRecording: async () => {
      await audioService.stop();
    },
  });

  return (
    <button onClick={toggleRecording}>
      {isRecording ? "停止" : "开始"}录音
    </button>
  );
}
```

---

## 性能优化

所有 hooks 都使用了 React 性能优化 API：

1. **`useCallback`**: 缓存函数引用，避免不必要的重新渲染
2. **依赖数组**: 精确控制重新创建的时机
3. **状态隔离**: 每个 hook 只管理自己的状态

---

## 测试建议

每个 hook 都可以独立测试：

```typescript
// 测试 useTextInput
import { renderHook, act } from '@testing-library/react-hooks';
import { useTextInput } from './useTextInput';

test('should send message and clear input', () => {
  const onSend = jest.fn();
  const { result } = renderHook(() => useTextInput({ onSend }));
  
  act(() => {
    result.current.setInputText('Hello');
  });
  
  act(() => {
    result.current.handleSend();
  });
  
  expect(onSend).toHaveBeenCalledWith('Hello');
  expect(result.current.inputText).toBe('');
});
```

---

## 未来扩展建议

### 1. 可以进一步拆分的逻辑：

- **`useConnectionStatus`**: 统一管理连接和认证状态
- **`useMessageList`**: 消息列表的高级操作（搜索、过滤、分页）
- **`useErrorHandler`**: 统一错误处理和提示
- **`useAutoScroll`**: 消息列表自动滚动

### 2. useConnectionStatus 示例

```typescript
function useConnectionStatus(isConnected: boolean, isAuthenticated: boolean) {
  const isReady = isConnected && isAuthenticated;
  const statusText = isReady ? '就绪' : '未就绪';
  const statusColor = isReady ? 'green' : 'red';
  
  return { isReady, statusText, statusColor };
}
```

### 3. useErrorHandler 示例

```typescript
function useErrorHandler() {
  const [error, setError] = useState<string | null>(null);
  
  const showError = useCallback((message: string, duration = 5000) => {
    setError(message);
    setTimeout(() => setError(null), duration);
  }, []);
  
  const clearError = useCallback(() => setError(null), []);
  
  return { error, showError, clearError };
}
```

---

## 总结

通过拆分 hooks，我们实现了：

✅ **代码复用**: hooks 可以在多个组件中使用  
✅ **职责分离**: 每个 hook 只负责一个功能  
✅ **易于测试**: 可以独立测试每个 hook  
✅ **性能优化**: 使用 React 优化 API  
✅ **可维护性**: 代码更清晰，易于理解和修改  
✅ **类型安全**: 完整的 TypeScript 类型定义
