import { useChat } from "../hooks/useChat";
import { useSendMessage } from "../hooks/useSendMessage";
import { useChatStore } from "../store/chatStore";
import { useAuthStore } from "../store/authStore";
import { Sidebar } from "./Sidebar";
import { ChatArea } from "./ChatArea";
import { InputArea } from "./InputArea";
import { ErrorMessage } from "./ErrorMessage";
import { Background } from "./Background";
import { MobileVoiceChatOverlay } from "./MobileVoiceChatOverlay";
import { CONFIG } from "../config";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useConfigStore } from "../store/configStore";

function ChatPage() {
  const navigate = useNavigate();
  const { userId, token, info, clearAuth } = useAuthStore();
  const { theme, toggleTheme } = useConfigStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hasShownConnected, setHasShownConnected] = useState(false);
  const [endConversationSignal, setEndConversationSignal] = useState(0);
  const [enterVoiceModeSignal, setEnterVoiceModeSignal] = useState(0);
  const [isMobileVoiceMode, setIsMobileVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  
  // 监听认证状态，如果无效则跳转登录
  useEffect(() => {
    if (!userId || !token) {
      navigate("/login");
    }
  }, [userId, token, navigate]);

  const {
    sendText,
    startASR,
    stopASR,
    getASRState,
    isConnected,
    isAuthenticated,
  } = useChat(CONFIG.WS_URL, userId, token, info || { userId: "", unitId: "", studentId: "" });
  const { error, clearMessages, clearError } = useChatStore();

  // 监听 WebSocket 错误，处理认证失败
  useEffect(() => {
    if (error && (error.includes("未授权") || error.includes("认证失败") || error.includes("401"))) {
      clearAuth();
      navigate("/login");
    }
  }, [error, clearAuth, navigate]);

  useEffect(() => {
    if (isConnected && isAuthenticated && !hasShownConnected) {
      message.success("连接成功");
      setHasShownConnected(true);
    }
    if (!isConnected || !isAuthenticated) {
      setHasShownConnected(false);
    }
  }, [isConnected, isAuthenticated, hasShownConnected]);

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const handleEndConversation = () => {
    setEndConversationSignal((prev) => prev + 1);
    void stopASR();
    clearMessages();
    clearError();
    setIsMobileVoiceMode(false);
    message.success("对话已结束");
  };

  const handleVoiceModeChange = useCallback((isVoiceMode: boolean) => {
    setIsMobileVoiceMode(isVoiceMode);
  }, []);

  const handleEnterVoiceMode = useCallback(() => {
    setEnterVoiceModeSignal((prev) => prev + 1);
  }, []);

  const handleCloseMobileVoiceOverlay = useCallback(() => {
    setEndConversationSignal((prev) => prev + 1);
    void stopASR();
    setIsMobileVoiceMode(false);
  }, [stopASR]);

  const messages = useChatStore((state) => state.messages);
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.type === "assistant" && !lastMessage.isThinking) {
      setIsSpeaking(true);
      const timer = setTimeout(() => setIsSpeaking(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // 使用消息发送 hook
  const { sendMessage } = useSendMessage({ sendText });

  const displayError = error || (!isConnected ? "连接未建立，请检查网络" : null);
  const handleErrorClose = error ? clearError : () => {};

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans">
      <Background mobileLightOnly />
      <div className="relative z-10 flex w-full h-full flex-col md:flex-row">
        <div className="fixed top-0 left-0 right-0 z-20 md:static md:z-auto">
          <Sidebar
            isConnected={isConnected}
            isAuthenticated={isAuthenticated}
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
          {theme === "dark" && (
            <div
              className="pointer-events-none absolute inset-y-[42px] inset-x-[53px] hidden rounded-[50px] bg-[rgba(0,0,0,0.2)] backdrop-blur-[15px] md:block"
              aria-hidden="true"
            />
          )}

          {displayError && (
            <div className="absolute top-20 md:top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
              <ErrorMessage message={displayError} onClose={handleErrorClose} />
            </div>
          )}

          <div className="relative z-10 flex-1 h-full overflow-hidden flex flex-col">
             <ChatArea />
          </div>

          <div className="fixed bottom-0 left-0 w-full z-20 md:absolute md:z-10">
            <InputArea
                isConnected={isConnected}
                isAuthenticated={isAuthenticated}
                onSendText={sendMessage}
                onStartASR={startASR}
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
        onToggleTheme={toggleTheme}
        isSpeaking={isSpeaking}
      />
    </div>
  );
}

export default ChatPage;
