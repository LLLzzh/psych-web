import { encodeMessage } from "./message";

export interface AuthPayload {
  AuthType: number;  // -1 = AlreadyAuth
  AuthID: string;
  VerifyCode: string; // JWT
  Info: Record<string, any>;
}

// 构造一个鉴权消息
export function buildAuthMessage(userId: string, token: string): ArrayBuffer {
  const payload: AuthPayload = {
    AuthType: -1,
    AuthID: userId,
    VerifyCode: token,
    Info: { from: "web-demo" }
  };

  return encodeMessage({
    Type: "Auth",
    Payload: payload,
    Timestamp: Math.floor(Date.now() / 1000),
  });
}