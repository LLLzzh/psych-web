# WebSocket Chat Demo

这是一个基于WebSocket的聊天应用演示，实现了完整的前后端协议。

## 协议架构

### 核心组件

1. **Engine层** (`src/engine/Engine.ts`)
   - 负责WebSocket连接管理
   - 处理Ping/Pong心跳机制
   - 提供统一的写入接口，维护互斥锁
   - 自动重连机制

2. **Handler层** (`src/protocol/handler.ts`)
   - 负责应用层消息的编码/解码
   - 根据消息类型派发到对应处理组件
   - 管理协议元数据(Meta)

3. **协议层** (`src/protocol/`)
   - `message.ts`: 定义所有消息类型和结构
   - `auth.ts`: 认证相关协议

4. **状态管理** (`src/store/`)
   - `configStore.ts`: 配置信息管理
   - `chatStore.ts`: 聊天状态和消息管理

### 协议流程

1. **建立连接**
   - 建立WebSocket连接
   - 后端立即返回Meta消息（JSON格式）
   - 前端解析Meta并开始心跳

2. **认证**
   - 发送Auth消息进行身份验证
   - 支持AlreadyAuth模式（传入user_id和JWT）
   - 认证成功后返回配置信息

3. **对话**
   - 发送Cmd消息（文本或音频ASR）
   - 接收Resp消息（用户识别结果、模型输出、音频）
   - 维护递增的命令ID

4. **心跳**
   - 每5秒发送Ping消息
   - 后端30秒超时判断

## 消息类型

### 基础消息结构
```typescript
interface Message {
  type: MType;           // 消息类型
  payload: Uint8Array;   // 消息内容（JSON序列化后）
  timestamp: number;     // 时间戳（秒级）
}
```

### 消息类型枚举
- `MType.Err = -1`: 错误消息
- `MType.Meta = 0`: 协议元数据
- `MType.Auth = 1`: 认证消息
- `MType.Config = 2`: 配置消息
- `MType.Cmd = 3`: 命令消息
- `MType.Resp = 4`: 响应消息

### 命令类型
- `CmdType.Text = 1`: 文本输入
- `CmdType.AudioASR = 2`: 音频识别
- `CmdType.Audio = 3`: 纯音频（预留）

### 响应类型
- `RespType.UserText = 1`: 用户语音识别结果
- `RespType.ModelText = 2`: 模型文字输出
- `RespType.ModelAudio = 3`: 模型音频输出

## 使用方法

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```

### 3. 配置连接
在界面中配置：
- WebSocket URL: 后端WebSocket地址
- 用户ID: 用户标识
- Token: JWT认证令牌

### 4. 开始对话
- 连接成功后会自动进行认证
- 认证通过后可以发送文本消息
- 支持实时显示对话历史
- 支持音频播放（如果有音频响应）

## 开发说明

### 添加新的消息类型

1. 在 `src/protocol/message.ts` 中定义新的类型和结构
2. 在 `src/protocol/handler.ts` 中添加处理逻辑
3. 在 `src/store/chatStore.ts` 中添加状态管理

### 扩展音频功能

1. 实现音频录制功能
2. 在 `useChat` hook中添加音频发送逻辑
3. 在UI中添加音频录制按钮

### 错误处理

- 协议错误会显示在界面上
- WebSocket连接错误会自动重连
- 认证失败会显示相应错误信息

## 技术栈

- **前端框架**: React 19 + TypeScript
- **状态管理**: Zustand
- **事件系统**: Mitt
- **构建工具**: Vite
- **样式**: CSS3 + 响应式设计

## 协议特点

1. **二进制编码**: 所有应用层消息都使用二进制编码
2. **压缩支持**: 预留GZIP压缩接口
3. **版本控制**: 支持协议版本升级
4. **类型安全**: 完整的TypeScript类型定义
5. **错误处理**: 完善的错误处理机制
6. **心跳保活**: 自动心跳机制确保连接稳定

## 注意事项

1. 目前压缩功能未实现，使用无压缩模式
2. 音频ASR功能需要配合后端实现
3. 纯音频对话功能预留接口，暂未实现
4. 建议在生产环境中添加更完善的错误恢复机制
