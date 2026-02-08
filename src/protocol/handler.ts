import mitt from "mitt";
import { 
  MType, 
  encodeMessage, 
  decodeMessage, 
  createMessage,
  parsePayload,
  type Meta,
  type Message,
  type ConfigPayload,
  type ErrPayload,
  type CmdPayload,
  type RespPayload,
  uint8ArrayToBase64
} from "./message";
import { type AuthPayload } from "./auth";

// 事件类型定义
type HandlerEvents = {
  meta: Meta;
  config: ConfigPayload;
  error: ErrPayload;
  response: RespPayload;
  connected: void;
  disconnected: void;
};

export class Handler {
  private meta: Meta | null = null;
  public emitter = mitt<HandlerEvents>();

  // 设置协议元数据
  setMeta(meta: Meta) {
    this.meta = meta;
    this.emitter.emit("meta", meta);
  }

  // 获取当前元数据
  getMeta(): Meta | null {
    return this.meta;
  }

  // 处理接收到的二进制消息
  handleBinaryMessage(buffer: ArrayBuffer): void {
    if (!this.meta) {
      console.error("Meta not set, cannot decode message");
      return;
    }

    const message = decodeMessage(buffer, this.meta);
    if (!message) {
      console.error("Failed to decode message");
      return;
    }

    this.handleMessage(message);
  }

  // 处理接收到的文本消息（用于Meta消息）
  handleTextMessage(text: string): void {
    try {
      const meta = JSON.parse(text) as Meta;
      this.setMeta(meta);
      this.emitter.emit("connected");
    } catch (error) {
      console.error("Failed to parse meta message:", error);
    }
  }

  // 根据消息类型派发到对应的处理函数
  private handleMessage(message: Message): void {
    switch (message.type) {
      case MType.Meta:
        // Meta消息应该在连接时通过文本消息处理
        break;
      
      case MType.Config:
        { 
          const config = parsePayload<ConfigPayload>(message);
          if (config) {
            this.emitter.emit("config", config);
          }
          break; 
        }
      
      case MType.Err:
        { const error = parsePayload<ErrPayload>(message);
        if (error) {
          this.emitter.emit("error", error);
        }
        break; }
      
      case MType.Resp:
        { const response = parsePayload<RespPayload>(message);
        if (response) {
          this.emitter.emit("response", response);
        }
        break; }
      
      default:
        console.warn("Unhandled message type:", message.type);
    }
  }

  // 创建并编码认证消息
  createAuthMessage(authPayload: AuthPayload): ArrayBuffer | null {
    if (!this.meta) {
      console.error("Meta not set, cannot encode message");
      return null;
    }

    const message = createMessage(MType.Auth, authPayload);
    return encodeMessage(message, this.meta);
  }

  // 创建并编码命令消息
  createCmdMessage(cmdPayload: CmdPayload): ArrayBuffer | null {
    if (!this.meta) {
      console.error("Meta not set, cannot encode message");
      return null;
    }

    const message = createMessage(MType.Cmd, cmdPayload);
    return encodeMessage(message, this.meta);
  }

  // 创建文本命令
  createTextCmd(id: number, text: string): ArrayBuffer | null {
    return this.createCmdMessage({
      id,
      command: 1, // CmdType.Text
      content: text
    });
  }

  // 创建音频ASR命令
  createAudioASRCmd(id: number, audioData: Uint8Array): ArrayBuffer | null {
    return this.createCmdMessage({
      id,
      command: 3, // CmdType.AudioASR
      content: uint8ArrayToBase64(audioData)
    });
  }

  // 创建ping消息
  createPingMessage(): ArrayBuffer | null {
    if (!this.meta) {
      console.error("Meta not set, cannot encode ping message");
      return null;
    }

    const message = createMessage(MType.Ping, null);
    return encodeMessage(message, this.meta);
  }
}
