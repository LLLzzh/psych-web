import { useState } from "react";
import { useChat } from "../hooks/useChat";
import { useChatStore } from "../store/chatStore";
import { useConfigStore } from "../store/configStore";
import type { UserInfo } from "../apis/login";
import logo from "../assets/logo.png";

interface ChatPageProps {
  url: string;
  userId: string;
  token: string; 
  info: UserInfo;
  onLogout: () => void;
}

function ChatPage({ url, userId, token, info, onLogout }: ChatPageProps) {
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const { 
    sendText, 
    startASR, 
    stopASR, 
    isConnected, 
    isAuthenticated 
  } = useChat(url, userId, token, info);
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

  const handleVoiceButton = async () => {
    if (isRecording) {
      await stopASR();
      setIsRecording(false);
    } else {
      const success = await startASR();
      if (success) {
        setIsRecording(true);
      }
    }
  };

  return (
    <div className="w-screen mx-auto h-full font-sans">


      {/* <div className="mb-5 p-4 bg-gray-50 rounded-lg">
        <h3 className="m-0 mb-2.5 text-base text-gray-800">连接配置</h3>
        <div className="flex gap-2.5 flex-wrap">
          <input
            type="text"
            placeholder="WebSocket URL"
            value={url}
            onChange={(e) => onConfigChange(e.target.value)}
            disabled={isConnected}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded text-sm disabled:bg-gray-100 disabled:text-gray-500"
          />
          <input
            type="text"
            placeholder="用户ID"
            value={userId}
            disabled={true}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded text-sm disabled:bg-gray-100 disabled:text-gray-500"
          />
          <input
            type="text"
            placeholder="Token"
            value={token}
            disabled={true}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded text-sm disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>
      </div> */}

      <div className ="flex items-center justify-center w-full h-full">
        
      {config && (
        
        <div className="w-90 p-4 h-full bg-white/35 shadow-[8px_0px_20px_rgba(233,241,252,0.6)] backdrop-blur-sm rounded-r-[20px]">
        <header className="flex justify-between items-center mb-5 pb-5 border-b border-gray-200">
         <img src={logo} alt="花狮心理logo" className="w-10 h-10 object-contain" />
        <h1 className="m-0 text-gray-800 text-2xl font-semibold">花狮心理</h1>
        <div className="flex gap-2.5">
          <span className={`px-3 py-1 rounded-2xl text-xs font-medium ${
            isConnected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {isConnected ? '已连接' : '未连接'}
          </span>
          <span className={`px-3 py-1 rounded-2xl text-xs font-medium ${
            isAuthenticated 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {isAuthenticated ? '已认证' : '未认证'}
          </span>
        </div>
        <button 
          onClick={() => {
            clearMessages();
            onLogout();
          }}
          className="px-4 py-2 bg-red-600 text-white border-none rounded text-sm cursor-pointer transition-colors duration-200 hover:bg-red-700"
        >
          登出
        </button>
      </header>
          <h3 className="m-0 mb-2.5 text-base text-gray-800">配置信息</h3>
          <pre className="m-0 text-xs text-gray-600 whitespace-pre-wrap break-all">{
          JSON.stringify(config, null, 2)
          }</pre>
        </div>
      )}

      {error && (
        <div className="flex justify-between items-center mb-5 px-4 py-3 bg-red-100 text-red-800 border border-red-300 rounded">
          <span>{error}</span>
          <button 
            onClick={clearError}
            className="bg-transparent border-none text-red-800 cursor-pointer text-base p-0 ml-2.5"
          >
            关闭
          </button>
        </div>
      )}

      <div className="flex flex-col flex-1 h-full border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
          {messages.length === 0 ? (
            <div className="flex justify-center items-center h-full text-gray-500 italic">
              <p>暂无消息，开始对话吧！</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`mb-4 flex flex-col ${
                message.type === 'user' ? 'items-end' : 'items-start'
              }`}>
                <div className={`max-w-[70%] px-4 py-3 rounded-2xl break-words ${
                  message.type === 'user' 
                    ? 'bg-[#EDEEFF]  shadow-md' 
                    : 'bg-white  border border-gray-200'
                }`}>
                  <div className="mb-2 text-[#3b3b53] leading-relaxed">{message.content}</div>
                  {message.audioUrl && (
                    <audio controls src={message.audioUrl} className="w-full h-10" />
                  )}
                </div>
                <div className={`text-xs text-gray-500 mt-1 ${
                  message.type === 'user' ? 'text-right' : ''
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-5 bg-white border-t border-gray-200">
          <div className="flex flex-col gap-2.5">
            <div className="flex gap-2.5">
              <textarea
                className="flex-1 px-3 py-3 border border-gray-300 rounded text-sm font-inherit resize-y min-h-[60px] disabled:bg-gray-100 disabled:text-gray-500"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入消息..."
                disabled={!isConnected || !isAuthenticated}
                rows={3}
              />
              <button
                onClick={handleVoiceButton}
                disabled={!isConnected || !isAuthenticated}
                className={`px-4 py-2 rounded text-sm cursor-pointer transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed ${
                  isRecording 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                title={isRecording ? "停止录音" : "开始录音"}
              >
                {isRecording ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={handleSendText}
                disabled={!isConnected || !isAuthenticated || !inputText.trim()}
                className="px-4 py-2 bg-blue-600 text-white border-none rounded text-sm cursor-pointer transition-colors duration-200 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                发送
              </button>
              <button
                onClick={clearMessages}
                className="px-4 py-2 bg-gray-600 text-white border-none rounded text-sm cursor-pointer transition-colors duration-200 hover:bg-gray-700"
              >
                清空消息
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

     
    </div>
  );
}

export default ChatPage;
