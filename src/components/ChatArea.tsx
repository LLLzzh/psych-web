import { useChatStore } from "../store/chatStore";
import { useEffect, useRef } from "react";

export function ChatArea() {
  const { messages } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
      {messages.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full text-gray-400">
          <div className="text-lg font-medium mb-2">暂无消息</div>
          <p className="text-sm">试着说点什么，比如“我最近有点不开心”</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col ${
                message.type === "user" ? "items-end" : "items-start"
              }`}
            >
              {/* 消息气泡 */}
              <div
                className={`max-w-[80%] px-6 py-4 text-[15px] leading-relaxed shadow-sm ${
                  message.type === "user"
                    ? "bg-[#D6E4FF] text-gray-800 rounded-[20px] rounded-tr-none"
                    : "bg-white text-gray-800 rounded-[20px] rounded-tl-none border border-gray-100"
                }`}
              >
                <div className="whitespace-pre-wrap">
                  {message.content}
                </div>
                {message.audioUrl && (
                  <div className="mt-3">
                    <audio controls src={message.audioUrl} className="w-full h-8" />
                  </div>
                )}
              </div>
              
              {/* 时间戳 */}
              <span className="text-xs text-gray-300 mt-2 px-1">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
