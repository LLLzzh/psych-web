import type { ChatMessage } from "../store/chatStore";

type ThemeMode = "light" | "dark";

interface MessageBubbleProps {
  message: ChatMessage;
  theme: ThemeMode;
}

export function MessageBubble({ message, theme }: MessageBubbleProps) {
  const baseClassName =
    "max-w-[90%] px-4 py-3 leading-relaxed md:max-w-[80%] md:px-6 md:py-4";
  const lightUserClassName =
    "text-gray-800 [background:linear-gradient(90deg,rgba(150,192,255,0.5)_0%,rgba(130,137,247,0.5)_100%)] shadow-[2.475px_2.475px_9.9px_rgba(45,43,81,0.03)] backdrop-blur-[3.4375px] rounded-[10.3125px] md:[background:#EDEEFF] md:shadow-[3.6px_3.6px_14.4px_rgba(45,43,81,0.03)] md:backdrop-blur-[5px] md:rounded-[15px]";
  const lightAssistantClassName =
    "bg-white text-gray-800 drop-shadow-[3.6px_3.6px_14.4px_#E9F1FC] backdrop-blur-[5px] rounded-[15px]";
  const darkUserClassName =
    "text-white [background:linear-gradient(90deg,rgba(150,192,255,0.5)_0%,rgba(130,137,247,0.5)_100%)] shadow-[2.475px_2.475px_9.9px_rgba(45,43,81,0.03)] backdrop-blur-[3.4375px] rounded-[10.3125px] md:[background:rgba(0,0,0,0.3)] md:shadow-none md:backdrop-blur-[25px] md:rounded-[30px]";
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
      {message.isThinking ? (
        <div className="flex items-center gap-1 text-[12px] md:text-lg" aria-label="老师正在思考">
          <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
          <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
          <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
        </div>
      ) : (
        <div className="whitespace-pre-wrap text-[12px] md:text-lg">{message.content}</div>
      )}
    </div>
  );
}
