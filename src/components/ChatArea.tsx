import { useChatStore } from "../store/chatStore";

export function ChatArea() {
  const { messages } = useChatStore();

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
      {messages.length === 0 ? (
        <div className="flex justify-center items-center h-full text-gray-500 italic">
          <p>暂无消息，开始对话吧！</p>
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 flex flex-col ${
              message.type === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[70%] px-4 py-3 rounded-2xl break-words ${
                message.type === "user"
                  ? "bg-[#EDEEFF] shadow-md"
                  : "bg-white border border-gray-200"
              }`}
            >
              <div className="mb-2 text-[#3b3b53] leading-relaxed">
                {message.content}
              </div>
              {message.audioUrl && (
                <audio controls src={message.audioUrl} className="w-full h-10" />
              )}
            </div>
            <div
              className={`text-xs text-gray-500 mt-1 ${
                message.type === "user" ? "text-right" : ""
              }`}
            >
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
