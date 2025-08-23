import { useState } from "react";
import { useChat } from "../hooks/useChat";
import { useChatStore } from "../store/chatStore";
import { useConfigStore } from "../store/configStore";
import type { UserInfo } from "../apis/login";

interface ChatPageProps {
  url: string;
  userId: string;
  token: string; 
  info: UserInfo;
  onLogout: () => void;
  onConfigChange: (newUrl: string) => void;
}

function ChatPage({ url, userId, token, info, onLogout, onConfigChange }: ChatPageProps) {
  const [inputText, setInputText] = useState("");

  const { sendText, isConnected, isAuthenticated } = useChat(url, userId, token, info);
  const { messages, error, clearMessages, clearError, addMessage } = useChatStore();
  const { config } = useConfigStore();

  const handleSendText = async () => {
    if (inputText.trim()) {
      await sendText(inputText.trim());
      addMessage({
        id: Date.now().toString(),
        type: "user",
        content: inputText.trim(),
        timestamp: Date.now(),
      });
      setInputText("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>WebSocket Chat Demo</h1>
        <div className="status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '已连接' : '未连接'}
          </span>
          <span className={`status-indicator ${isAuthenticated ? 'authenticated' : 'not-authenticated'}`}>
            {isAuthenticated ? '已认证' : '未认证'}
          </span>
        </div>
        <button 
          onClick={onLogout}
          className="logout-button"
        >
          登出
        </button>
      </header>

      <div className="config-section">
        <h3>连接配置</h3>
        <div className="config-inputs">
          <input
            type="text"
            placeholder="WebSocket URL"
            value={url}
            onChange={(e) => onConfigChange(e.target.value)}
            disabled={isConnected}
          />
          <input
            type="text"
            placeholder="用户ID"
            value={userId}
            disabled={true}
          />
          <input
            type="text"
            placeholder="Token"
            value={token}
            disabled={true}
          />
        </div>
      </div>

      {config && (
        <div className="config-info">
          <h3>配置信息</h3>
          <pre>{JSON.stringify(config, null, 2)}</pre>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={clearError}>关闭</button>
        </div>
      )}

      <div className="chat-container">
        <div className="messages">
          {messages.length === 0 ? (
            <div className="empty-state">
              <p>暂无消息，开始对话吧！</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`message ${message.type}`}>
                <div className="message-content">
                  <div className="message-text text-black">{message.content}</div>
                  {message.audioUrl && (
                    <audio controls src={message.audioUrl} className="message-audio" />
                  )}
                </div>
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="input-section">
          <div className="input-container">
            <textarea
              className="text-black"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息..."
              disabled={!isConnected || !isAuthenticated}
              rows={3}
            />
            <div className="input-actions">
              <button
                onClick={handleSendText}
                disabled={!isConnected || !isAuthenticated || !inputText.trim()}
                className="send-button"
              >
                发送
              </button>
              <button
                onClick={clearMessages}
                className="clear-button"
              >
                清空消息
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
