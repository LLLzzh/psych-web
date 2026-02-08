import { useChat } from "../hooks/useChat";
import { useSendMessage } from "../hooks/useSendMessage";
import { useChatStore } from "../store/chatStore";
import type { UserInfo } from "../apis/login";
import { Sidebar } from "./Sidebar";
import { ChatArea } from "./ChatArea";
import { InputArea } from "./InputArea";
import { ErrorMessage } from "./ErrorMessage";

interface ChatPageProps {
  url: string;
  userId: string;
  token: string;
  info: UserInfo;
  onLogout: () => void;
}

function ChatPage({ url, userId, token, info, onLogout }: ChatPageProps) {
  const {
    sendText,
    startASR,
    stopASR,
    isConnected,
    isAuthenticated,
  } = useChat(url, userId, token, info);
  const { error, clearMessages, clearError } = useChatStore();

  // 使用消息发送 hook
  const { sendMessage } = useSendMessage({ sendText });

  return (
    <div className="w-screen mx-auto h-full font-sans">
      <div className="flex items-center justify-center w-full h-full">
        {/* 左侧 Sidebar */}
        <Sidebar
          isConnected={isConnected}
          isAuthenticated={isAuthenticated}
          onLogout={onLogout}
          onClearMessages={clearMessages}
        />

        {/* 右侧对话区域 */}
        <div className="flex flex-col flex-1 h-full">
          {/* 错误提示 */}
          {error && (
            <div className="mb-2">
              <ErrorMessage message={error} onClose={clearError} />
            </div>
          )}

          {/* 对话容器 */}
          <div className="flex flex-col flex-1 border border-gray-200 rounded-lg overflow-hidden">
            {/* 对话区域 */}
            <ChatArea />

          {/* 输入区域 */}
          <InputArea
            isConnected={isConnected}
            isAuthenticated={isAuthenticated}
            onSendText={sendMessage}
            onStartASR={startASR}
            onStopASR={stopASR}
            onClearMessages={clearMessages}
          />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
