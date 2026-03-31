import { useChat } from "../hooks/useChat";
import { useSendMessage } from "../hooks/useSendMessage";
import { stopTTSPlayback, useChatStore } from "../store/chatStore";
import { useAuthStore } from "../store/authStore";
import { createConversation } from "../apis/conversation";
import { getModelAndBgImage } from "../apis/config";
import { Sidebar } from "./Sidebar";
import { ChatArea } from "./ChatArea";
import { InputArea } from "./InputArea";
import { ErrorMessage } from "./ErrorMessage";
import { Background } from "./Background";
import { MobileVoiceChatOverlay } from "./MobileVoiceChatOverlay";
import { CONFIG } from "../config";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConfigStore } from "../store/configStore";

function ChatPage() {
  const navigate = useNavigate();
  const { userId, token, info, clearAuth } = useAuthStore();
  const { theme, setBackgroundImage, setModelView } = useConfigStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hasShownConnected, setHasShownConnected] = useState(false);
  const [hasConversationStarted, setHasConversationStarted] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [endConversationSignal, setEndConversationSignal] = useState(0);
  const [enterVoiceModeSignal, setEnterVoiceModeSignal] = useState(0);
  const [isMobileVoiceMode, setIsMobileVoiceMode] = useState(false);
  const [isMobileRecording, setIsMobileRecording] = useState(false);
  
  const hasConversationStartedRef = useRef(false);
  const isConnectedRef = useRef(false);
  const isAuthenticatedRef = useRef(false);
  const currentConversationIdRef = useRef<string | null>(null);
  const startConversationPromiseRef = useRef<Promise<boolean> | null>(null);
  useEffect(() => {
    hasConversationStartedRef.current = hasConversationStarted;
  }, [hasConversationStarted]);

  useEffect(() => {
    currentConversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  const wsAuthInfo = useMemo(
    () => ({
      ...(info || { userId: "", unitId: "", studentId: "" }),
      ...(currentConversationId ? { conversationId: currentConversationId } : {}),
    }),
    [info, currentConversationId]
  );

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  
  // 监听认证状态，如果无效则跳转登录
  useEffect(() => {
    if (!userId || !token) {
      navigate("/login");
    }
  }, [userId, token, navigate]);

  useEffect(() => {
    const unitId = info?.unitId;
    if (!unitId) return;
    getModelAndBgImage(unitId)
      .then((res) => {
        if (res.data?.backgroundImage) setBackgroundImage(res.data.backgroundImage);
        if (res.data?.modelView) setModelView(res.data.modelView);
      })
      .catch((err) => {
        console.error("获取背景图和教师形象失败:", err);
      });
  }, [info?.unitId, setBackgroundImage, setModelView]);

  const {
    sendText,
    startASR,
    stopASR,
    getASRState,
    isConnected,
    isAuthenticated,
  } = useChat(
    CONFIG.WS_URL,
    userId,
    token,
    wsAuthInfo,
    hasConversationStarted
  );
  const { error, clearMessages, clearError } = useChatStore();
  const isConnecting = hasConversationStarted && (!isConnected || !isAuthenticated);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // 监听 WebSocket 错误，处理认证失败
  useEffect(() => {
    if (error && (error.includes("未授权") || error.includes("认证失败") || error.includes("401"))) {
      clearAuth();
      navigate("/login");
    }
  }, [error, clearAuth, navigate]);

  useEffect(() => {
    if (hasConversationStarted && isConnected && isAuthenticated && !hasShownConnected) {
      message.success("连接成功");
      setHasShownConnected(true);
    }
    if (!hasConversationStarted || !isConnected || !isAuthenticated) {
      setHasShownConnected(false);
    }
  }, [hasConversationStarted, isConnected, isAuthenticated, hasShownConnected]);

  const ensureConversationStarted = useCallback(async (): Promise<boolean> => {
    if (isConnectedRef.current && isAuthenticatedRef.current) {
      return true;
    }
    if (startConversationPromiseRef.current) {
      return startConversationPromiseRef.current;
    }

    const startPromise = (async () => {
      if (!hasConversationStartedRef.current) {
        clearError();
        let conversationId = currentConversationIdRef.current;
        if (!conversationId) {
          const response = await createConversation();
          conversationId = response.conversationId;
          if (!conversationId) {
            throw new Error("conversationId is empty");
          }
          setCurrentConversationId(conversationId);
          currentConversationIdRef.current = conversationId;
        }

        setHasConversationStarted(true);
        message.loading({ content: "连接中...", key: "chat-connecting", duration: 0 });
      }

      const timeoutAt = Date.now() + 10000;
      while (Date.now() < timeoutAt) {
        if (isConnectedRef.current && isAuthenticatedRef.current) {
          return true;
        }
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 120);
        });
      }

      message.error("连接超时，请重试");
      setHasConversationStarted(false);
      return false;
    })().catch((error) => {
      console.error("创建会话失败:", error);
      message.error("创建会话失败，请重试");
      setHasConversationStarted(false);
      return false;
    });

    startConversationPromiseRef.current = startPromise;
    const ok = await startPromise;
    startConversationPromiseRef.current = null;
    return ok;
  }, [clearError]);

  useEffect(() => {
    if (!isConnecting) {
      message.destroy("chat-connecting");
    }
  }, [isConnecting]);

  useEffect(() => {
    return () => {
      message.destroy("chat-connecting");
    };
  }, []);

  const sendTextWithAutoStart = useCallback(
    async (text: string) => {
      const ready = await ensureConversationStarted();
      if (!ready) return false;
      return sendText(text);
    },
    [ensureConversationStarted, sendText]
  );

  const startASRWithAutoStart = useCallback(async () => {
    const ready = await ensureConversationStarted();
    if (!ready) return false;
    return startASR();
  }, [ensureConversationStarted, startASR]);

  const handleLogout = () => {
    clearAuth();
    setCurrentConversationId(null);
    currentConversationIdRef.current = null;
    navigate("/login");
  };

  const handleEndConversation = () => {
    if (!hasConversationStarted) {
      message.warning("请先开始对话");
      return;
    }

    stopTTSPlayback();
    setEndConversationSignal((prev) => prev + 1);
    void stopASR();
    clearMessages();
    clearError();
    setHasConversationStarted(false);
    setCurrentConversationId(null);
    currentConversationIdRef.current = null;
    setIsMobileVoiceMode(false);
    setIsMobileRecording(false);

    message.success("对话已结束");
  };

  const handleVoiceModeChange = useCallback((isVoiceMode: boolean) => {
    setIsMobileVoiceMode(isVoiceMode);
    if (isVoiceMode) {
      void ensureConversationStarted();
    }
  }, [ensureConversationStarted]);

  const handleEnterVoiceMode = useCallback(() => {
    void ensureConversationStarted();
    setEnterVoiceModeSignal((prev) => prev + 1);
  }, [ensureConversationStarted]);

  const handleCloseMobileVoiceOverlay = useCallback(() => {
    setEndConversationSignal((prev) => prev + 1);
    void stopASR();
    setIsMobileVoiceMode(false);
    setIsMobileRecording(false);
  }, [stopASR]);

  const handleMobileStartASR = useCallback(async () => {
    const ok = await startASRWithAutoStart();
    if (ok) setIsMobileRecording(true);
    return ok;
  }, [startASRWithAutoStart]);

  const handleMobileStopASR = useCallback(async () => {
    await stopASR();
    setIsMobileRecording(false);
  }, [stopASR]);

  const isTTSPlaying = useChatStore((state) => state.isTTSPlaying);

  // 使用消息发送 hook
  const { sendMessage } = useSendMessage({ sendText: sendTextWithAutoStart });

  const displayError = error;
  const showConnectingNotice =
    hasConversationStarted && !error && (!isConnected || !isAuthenticated);
  const handleErrorClose = error ? clearError : () => {};

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans">
      <Background mobileLightOnly />
      <div className="relative z-10 flex w-full h-full flex-col md:flex-row">
        <div className="fixed top-0 left-0 right-0 z-20 md:static md:z-auto">
          <Sidebar
            isConnected={isConnected}
            isAuthenticated={isAuthenticated}
            hasConversationStarted={hasConversationStarted}
            isConnecting={isConnecting}
            onLogout={handleLogout}
            onEndConversation={handleEndConversation}
            onViewConversationRecords={() => navigate("/records")}
            onEnterVoiceMode={handleEnterVoiceMode}
            onClearMessages={clearMessages}
            collapsed={isSidebarCollapsed}
            onToggle={toggleSidebar}
          />
        </div>

        <div className="flex-1 flex flex-col h-full relative">

          {displayError && (
            <div className="absolute top-20 md:top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
              <ErrorMessage message={displayError} onClose={handleErrorClose} />
            </div>
          )}
          {showConnectingNotice && (
            <div className="absolute top-20 md:top-4 left-1/2 -translate-x-1/2 z-40 rounded-full px-4 py-2 text-sm text-white bg-black/35 backdrop-blur-sm">
              连接中，请稍候...
            </div>
          )}

          <div
            className={`relative z-10 flex-1 min-h-0 overflow-hidden flex flex-col ${
              theme === "dark" ? "md:px-[53px] md:py-[42px]" : ""
            }`}
          >
            <div
              className={`flex min-h-0 flex-1 ${
                theme === "dark"
                  ? "md:rounded-[50px] md:bg-[rgba(0,0,0,0.2)] md:backdrop-blur-[15px] md:overflow-hidden"
                  : ""
              }`}
            >
              <ChatArea />
            </div>
          </div>

          <div className="fixed bottom-0 left-0 w-full z-20 md:absolute md:z-10">
            <InputArea
                onSendText={sendMessage}
                onStartASR={startASRWithAutoStart}
                onStopASR={stopASR}
                onGetASRState={getASRState}
                endConversationSignal={endConversationSignal}
                enterVoiceModeSignal={enterVoiceModeSignal}
                onVoiceModeChange={handleVoiceModeChange}
            />
          </div>
        </div>
      </div>

      <MobileVoiceChatOverlay
        isVisible={isMobileVoiceMode}
        onClose={handleCloseMobileVoiceOverlay}
        onViewConversationRecords={() => navigate("/records")}
        onSwitchToChatMode={handleCloseMobileVoiceOverlay}
        isSpeaking={isTTSPlaying}
        onStartASR={handleMobileStartASR}
        onStopASR={handleMobileStopASR}
        isRecording={isMobileRecording}
      />
    </div>
  );
}

export default ChatPage;
