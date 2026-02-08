import mitt from "mitt";
import { Handler } from "../protocol/handler";

import { type ConfigPayload, type RespPayload, type ErrPayload } from "../protocol/message";

type Events = {
  open: void;
  close: void;
  wsError: Event;
  connected: void; // 协议连接成功（收到meta）
  config: ConfigPayload;
  response: RespPayload;
  protocolError: ErrPayload;
};

export class Engine {
  private url: string;
  private ws?: WebSocket;
  private heartbeatTimer?: number;
  private reconnectTimer?: number;
  public emitter = mitt<Events>();
  public handler: Handler;

  constructor(url: string) {
    this.url = url;
    this.handler = new Handler();
    
    // 将handler的事件转发到engine的事件系统
    this.handler.emitter.on("connected", () => {
      this.emitter.emit("connected");
    });
    
    this.handler.emitter.on("config", (config) => {
      this.emitter.emit("config", config);
    });
    
    this.handler.emitter.on("response", (response) => {
      this.emitter.emit("response", response);
    });
    
    this.handler.emitter.on("error", (error) => {
      this.emitter.emit("protocolError", error);
    });
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.warn("WebSocket is already connected or connecting.");
      return;
    }

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = undefined;
      }
      this.emitter.emit("open");
      // 注意：不在这里开始心跳，等待收到meta消息后再开始
    };

    this.ws.onmessage = (ev) => {
      if (typeof ev.data === "string") {
        // 处理文本消息（主要是meta消息）
        this.handler.handleTextMessage(ev.data);
      } else if (ev.data instanceof ArrayBuffer) {
        // 处理二进制消息
        this.handler.handleBinaryMessage(ev.data);
      } else if (ev.data instanceof Blob) {
        // 处理Blob类型的消息
        ev.data.arrayBuffer().then(buffer => {
          this.handler.handleBinaryMessage(buffer);
        });
      }
    };

    this.ws.onclose = () => {
      this.emitter.emit("close");
      this.stopHeartbeat();
    };

    this.ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      this.emitter.emit("wsError", err);
      this.ws?.close();
    };
  }

  // 统一的写入接口
  async write(data: string | ArrayBuffer): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not open");
      return;
    }

    this.ws.send(data);
  }

  // 发送二进制消息
  async sendBinary(buffer: ArrayBuffer): Promise<void> {
    await this.write(buffer);
  }

  // 发送文本消息
  async sendText(text: string): Promise<void> {
    await this.write(text);
  }

  // 发送ping消息
  async sendPing(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // 通过handler创建ping消息
      const buffer = this.handler.createPingMessage();
      if (buffer) {
        await this.sendBinary(buffer);
      }
    }
  }

  // 发送文本消息
  async sendTextMessage(id: number, text: string): Promise<void> {
    const buffer = this.handler.createTextCmd(id, text);
    if (buffer) {
      await this.sendBinary(buffer);
    }
  }

  // 发送音频ASR消息
  async sendAudioASRMessage(id: number, audioData: Uint8Array): Promise<void> {
    const buffer = this.handler.createAudioASRCmd(id, audioData);
    if (buffer) {
      await this.sendBinary(buffer);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.sendPing();
    }, 5000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  // 开始心跳（在收到meta消息后调用）
  startHeartbeatAfterMeta() {
    this.startHeartbeat();
  }

  close() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = undefined;
  }
}