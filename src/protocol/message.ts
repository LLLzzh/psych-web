// 安全的 Base64 -> UTF8 字符串解码
function base64ToUtf8(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder("utf-8").decode(bytes);
}
import pako from 'pako';
import { formatTime } from '../utils/time';

// 协议版本和序列化类型
export interface Meta {
  version: number;
  serialization: number;
  compression: number;
}

// 消息类型枚举
export const MType = {
  Ping: -2,
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
  timestamp: string;
}

// 错误消息结构
export interface ErrPayload {
  code: number;
  message: string;
  details?: unknown;
}

// 配置消息结构
export interface ConfigPayload {
  id: string;
  modelName: string;
  modelView: string;
  chatConfig: {
    id: string;
  };
  asrConfig: {
    id: string;
    format: string;
    codec: string;
    rate: number;
    bits: number;
    channels: number;
    resultType: string;
  };
  ttsConfig: {
    id: string;
    format: string;
    codec: string;
    rate: number;
    bits: number;
    channels: number;
    resultType: string;
    speechRate: number;
    loudnessRate: number;
    pitchRate: number;
    lang: string;
  };
  reportConfig: {
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
  
  if (meta.compression === 1) {
    // 实现GZIP压缩
    console.log('message before compressing: \n',jsonStr)
    const compressedData = pako.gzip(jsonStr);
    return compressedData.buffer;
  }
  
  const data = new TextEncoder().encode(jsonStr);
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
      const jsonPayload = base64ToUtf8(obj.payload);
      const payload = JSON.parse(jsonPayload);

      console.log('message: \n',{
        type: obj.type,
        payload: payload,
        timestamp: obj.timestamp,
      })

      return {
        type: obj.type,
        payload: payload,
        timestamp: obj.timestamp,
      };
    }
    
    // 2. 反序列化（未压缩的情况）
    const jsonStr = new TextDecoder().decode(data);
    const obj = JSON.parse(jsonStr);
    
    return {
      type: obj.type,
      payload: obj.payload, // payload保持Base64编码状态
      timestamp: obj.timestamp,
    };
  } catch (error) {
    console.error("Failed to decode message:", error);
    return null;
  }
}

// 创建消息的辅助函数
export function createMessage(type: MType, payload: unknown, timestamp?: number): Message {

  if(type === MType.Ping){
    payload= {data: null}
  }
  // 将payload序列化为JSON字符串，然后进行Base64编码
  const jsonPayload = JSON.stringify(payload);
  const base64Payload = btoa(jsonPayload);
  
  return {
    type,
    payload: base64Payload, // payload Base64编码
    timestamp: formatTime(timestamp || Date.now()),
  };
}

// 解析消息payload的辅助函数
export function parsePayload<T>(message: Message): T | null {
  try {
    // 如果payload已经是对象，直接返回
    if (typeof message.payload === 'object' && message.payload !== null) {
      return message.payload as T;
    }
    
    // 如果payload是Base64编码的字符串，需要先解码再解析
    if (typeof message.payload === 'string') {
      const jsonPayload = base64ToUtf8(message.payload);
      return JSON.parse(jsonPayload) as T;
    }
    
    return null;
  } catch (error) {
    console.error("Failed to parse payload:", error);
    return null;
  }
}

// 将base64字符串转换为ArrayBuffer的工具函数
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
