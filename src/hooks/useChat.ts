import { useEffect, useRef, useMemo, useCallback } from "react";
import { Engine } from "../engine/Engine";
import { useConfigStore } from "../store/configStore";
import { useChatStore, handleResponse, stopTTSPlayback } from "../store/chatStore";
import { type AuthPayload, AuthType } from "../protocol/auth";
import { getRespContentData, RespType } from "../protocol/message";
import type { UserInfo } from "../apis/login";
import { ASRService } from "../services/ASRService";
import { CONFIG } from "../config";

export function useChat(
  url: string,
  userId: string,
  token: string,
  info: UserInfo,
  enabled = true
) {
  const engineRef = useRef<Engine | null>(null);
  const asrServiceRef = useRef<ASRService | null>(null);
  const hasSentInterruptForCurrentSpeechRef = useRef(false);
  const isInterruptPendingRef = useRef(false);
  const activeTurnIdRef = useRef<number | null>(null);
  const activeTurnAudioEnabledRef = useRef(false);
  const interruptedTurnIdsRef = useRef(new Set<number>());

  const setConfig = useConfigStore((state) => state.setConfig);
  const {
    setConnected,
    setAuthenticated,
    setError,
    clearError,
    isConnected,
    isAuthenticated,
  } = useChatStore();

  const memoizedInfo = useMemo(
    () => info,
    [info]
  );

  // Ref-based callbacks: updated every render, so closures in useEffect / ASR
  // service always reach the latest implementation without stale captures.
  const interruptActiveTurnRef = useRef<() => Promise<boolean>>(() => Promise.resolve(false));
  interruptActiveTurnRef.current = async (): Promise<boolean> => {
    const targetId = activeTurnIdRef.current;
    if (targetId === null) return true;

    // 浏览器中已播放/已缓冲的音频只能由前端立即停止，不能等待服务端回执。
    stopTTSPlayback();
    interruptedTurnIdsRef.current.add(targetId);
    activeTurnIdRef.current = null;
    activeTurnAudioEnabledRef.current = false;
    if (!enabled || CONFIG.USE_MOCK) return true;
    const engine = engineRef.current;
    if (!engine?.isSocketOpen()) return false;
    const cmdId = useChatStore.getState().nextCmdId();
    await engine.sendInterruptMessage(cmdId, targetId);
    return true;
  };

  const sendTextRef = useRef<(text: string, audioEnabled: boolean) => Promise<boolean>>(() => Promise.resolve(false));
  sendTextRef.current = async (text: string, audioEnabled: boolean): Promise<boolean> => {
    if (!enabled) return false;
    if (CONFIG.USE_MOCK) return true;
    const engine = engineRef.current;
    if (!engine?.isSocketOpen()) {
      console.warn("[useChat] 连接未就绪，无法发送消息");
      return false;
    }
    // 新一轮输入必定先使旧轮失效，防止旧 TTS 缓冲继续播放或音频串轮。
    await interruptActiveTurnRef.current();
    const cmdId = useChatStore.getState().nextCmdId();
    activeTurnIdRef.current = cmdId;
    activeTurnAudioEnabledRef.current = audioEnabled;
    interruptedTurnIdsRef.current.delete(cmdId);
    await engine.sendTextMessage(cmdId, text, audioEnabled);
    return true;
  };

  const sendAudioASRRef = useRef<(audioData: Uint8Array) => Promise<void>>(() => Promise.resolve());
  sendAudioASRRef.current = async (audioData: Uint8Array) => {
    if (!enabled) return;
    const engine = engineRef.current;
    if (!engine?.isSocketOpen()) return;
    const cmdId = useChatStore.getState().nextCmdId();
    await engine.sendAudioASRMessage(cmdId, audioData);
  };

  const sendInterruptRef = interruptActiveTurnRef;

  useEffect(() => {
    if (CONFIG.USE_MOCK) {
      setConnected(enabled);
      setAuthenticated(enabled);
      clearError();
      return () => {
        setConnected(false);
        setAuthenticated(false);
      };
    }
    if (!enabled) {
      void asrServiceRef.current?.stopRecording();
      useChatStore.getState().setVolumeLevel(0);
      setConnected(false);
      setAuthenticated(false);
      clearError();
      return;
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
            },
          }
        );
      }
    });

    engine.emitter.on("response", (response) => {
      if (response.type === RespType.UserText) {
        const contentData = getRespContentData(response.content);
        const hasValidChar =
          typeof contentData === "string" && contentData.trim().length > 0;

        // 仅在模型 TTS 正在播放时：首个有效 ASR 字才发 CType=5，避免模型尚未出声时误发打断
        const ttsPlaying = useChatStore.getState().isTTSPlaying;
        if (
          hasValidChar &&
          !hasSentInterruptForCurrentSpeechRef.current &&
          ttsPlaying
        ) {
          hasSentInterruptForCurrentSpeechRef.current = true;
          isInterruptPendingRef.current = true;
          stopTTSPlayback();
          void sendInterruptRef.current().then((sent) => {
            if (!sent) {
              isInterruptPendingRef.current = false;
            }
          });
        }
      }

      if (response.type === RespType.Interrupt) {
        // 仅消费「本轮因播放中打断」触发的确认，与发送侧成对
        if (isInterruptPendingRef.current) {
          isInterruptPendingRef.current = false;
        }
        interruptedTurnIdsRef.current.add(response.id);
      }

      const shouldPauseFrontendHandling =
        isInterruptPendingRef.current &&
        response.type !== RespType.Interrupt &&
        response.type !== RespType.UserText &&
        response.type !== RespType.ASRStop;

      const isStaleModelResponse =
        (response.type === RespType.ModelText || response.type === RespType.ModelAudio) &&
        (response.id !== activeTurnIdRef.current || interruptedTurnIdsRef.current.has(response.id));

      if (!shouldPauseFrontendHandling && !isStaleModelResponse) {
        const shouldPlayAudio =
          response.type !== RespType.ModelAudio ||
          (response.id === activeTurnIdRef.current &&
            activeTurnAudioEnabledRef.current &&
            !interruptedTurnIdsRef.current.has(response.id));
        handleResponse(response, { shouldPlayAudio });
      }

      if (response.type === RespType.ASRStop) {
        console.info("[ASR] 后端返回 RespType.ASRStop");
        hasSentInterruptForCurrentSpeechRef.current = false;

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
          if (text) {
            store.addThinkingMessage();
            void sendTextRef.current(text, true).then((sent) => {
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
  }, [
    url,
    userId,
    token,
    memoizedInfo,
    enabled,
    clearError,
    setAuthenticated,
    setConfig,
    setConnected,
    setError,
  ]);

  // Stable callbacks returned to consumers – delegate to refs so the
  // identity never changes and downstream useCallback / useMemo stay stable.
  const sendText = useCallback(
    (text: string, audioEnabled: boolean) => sendTextRef.current(text, audioEnabled),
    [],
  );

  const startASR = useCallback(async () => {
    if (!enabled) return false;
    if (!asrServiceRef.current) return false;
    await interruptActiveTurnRef.current();
    hasSentInterruptForCurrentSpeechRef.current = false;
    isInterruptPendingRef.current = false;
    useChatStore.getState().setAcceptingASR(true);
    return await asrServiceRef.current.startContinuousRecording();
  }, [enabled]);

  const stopASR = useCallback(async () => {
    if (!enabled) return;
    hasSentInterruptForCurrentSpeechRef.current = false;
    isInterruptPendingRef.current = false;
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
        await sendTextRef.current(text, true);
      }
    }
  }, [enabled]);

  const getASRState = useCallback(() => {
    return asrServiceRef.current?.getRecordingState() || false;
  }, []);

  const interruptActiveTurn = useCallback(
    () => interruptActiveTurnRef.current(),
    [],
  );

  return {
    sendText,
    startASR,
    stopASR,
    getASRState,
    interruptActiveTurn,
    isConnected,
    isAuthenticated,
  };
}
