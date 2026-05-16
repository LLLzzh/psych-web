import { useChatStore } from "../store/chatStore";
import { useConfigStore } from "../store/configStore";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import teacherAvatar from "../assets/teacher-avatar.png";

const DEFAULT_BOTTOM_INSET = 128;
const BOTTOM_GAP = 16;

export function ChatArea() {
  const { messages } = useChatStore();
  const { theme } = useConfigStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [bottomInset, setBottomInset] = useState(DEFAULT_BOTTOM_INSET);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
      return;
    }
    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior,
    });
  }, []);

  const recalculateBottomInset = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const inputContainer = document.getElementById("chat-input-container");
    if (!inputContainer) {
      setBottomInset(DEFAULT_BOTTOM_INSET);
      return;
    }
    const viewportBottom = window.visualViewport
      ? window.visualViewport.offsetTop + window.visualViewport.height
      : window.innerHeight;
    const rects = [inputContainer.getBoundingClientRect()];
    const inputPanel = inputContainer.firstElementChild;
    if (inputPanel instanceof HTMLElement) {
      rects.push(inputPanel.getBoundingClientRect());
    }
    const visibleTops = rects
      .filter((rect) => rect.height > 0)
      .map((rect) => rect.top);
    const inputTop =
      visibleTops.length > 0 ? Math.min(...visibleTops) : viewportBottom;
    const occupiedHeight = Math.max(0, viewportBottom - inputTop);
    const nextHeight = Math.max(
      DEFAULT_BOTTOM_INSET,
      Math.ceil(occupiedHeight + BOTTOM_GAP)
    );
    setBottomInset((currentHeight) =>
      Math.abs(nextHeight - currentHeight) > 1 ? nextHeight : currentHeight
    );
  }, []);

  useEffect(() => {
    recalculateBottomInset();
    window.requestAnimationFrame(() => scrollToBottom());
  }, [messages, recalculateBottomInset, scrollToBottom]);

  useEffect(() => {
    recalculateBottomInset();
    const onLayoutChange = () => {
      recalculateBottomInset();
      window.requestAnimationFrame(() => scrollToBottom("auto"));
    };

    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("focusin", onLayoutChange);

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", onLayoutChange);
    viewport?.addEventListener("scroll", onLayoutChange);
    const inputContainer = document.getElementById("chat-input-container");
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(onLayoutChange)
        : null;
    if (inputContainer && resizeObserver) {
      resizeObserver.observe(inputContainer);
      Array.from(inputContainer.children).forEach((child) => {
        if (child instanceof HTMLElement) {
          resizeObserver.observe(child);
        }
      });
    }

    return () => {
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("focusin", onLayoutChange);
      viewport?.removeEventListener("resize", onLayoutChange);
      viewport?.removeEventListener("scroll", onLayoutChange);
      resizeObserver?.disconnect();
    };
  }, [recalculateBottomInset, scrollToBottom]);

  useEffect(() => {
    scrollToBottom("auto");
  }, [bottomInset, scrollToBottom]);

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto pt-20 px-4 md:pt-25 md:pr-33 md:pl-25"
      style={{
        paddingBottom: `${bottomInset}px`,
        scrollPaddingBottom: `${bottomInset}px`,
      }}
    >
      {messages.length === 0 ? (
        <div className={`flex flex-col justify-center items-center h-full ${theme === "light" ? "text-gray-400" : "text-gray-500"}`}>
          <div className="text-lg font-medium mb-2">暂无消息</div>
          <p className="text-sm">试着说点什么，比如“我最近有点不开心”</p>
        </div>
      ) : (
        <div className="flex flex-col">
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
          </div>
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
