import { useEffect, useRef, useMemo } from "react";
import { Engine } from "../engine/Engine";
import { useConfigStore } from "../store/configStore";
import { useChatStore, handleResponse } from "../store/chatStore";
import { type AuthPayload, AuthType } from "../protocol/auth";
import type { UserInfo } from "../apis/login";
import { ASRService } from "../services/ASRService";
import { CONFIG } from "../config";
//import { decodeMessage, type Meta } from "../protocol/message";

export function useChat(url: string, userId: string, token: string, info: UserInfo) {
  const engineRef = useRef<Engine | null>(null);
  const asrServiceRef = useRef<ASRService | null>(null);
  
  const setConfig = useConfigStore((state) => state.setConfig);
  const {
    setConnected,
    setAuthenticated,
    setError,
    clearError,
    nextCmdId,
    upsertStreamingUserMessage,
    isConnected,
    isAuthenticated,
  } = useChatStore();

  // 使用useMemo优化info对象依赖
  const memoizedInfo = useMemo(() => info, [info.userId, info.unitId, info.studentId]);

  useEffect(() => {
    if (CONFIG.USE_MOCK) {
      setConnected(true);
      setAuthenticated(true);
      clearError();
      return () => {
        setConnected(false);
        setAuthenticated(false);
      };
    }
    const engine = new Engine(url);
    engineRef.current = engine;

    // WebSocket连接建立
    engine.emitter.on("open", () => {
      setConnected(true);
      clearError();
    });

    // 协议连接成功（收到meta）
    engine.emitter.on("connected", () => {
      engine.startHeartbeatAfterMeta();
      
      // 发送认证消息
      
      const authPayload: AuthPayload = {
        authId: userId,
        authType: AuthType.AlreadyAuth,
        verifyCode: token,
        info: memoizedInfo
      };
      const authMessage = engine.handler.createAuthMessage(authPayload);
      if (authMessage) {
        engine.sendBinary(authMessage);
      }
    });

    // 收到配置消息
    engine.emitter.on("config", (config) => {
      setConfig(config);
      setAuthenticated(true);
      
      // 初始化ASR服务
      if (config.asrConfig) {
        if (!asrServiceRef.current) {
          asrServiceRef.current = new ASRService();
        }
        // 每次收到最新配置都刷新ASR参数，确保按后端asrConfig录音与发送
        asrServiceRef.current.initialize(
          config.asrConfig,
          (text: string) => {
            upsertStreamingUserMessage(text);
          },
          sendAudioASR
        );
      }
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
      void asrServiceRef.current?.stopRecording();
    });

    // 连接关闭
    engine.emitter.on("close", () => {
      setConnected(false);
      setAuthenticated(false);
      void asrServiceRef.current?.stopRecording();
    });

    engine.connect();

    return () => {
      engine.close();
      setConnected(false);
      setAuthenticated(false);
    };
  }, [url, userId, token, memoizedInfo, clearError, nextCmdId, setAuthenticated, setConfig, setConnected, setError, upsertStreamingUserMessage]);

  // 发送文本消息
  const sendText = async (text: string): Promise<boolean> => {
    if (CONFIG.USE_MOCK) {
      return true;
    }
    if (!engineRef.current || !isConnected || !isAuthenticated) {
      console.warn("连接未就绪，无法发送消息");
      return false;
    }

    const cmdId = nextCmdId();
    await engineRef.current.sendTextMessage(cmdId, text);
    return true;
  };

  // 发送音频ASR消息
  const sendAudioASR = async (audioData: Uint8Array) => {
    if (engineRef.current) {
      const cmdId = nextCmdId();
      await engineRef.current.sendAudioASRMessage(cmdId, audioData);
    }
  };

  // ASR相关方法
  const startASR = async () => {
    if (asrServiceRef.current) {
      return await asrServiceRef.current.startRecording();
    }
    return false;
  };

  const stopASR = async () => {
    if (asrServiceRef.current) {
      await asrServiceRef.current.stopRecording();
    }
  };

  const getASRState = () => {
    return asrServiceRef.current?.getRecordingState() || false;
  };

  const handleASRResult = (text: string) => {
    if (asrServiceRef.current) {
      asrServiceRef.current.handleASRResult(text);
    }
  };

  return { 
    sendText, 
    sendAudioASR,
    startASR,
    stopASR,
    getASRState,
    handleASRResult,
    isConnected,
    isAuthenticated,
  };
}
