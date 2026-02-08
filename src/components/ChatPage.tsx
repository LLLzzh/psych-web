import { useChat } from "../hooks/useChat";
import { useSendMessage } from "../hooks/useSendMessage";
import { useChatStore } from "../store/chatStore";
import { useAuthStore } from "../store/authStore";
import { Sidebar } from "./Sidebar";
import { ChatArea } from "./ChatArea";
import { InputArea } from "./InputArea";
import { ErrorMessage } from "./ErrorMessage";
import { CONFIG } from "../config";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

function ChatPage() {
  const navigate = useNavigate();
  const { userId, token, info, clearAuth } = useAuthStore();
  
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
    isConnected,
    isAuthenticated,
  } = useChat(CONFIG.WS_URL, userId, token, info || { userId: "", strong: false, unitId: "", studentId: "" });
  const { error, clearMessages, clearError } = useChatStore();

  // 监听 WebSocket 错误，处理认证失败
  useEffect(() => {
    if (error && (error.includes("未授权") || error.includes("认证失败") || error.includes("401"))) {
      clearAuth();
      navigate("/login");
    }
  }, [error, clearAuth, navigate]);

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  // 使用消息发送 hook
  const { sendMessage } = useSendMessage({ sendText });

  return (
    <div className="flex w-full h-screen bg-white overflow-hidden font-sans">
        {/* 左侧 Sidebar */}
        <Sidebar
          isConnected={isConnected}
          isAuthenticated={isAuthenticated}
          onLogout={handleLogout}
          onClearMessages={clearMessages}
        />

        {/* 右侧内容区域 */}
        <div className="flex-1 flex flex-col h-full relative bg-[#F9FAFB]">
          {/* 错误提示 - 悬浮在顶部 */}
          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
              <ErrorMessage message={error} onClose={clearError} />
            </div>
          )}

          {/* 对话区域 - 占据整个高度，底部留出空间给输入框 */}
          <div className="flex-1 h-full pb-32 overflow-hidden flex flex-col">
             <ChatArea />
          </div>

          {/* 输入区域 - 绝对定位在底部 */}
          <div className="absolute bottom-0 left-0 w-full z-10">
            <InputArea
                isConnected={isConnected}
                isAuthenticated={isAuthenticated}
                onSendText={sendMessage}
                onStartASR={startASR}
                onStopASR={stopASR}
            />
          </div>
        </div>
    </div>
  );
}

export default ChatPage;
