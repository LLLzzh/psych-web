import { MType, createMessage } from "./message";

export interface AuthPayload {
  auth_id: string;      // 认证ID，如电话号码
  auth_type: number;    // 校验方式，如Phone
  verify_code: string;  // 校验令牌，如验证码
  info: Record<string, string>; // 额外信息
}

// 认证类型常量
export const AuthType = {
  AlreadyAuth: -1,
  Phone: 1,
} as const;

export type AuthType = typeof AuthType[keyof typeof AuthType];

// 构造一个鉴权消息
export function buildAuthMessage(userId: string, token: string, unitId?: string): ArrayBuffer {
  const payload: AuthPayload = {
    auth_id: userId,
    auth_type: AuthType.AlreadyAuth,
    verify_code: token,
    info: { 
      from: "web-demo",
      ...(unitId && { unit_id: unitId })
    }
  };

  const message = createMessage(MType.Auth, payload);
  // 注意：这里需要传入meta参数，但在这个阶段meta还没有，所以暂时使用默认值
  // 实际使用时应该在Handler层处理
  return message.payload.buffer;
}