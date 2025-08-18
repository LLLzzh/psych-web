import mitt from "mitt";

type Events = {
  open: void;
  close: void;
  error: Event;
  text: string;
  binary: ArrayBuffer;
  ping: void;
};

export class Engine {
  private url: string;
  private ws?: WebSocket;
  private heartbeatTimer?: number;
  private reconnectTimer?: number;
  private reconnectDelay = 2000;
  private isManuallyClosed = false;
  public emitter = mitt<Events>();

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.warn("WebSocket is already connected or connecting.");
      return;
    }
    this.isManuallyClosed = false;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = undefined;
      }
      this.emitter.emit("open");
      this.startHeartbeat();
    };

    this.ws.onmessage = (ev) => {
      if (typeof ev.data === "string") {
        if(ev.data === "Ping" ) {
          this.emitter.emit("ping");
        }
        else {
          this.emitter.emit("text", ev.data);
        }
      } else if (ev.data instanceof ArrayBuffer) {
        // 处理二进制消息
        this.emitter.emit("binary", ev.data);
      } else if (ev.data instanceof Blob) {
        // 处理Blob类型的消息
        ev.data.arrayBuffer().then(buffer => {
          this.emitter.emit("binary", buffer);
        });
      }
    };

    this.ws.onclose = () => {
      this.emitter.emit("close");
      this.stopHeartbeat();
      if (!this.isManuallyClosed) {
        this.reconnectTimer = window.setTimeout(() => {
          this.connect();
        }, this.reconnectDelay);
      }
    };

    this.ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      this.emitter.emit("error", err);
      this.ws?.close();
    };
  }

  sendText(text: string | ArrayBuffer) {
    this.ws?.send(text);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.ws?.send("Ping");
      this.emitter.emit("ping");
    }, 5000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  close() {
    this.isManuallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = undefined;
  }
}