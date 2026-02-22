import type { ChatMessage } from "../store/chatStore";

type ThemeMode = "light" | "dark";

interface MessageBubbleProps {
  message: ChatMessage;
  theme: ThemeMode;
}

export function MessageBubble({ message, theme }: MessageBubbleProps) {
  const baseClassName = "max-w-[90%] px-4 py-3 leading-relaxed md:max-w-[80%] md:px-6 md:py-4";
  const lightUserClassName =
    "bg-[#EDEEFF] text-gray-800 shadow-[3.6px_3.6px_14.4px_rgba(45,43,81,0.03)] backdrop-blur-[5px] rounded-[15px]";
  const lightAssistantClassName =
    "bg-white text-gray-800 drop-shadow-[3.6px_3.6px_14.4px_#E9F1FC] backdrop-blur-[5px] rounded-[15px]";
  const darkUserClassName =
    "bg-[rgba(0,0,0,0.3)] text-white backdrop-blur-[25px] rounded-[30px]";
  const darkAssistantClassName =
    "bg-[rgba(0,0,0,0.3)] text-gray-100 backdrop-blur-[25px] rounded-[30px]";

  const bubbleClassName =
    message.type === "user"
      ? theme === "light"
        ? lightUserClassName
        : darkUserClassName
      : theme === "light"
      ? lightAssistantClassName
      : darkAssistantClassName;

  return (
    <div className={`${baseClassName} ${bubbleClassName}`}>
      <div className="whitespace-pre-wrap text-[12px] md:text-lg">{message.content}</div>
      {message.audioUrl && (
        <div className="mt-3">
          <audio controls src={message.audioUrl} className="w-full h-8" />
        </div>
      )}
    </div>
  );
}
