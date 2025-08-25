import { useEffect, useRef, useMemo } from "react";
import { Engine } from "../engine/Engine";
import { useConfigStore } from "../store/configStore";
import { useChatStore, handleResponse } from "../store/chatStore";
import { type AuthPayload, AuthType } from "../protocol/auth";
import type { UserInfo } from "../apis/login";
import { ASRService } from "../services/ASRService";
//import { decodeMessage, type Meta } from "../protocol/message";

export function useChat(url: string, userId: string, token: string, info: UserInfo) {
  const engineRef = useRef<Engine | null>(null);
  const asrServiceRef = useRef<ASRService | null>(null);
  
  // 使用useCallback优化函数依赖
  const setConfig = useConfigStore((state) => state.setConfig);
  const {
    setConnected,
    setAuthenticated,
    setError,
    clearError,
    nextCmdId,
    addMessage,
    setASRResultHandler,
    isConnected,
    isAuthenticated,
  } = useChatStore();

  // 使用useMemo优化info对象依赖
  const memoizedInfo = useMemo(() => info, [info.userId, info.strong, info.unitId, info.studentId]);

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
        info: memoizedInfo
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
      
      // 初始化ASR服务
      if (config.asrConfig && !asrServiceRef.current) {
        asrServiceRef.current = new ASRService();
        asrServiceRef.current.initialize(
          config.asrConfig,
          (text: string) => {
            // ASR识别结果回调，添加到消息列表
            console.log("ASR识别结果:", text);
            addMessage({
              id: `user-${Date.now()}`,
              type: "user",
              content: text,
              timestamp: Date.now(),
            });
          },
          sendAudioASR
        );
        
        // 设置ASR结果处理函数
        setASRResultHandler((text: string) => {
          if (asrServiceRef.current) {
            asrServiceRef.current.handleASRResult(text);
          }
        });
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
  }, [url, userId, token, memoizedInfo]);

  // 发送文本消息
  const sendText = async (text: string) => {
    if (!engineRef.current || !isConnected || !isAuthenticated) {
      console.warn("连接未就绪，无法发送消息");
      return;
    }

    const cmdId = nextCmdId();
    await engineRef.current.sendTextMessage(cmdId, text);
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