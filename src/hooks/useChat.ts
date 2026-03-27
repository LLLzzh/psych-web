import { useEffect, useRef, useMemo, useCallback } from "react";
import { Engine } from "../engine/Engine";
import { useConfigStore } from "../store/configStore";
import { useChatStore, handleResponse, stopTTSPlayback } from "../store/chatStore";
import { type AuthPayload, AuthType } from "../protocol/auth";
import { RespType } from "../protocol/message";
import type { UserInfo } from "../apis/login";
import { ASRService } from "../services/ASRService";
import { CONFIG } from "../config";

export function useChat(url: string, userId: string, token: string, info: UserInfo) {
  const engineRef = useRef<Engine | null>(null);
  const asrServiceRef = useRef<ASRService | null>(null);

  const setConfig = useConfigStore((state) => state.setConfig);
  const {
    setConnected,
    setAuthenticated,
    setError,
    clearError,
    isConnected,
    isAuthenticated,
  } = useChatStore();

  const memoizedInfo = useMemo(() => info, [info.userId, info.unitId, info.studentId]);

  // Ref-based callbacks: updated every render, so closures in useEffect / ASR
  // service always reach the latest implementation without stale captures.
  const sendTextRef = useRef<(text: string) => Promise<boolean>>(() => Promise.resolve(false));
  sendTextRef.current = async (text: string): Promise<boolean> => {
    if (CONFIG.USE_MOCK) return true;
    const engine = engineRef.current;
    if (!engine?.isSocketOpen()) {
      console.warn("[useChat] 连接未就绪，无法发送消息");
      return false;
    }
    const cmdId = useChatStore.getState().nextCmdId();
    await engine.sendTextMessage(cmdId, text);
    return true;
  };

  const sendAudioASRRef = useRef<(audioData: Uint8Array) => Promise<void>>(() => Promise.resolve());
  sendAudioASRRef.current = async (audioData: Uint8Array) => {
    const engine = engineRef.current;
    if (!engine?.isSocketOpen()) return;
    const cmdId = useChatStore.getState().nextCmdId();
    await engine.sendAudioASRMessage(cmdId, audioData);
  };

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

    engine.emitter.on("open", () => {
      setConnected(true);
      clearError();
    });

    engine.emitter.on("connected", () => {
      engine.startHeartbeatAfterMeta();

      const authPayload: AuthPayload = {
        authId: userId,
        authType: AuthType.AlreadyAuth,
        verifyCode: token,
        info: memoizedInfo,
      };
      const authMessage = engine.handler.createAuthMessage(authPayload);
      if (authMessage) {
        engine.sendBinary(authMessage);
      }
    });

    engine.emitter.on("config", (config) => {
      setConfig(config);
      setAuthenticated(true);

      if (config.asrConfig) {
        if (!asrServiceRef.current) {
          asrServiceRef.current = new ASRService();
        }
        asrServiceRef.current.initialize(
          config.asrConfig,
          (text: string) => useChatStore.getState().upsertStreamingUserMessage(text),
          (audioData: Uint8Array) => sendAudioASRRef.current(audioData),
          {
            onVolumeChange: (rms: number) => useChatStore.getState().setVolumeLevel(rms),
            onSpeakingChange: (speaking: boolean) => {
              useChatStore.getState().setIsSpeaking(speaking);
              if (speaking && useChatStore.getState().isTTSPlaying) {
                stopTTSPlayback();
              }
            },
          }
        );
      }
    });

    engine.emitter.on("response", (response) => {
      handleResponse(response);

      if (response.type === RespType.ASRStop) {
        console.info("[useChat] <<< 收到后端 ASRStop (800ms静音)，本段 ASR 结束");

        // handleServerStop 内部的 ws.send 是同步的（尽管函数签名为 async），
        // 用 void 触发即可；下面的 sendText 也在同一个同步块中执行 ws.send，
        // 这样两次发送都在 onclose 事件触发之前完成，避免连接关闭导致发送失败。
        const asr = asrServiceRef.current;
        if (asr) {
          void asr.handleServerStop();
        }

        const store = useChatStore.getState();
        const { messages } = store;
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.type === "user" && lastMessage.isStreamingASR) {
          const text = lastMessage.content.trim();
          console.info("[useChat] 本段识别文本:", text || "(空)");
          if (text) {
            store.addThinkingMessage();
            void sendTextRef.current(text).then((sent) => {
              if (!sent) useChatStore.getState().clearLastThinkingMessage();
            });
          }
          store.finalizeStreamingUserMessage();
        }
      }
    });

    engine.emitter.on("protocolError", (error) => {
      console.error("协议错误:", error);
      setError(error.message || "协议错误");
    });

    engine.emitter.on("wsError", (error) => {
      console.error("WebSocket错误:", error);
      setError("连接错误");
      setConnected(false);
      void asrServiceRef.current?.stopRecording();
      useChatStore.getState().setVolumeLevel(0);
    });

    engine.emitter.on("close", () => {
      setConnected(false);
      setAuthenticated(false);
      void asrServiceRef.current?.stopRecording();
      useChatStore.getState().setVolumeLevel(0);
    });

    engine.connect();

    return () => {
      engine.close();
      setConnected(false);
      setAuthenticated(false);
    };
  }, [url, userId, token, memoizedInfo, clearError, setAuthenticated, setConfig, setConnected, setError]);

  // Stable callbacks returned to consumers – delegate to refs so the
  // identity never changes and downstream useCallback / useMemo stay stable.
  const sendText = useCallback(
    (text: string) => sendTextRef.current(text),
    [],
  );

  const startASR = useCallback(async () => {
    if (!asrServiceRef.current) return false;
    if (useChatStore.getState().isTTSPlaying) {
      stopTTSPlayback();
    }
    useChatStore.getState().setAcceptingASR(true);
    return await asrServiceRef.current.startContinuousRecording();
  }, []);

  const stopASR = useCallback(async () => {
    if (asrServiceRef.current) {
      await asrServiceRef.current.stopContinuousRecording();
    }

    const store = useChatStore.getState();
    store.setAcceptingASR(false);
    store.setIsSpeaking(false);

    const { messages } = store;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.type === "user" && lastMessage.isStreamingASR) {
      const text = lastMessage.content.trim();
      store.finalizeStreamingUserMessage();
      if (text) {
        store.addThinkingMessage();
        await sendTextRef.current(text);
      }
    }
  }, []);

  const getASRState = useCallback(() => {
    return asrServiceRef.current?.getRecordingState() || false;
  }, []);

  return {
    sendText,
    startASR,
    stopASR,
    getASRState,
    isConnected,
    isAuthenticated,
  };
}
