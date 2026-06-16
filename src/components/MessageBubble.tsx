import type { ChatMessage } from "../store/chatStore";

type ThemeMode = "light" | "dark";

interface MessageBubbleProps {
  message: ChatMessage;
  theme: ThemeMode;
  isDesktopLayout: boolean;
}

export function MessageBubble({ message, theme, isDesktopLayout }: MessageBubbleProps) {
  const baseClassName = isDesktopLayout
    ? "max-w-[80%] px-6 py-4 leading-relaxed"
    : "max-w-[90%] px-4 py-3 leading-relaxed";
  const lightUserClassName = isDesktopLayout
    ? "text-gray-800 [background:#EDEEFF] shadow-[3.6px_3.6px_14.4px_rgba(45,43,81,0.03)] backdrop-blur-[5px] rounded-[15px]"
    : "text-gray-800 [background:linear-gradient(90deg,rgba(150,192,255,0.5)_0%,rgba(130,137,247,0.5)_100%)] shadow-[2.475px_2.475px_9.9px_rgba(45,43,81,0.03)] backdrop-blur-[3.4375px] rounded-[10.3125px]";
  const lightAssistantClassName =
    "bg-white text-gray-800 drop-shadow-[3.6px_3.6px_14.4px_#E9F1FC] backdrop-blur-[5px] rounded-[15px]";
  const darkUserClassName = isDesktopLayout
    ? "text-white [background:rgba(0,0,0,0.3)] shadow-none backdrop-blur-[25px] rounded-[30px]"
    : "text-white [background:linear-gradient(90deg,rgba(150,192,255,0.5)_0%,rgba(130,137,247,0.5)_100%)] shadow-[2.475px_2.475px_9.9px_rgba(45,43,81,0.03)] backdrop-blur-[3.4375px] rounded-[10.3125px]";
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
        <div className={`flex items-center gap-1 ${isDesktopLayout ? "text-lg" : "text-[12px]"}`} aria-label="老师正在思考">
          <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
          <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
          <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
        </div>
      ) : (
        <div className={`whitespace-pre-wrap ${isDesktopLayout ? "text-lg" : "text-[12px]"}`}>{message.content}</div>
      )}
    </div>
  );
}
