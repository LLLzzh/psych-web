import { useChatStore } from "../store/chatStore";
import { useConfigStore } from "../store/configStore";
import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import teacherAvatar from "../assets/teacher-avatar.png";

export function ChatArea() {
  const { messages } = useChatStore();
  const { theme } = useConfigStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className={`flex-1 overflow-y-auto pt-20 pb-32 px-4 md:pt-25 md:pb-65 md:pr-33 md:pl-25`}>
      {messages.length === 0 ? (
        <div className={`flex flex-col justify-center items-center h-full ${theme === "light" ? "text-gray-400" : "text-gray-500"}`}>
          <div className="text-lg font-medium mb-2">暂无消息</div>
          <p className="text-sm">试着说点什么，比如“我最近有点不开心”</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.type !== "user" && (
                <img
                  src={teacherAvatar}
                  alt="老师头像"
                  className="w-8 h-8 rounded-full object-cover mr-2 mt-1 md:hidden"
                />
              )}
              <MessageBubble message={message} theme={theme} />
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
