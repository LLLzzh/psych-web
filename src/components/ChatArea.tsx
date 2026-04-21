import { useChatStore } from "../store/chatStore";
import { useConfigStore } from "../store/configStore";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import teacherAvatar from "../assets/teacher-avatar.png";

const MOBILE_DEFAULT_BOTTOM_PADDING = 128;
const MOBILE_BOTTOM_GAP = 16;

export function ChatArea() {
  const { messages } = useChatStore();
  const { theme } = useConfigStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mobileBottomPadding, setMobileBottomPadding] = useState(
    MOBILE_DEFAULT_BOTTOM_PADDING
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const recalculateMobileBottomPadding = useCallback(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) {
      if (mobileBottomPadding !== MOBILE_DEFAULT_BOTTOM_PADDING) {
        setMobileBottomPadding(MOBILE_DEFAULT_BOTTOM_PADDING);
      }
      return;
    }
    const inputContainer = document.getElementById("chat-input-container");
    if (!inputContainer) {
      if (mobileBottomPadding !== MOBILE_DEFAULT_BOTTOM_PADDING) {
        setMobileBottomPadding(MOBILE_DEFAULT_BOTTOM_PADDING);
      }
      return;
    }
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const inputTop = inputContainer.getBoundingClientRect().top;
    const occupiedHeight = Math.max(0, viewportHeight - inputTop);
    const nextPadding = Math.max(
      MOBILE_DEFAULT_BOTTOM_PADDING,
      Math.ceil(occupiedHeight + MOBILE_BOTTOM_GAP)
    );
    if (Math.abs(nextPadding - mobileBottomPadding) > 1) {
      setMobileBottomPadding(nextPadding);
    }
  }, [mobileBottomPadding]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    recalculateMobileBottomPadding();
    const onLayoutChange = () => {
      recalculateMobileBottomPadding();
      window.requestAnimationFrame(() => scrollToBottom("auto"));
    };

    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("focusin", onLayoutChange);

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", onLayoutChange);
    viewport?.addEventListener("scroll", onLayoutChange);

    return () => {
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("focusin", onLayoutChange);
      viewport?.removeEventListener("resize", onLayoutChange);
      viewport?.removeEventListener("scroll", onLayoutChange);
    };
  }, [recalculateMobileBottomPadding, scrollToBottom]);

  useEffect(() => {
    scrollToBottom("auto");
  }, [mobileBottomPadding, scrollToBottom]);

  return (
    <div
      className="flex-1 overflow-y-auto pt-20 px-4 md:pt-25 md:pb-65 md:pr-33 md:pl-25"
      style={{ paddingBottom: `${mobileBottomPadding}px` }}
    >
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
