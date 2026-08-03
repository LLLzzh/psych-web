import { useChatStore, type ChatMessage } from "../store/chatStore";
import { useConfigStore } from "../store/configStore";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import teacherAvatar from "../assets/teacher-avatar.png";

const DEFAULT_BOTTOM_INSET = 128;
const BOTTOM_GAP = 16;
const EXIT_TRANSITION_MS = 220;
const ENTER_TRANSITION_MS = 260;

interface ChatAreaProps {
  isDesktopLayout: boolean;
  messages?: ChatMessage[];
  viewKey?: string;
  isHistoryMode?: boolean;
  isLoading?: boolean;
}

export function ChatArea({
  isDesktopLayout,
  messages,
  viewKey = "current",
  isHistoryMode = false,
  isLoading = false,
}: ChatAreaProps) {
  const liveMessages = useChatStore((state) => state.messages);
  const { theme } = useConfigStore();
  const displayedMessages = messages ?? liveMessages;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const renderedViewKeyRef = useRef(viewKey);
  const transitionTimersRef = useRef<number[]>([]);
  const [bottomInset, setBottomInset] = useState(DEFAULT_BOTTOM_INSET);
  const [renderedMessages, setRenderedMessages] =
    useState<ChatMessage[]>(displayedMessages);
  const [renderedIsHistoryMode, setRenderedIsHistoryMode] =
    useState(isHistoryMode);
  const [transitionStage, setTransitionStage] = useState<
    "idle" | "exit" | "enter"
  >("idle");

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

  const scrollToTop = useCallback((behavior: ScrollBehavior = "auto") => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior });
  }, []);

  const clearTransitionTimers = useCallback(() => {
    for (const timer of transitionTimersRef.current) {
      window.clearTimeout(timer);
    }
    transitionTimersRef.current = [];
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
    if (!renderedIsHistoryMode) {
      window.requestAnimationFrame(() => scrollToBottom());
    }
  }, [
    recalculateBottomInset,
    renderedIsHistoryMode,
    renderedMessages,
    scrollToBottom,
  ]);

  useEffect(() => {
    if (renderedViewKeyRef.current === viewKey) {
      setRenderedMessages(displayedMessages);
      setRenderedIsHistoryMode(isHistoryMode);
      return;
    }

    clearTransitionTimers();
    renderedViewKeyRef.current = viewKey;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) {
      setRenderedMessages(displayedMessages);
      setRenderedIsHistoryMode(isHistoryMode);
      setTransitionStage("idle");
      window.requestAnimationFrame(() => {
        if (isHistoryMode) {
          scrollToTop();
        } else {
          scrollToBottom("auto");
        }
      });
      return;
    }

    setTransitionStage("exit");
    const exitTimer = window.setTimeout(() => {
      setRenderedMessages(displayedMessages);
      setRenderedIsHistoryMode(isHistoryMode);
      setTransitionStage("enter");
      window.requestAnimationFrame(() => {
        if (isHistoryMode) {
          scrollToTop();
        } else {
          scrollToBottom("auto");
        }
      });

      const enterTimer = window.setTimeout(() => {
        setTransitionStage("idle");
      }, ENTER_TRANSITION_MS);
      transitionTimersRef.current.push(enterTimer);
    }, EXIT_TRANSITION_MS);
    transitionTimersRef.current.push(exitTimer);

    return clearTransitionTimers;
  }, [
    clearTransitionTimers,
    displayedMessages,
    isHistoryMode,
    scrollToBottom,
    scrollToTop,
    viewKey,
  ]);

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
    if (!renderedIsHistoryMode) {
      scrollToBottom("auto");
    }
  }, [bottomInset, renderedIsHistoryMode, scrollToBottom]);

  useEffect(() => clearTransitionTimers, [clearTransitionTimers]);

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden">
      <div
        ref={scrollContainerRef}
        className={`h-full overflow-y-auto ${
          isDesktopLayout ? "pt-25 pr-33 pl-25" : "pt-20 px-4"
        }`}
        style={{
          paddingBottom: `${bottomInset}px`,
          scrollPaddingBottom: `${bottomInset}px`,
        }}
      >
        {renderedIsHistoryMode && (
          <div
            className={`pointer-events-none sticky top-3 z-10 mb-4 flex justify-center text-xs ${
              theme === "light" ? "text-[#A1A1A1]" : "text-white/45"
            }`}
          >
            <span
              className={`rounded-full px-3 py-1.5 ${
                theme === "light"
                  ? "bg-white/80 shadow-[0_5px_18px_rgba(156,178,218,0.1)]"
                  : "bg-black/30 backdrop-blur-xl"
              }`}
            >
              历史记录 · 只读
            </span>
          </div>
        )}

        <div
          className="conversation-view-transition min-h-full"
          data-transition-stage={transitionStage}
        >
          {renderedMessages.length === 0 ? (
            <div
              className={`flex h-full min-h-[240px] flex-col items-center justify-center ${
                theme === "light" ? "text-gray-400" : "text-gray-500"
              }`}
            >
              <div className="mb-2 text-lg font-medium">暂无消息</div>
              {!renderedIsHistoryMode && (
                <p className="text-sm">
                  试着说点什么，比如“我最近有点不开心”
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="flex flex-col gap-6">
                {renderedMessages.map((message) => (
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
                        className={`mr-2 mt-1 h-8 w-8 rounded-full object-cover ${
                          isDesktopLayout ? "hidden" : ""
                        }`}
                      />
                    )}
                    <MessageBubble
                      message={message}
                      theme={theme}
                      isDesktopLayout={isDesktopLayout}
                    />
                  </div>
                ))}
              </div>
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div
          className={`absolute inset-0 z-20 flex items-center justify-center ${
            theme === "light"
              ? "bg-white/28"
              : "bg-black/18"
          } backdrop-blur-[2px]`}
          role="status"
          aria-live="polite"
        >
          <span
            className={`rounded-full px-4 py-2 text-sm shadow-sm ${
              theme === "light"
                ? "bg-white/90 text-[#AAAAAA]"
                : "bg-black/55 text-white/65"
            }`}
          >
            正在加载对话…
          </span>
        </div>
      )}
    </div>
  );
}
