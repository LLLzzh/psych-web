import { useEffect, useRef } from "react";
import { Engine } from "../engine/Engine";
import { useConfigStore } from "../store/configStore";
import { useChatStore, handleResponse } from "../store/chatStore";
import { type AuthPayload, AuthType } from "../protocol/auth";
import type { UserInfo } from "../apis/login";
import { decodeMessage, type Meta } from "../protocol/message";

export function useChat(url: string, userId: string, token: string, info: UserInfo) {
  const engineRef = useRef<Engine | null>(null);
  const setConfig = useConfigStore((state) => state.setConfig);
  const {
    setConnected,
    setAuthenticated,
    setError,
    clearError,
    nextCmdId,
    isConnected,
    isAuthenticated,
  } = useChatStore();

  useEffect(() => {
    const engine = new Engine(url);
    engineRef.current = engine;

    // WebSocket连接建立
    engine.emitter.on("open", () => {
      console.log("WebSocket 已连接");
      setConnected(true);
      clearError();
    });

    // 协议连接成功（收到meta）
    engine.emitter.on("connected", () => {
      console.log("协议连接成功，开始心跳");
      engine.startHeartbeatAfterMeta();
      
      // 发送认证消息
      
      const authPayload: AuthPayload = {
        authId: userId,
        authType: AuthType.AlreadyAuth,
        verifyCode: token,
        info: info
      };
      const authMessage = engine.handler.createAuthMessage(authPayload);
      if (authMessage) {
        engine.sendBinary(authMessage);
      }
    });

    // 收到配置消息
    engine.emitter.on("config", (config) => {
      console.log("收到配置:", config);
      setConfig(config);
      setAuthenticated(true);
    });

    // 收到响应消息
    engine.emitter.on("response", (response) => {
      handleResponse(response);
    });

    // 收到协议错误
    engine.emitter.on("protocolError", (error) => {
      console.error("协议错误:", error);
      setError(error.message || "协议错误");
    });

    // WebSocket错误
    engine.emitter.on("wsError", (error) => {
      console.error("WebSocket错误:", error);
      setError("连接错误");
      setConnected(false);
    });

    // 连接关闭
    engine.emitter.on("close", () => {
      console.log("WebSocket连接关闭");
      setConnected(false);
      setAuthenticated(false);
    });

    engine.connect();

    return () => {
      engine.close();
      setConnected(false);
      setAuthenticated(false);
    };
  }, [url, userId, token, info, setConfig, setConnected, setAuthenticated, setError, clearError ]);

  // 发送文本消息
  const sendText = async (text: string) => {
    if (!engineRef.current || !isConnected || !isAuthenticated) {
      console.warn("连接未就绪，无法发送消息");
      return;
    }

    const cmdId = nextCmdId();
    const cmdMessage = engineRef.current.handler.createTextCmd(cmdId, text);
    if (cmdMessage) {
      await engineRef.current.sendBinary(cmdMessage);
    }
  };

  // 发送音频ASR消息
  const sendAudioASR = async (audioData: Uint8Array) => {
    if (!engineRef.current || !isConnected || !isAuthenticated) {
      console.warn("连接未就绪，无法发送消息");
      return;
    }

    const cmdId = nextCmdId();
    const cmdMessage = engineRef.current.handler.createAudioASRCmd(cmdId, audioData);
    if (cmdMessage) {
      await engineRef.current.sendBinary(cmdMessage);
    }
  };

  return { 
    sendText, 
    sendAudioASR,
    isConnected,
    isAuthenticated,
  };
}