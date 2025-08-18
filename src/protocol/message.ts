export type MessageType = "Text" | "Auth" | "Config";

export interface Message {
    Type: MessageType;
    Payload: string | object;
    Timestamp: number;
  }
  
  export function encodeMessage(msg: Message): ArrayBuffer {
    const str = JSON.stringify(msg);
    return new TextEncoder().encode(str).buffer;
  }
  
  export function decodeMessage(buf: ArrayBuffer): Message | null {
    try {
      const str = new TextDecoder().decode(buf);
      return JSON.parse(str) as Message;
    } catch {
      return null;
    }
  }