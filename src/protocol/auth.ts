import { MType, createMessage } from "./message";
import type { UserInfo } from "../apis/login";

export interface AuthPayload {
  authId: string;      // 认证ID，如电话号码
  authType: number;    // 校验方式，如Phone
  verifyCode: string;  // 校验令牌，如验证码
  info: UserInfo; // 额外信息
}

// 认证类型常量
export const AuthType = {
  AlreadyAuth: -1,
  Phone: 1,
} as const;

export type AuthType = typeof AuthType[keyof typeof AuthType];

// 构造一个鉴权消息
export function buildAuthMessage(userId: string, token: string, info: UserInfo) {
  const payload: AuthPayload = {
    authId: userId,
    authType: AuthType.AlreadyAuth,
    verifyCode: token,
    info: info
  };

  const message = createMessage(MType.Auth, payload);
  // 注意：这里需要传入meta参数，但在这个阶段meta还没有，所以暂时使用默认值
  // 实际使用时应该在Handler层处理
  return message;
}