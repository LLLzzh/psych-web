import pako from 'pako';

// 协议版本和序列化类型
export interface Meta {
  version: number;
  serialization: number;
  compression: number;
}

// 消息类型枚举
export const MType = {
  Err: -1,
  Meta: 0,
  Auth: 1,
  Config: 2,
  Cmd: 3,
  Resp: 4,
} as const;

export type MType = typeof MType[keyof typeof MType];

// 消息结构
export interface Message {
  type: MType;
  payload: unknown; 
  timestamp: number;
}

// 错误消息结构
export interface ErrPayload {
  code: number;
  message: string;
  details?: unknown;
}

// 配置消息结构
export interface ConfigPayload {
  ASR?: {
    id: string;
    format: string;
    sample_rate: number;
    channels: number;
    bit_depth: number;
  };
  TTS?: {
    id: string;
    format: string;
    sample_rate: number;
    channels: number;
    bit_depth: number;
  };
  Chat?: {
    id: string;
  };
  Report?: {
    id: string;
  };
}

// 命令类型枚举
export const CmdType = {
  Text: 1,
  AudioASR: 2,
  Audio: 3,
} as const;

export type CmdType = typeof CmdType[keyof typeof CmdType];

// 命令结构
export interface CmdPayload {
  id: number;
  type: CmdType;
  content: string | Uint8Array; // Text为string，Audio相关为二进制
}

// 响应类型枚举
export const RespType = {
  UserText: 1,    // 用户语音识别结果
  ModelText: 2,   // 模型文字输出
  ModelAudio: 3,  // 模型音频输出
} as const;

export type RespType = typeof RespType[keyof typeof RespType];

// 响应结构
export interface RespPayload {
  id: number;
  type: RespType;
  content: string | Uint8Array; // Text为string，Audio为二进制
}

// 消息编码函数
export function encodeMessage(msg: Message, meta: Meta): ArrayBuffer {
  // 1. 序列化Message对象
  const jsonStr = JSON.stringify(msg);
  const data = new TextEncoder().encode(jsonStr);
  
  if (meta.compression === 1) {
    // 实现GZIP压缩
    console.log('compressing',jsonStr)
    const compressedData = pako.gzip(jsonStr);
    return compressedData;
  }
  
  return data.buffer;
}

// 消息解码函数
export function decodeMessage(buffer: ArrayBuffer, meta: Meta): Message | null {
  try {
    const data = new Uint8Array(buffer);
    
    // 1. 解压（如果启用）
    if (meta.compression === 1) {
      // 实现GZIP解压
      const decompressedData = pako.inflate(data);
      const jsonStr = new TextDecoder().decode(decompressedData);
      const obj = JSON.parse(jsonStr);
      
      return {
        type: obj.type,
        payload: JSON.parse(obj.payload), // 直接使用解码后的 payload
        timestamp: obj.timestamp,
      };
    }
    
    // 2. 反序列化（未压缩的情况）
    const jsonStr = new TextDecoder().decode(data);
    const obj = JSON.parse(jsonStr);
    
    return {
      type: obj.type,
      payload: obj.payload, // 直接使用解码后的 payload
      timestamp: obj.timestamp,
    };
  } catch (error) {
    console.error("Failed to decode message:", error);
    return null;
  }
}

// 创建消息的辅助函数
export function createMessage(type: MType, payload: unknown, timestamp?: number): Message {
  return {
    type,
    payload: JSON.stringify(payload), // payload 序列化
    timestamp: timestamp || Math.floor(Date.now() / 1000),
  };
}

// 解析消息payload的辅助函数
export function parsePayload<T>(message: Message): T | null {
  try {
    // payload 现在是JSON字符串，需要解析
    return JSON.parse(message.payload as string) as T;
  } catch (error) {
    console.error("Failed to parse payload:", error);
    return null;
  }
}