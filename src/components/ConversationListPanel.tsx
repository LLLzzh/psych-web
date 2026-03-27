import { useEffect, useRef } from "react";
import { Spin, Empty } from "antd";
import type { ConversationListItem, PaginationInfo } from "../types/conversation";

type ThemeMode = "light" | "dark";

interface ConversationListPanelProps {
  theme: ThemeMode;
  conversationList: ConversationListItem[];
  selectedConversationId: string | null;
  pagination: PaginationInfo;
  isLoading: boolean;
  error: string | null;
  onSelectConversation: (conversationId: string) => void;
  onLoadMore: () => void;
}

function formatTimestamp(timestamp: number): string {
  if (!timestamp) {
    return "--";
  }
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  const date = new Date(timestamp * 1000);
  
  if (diff < 60) {
    return "刚刚";
  } else if (diff < 3600) {
    return `${Math.floor(diff / 60)}分钟前`;
  } else if (diff < 86400) {
    return `${Math.floor(diff / 3600)}小时前`;
  } else if (diff < 86400 * 2) {
    return "昨天 " + date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  } else if (diff < 86400 * 7) {
    return `${Math.floor(diff / 86400)}天前`;
  }
  
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConversationListPanel({
  theme,
  conversationList,
  selectedConversationId,
  pagination,
  isLoading,
  error,
  onSelectConversation,
  onLoadMore,
}: ConversationListPanelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollContainerRef.current;
    if (!sentinel || !root || !pagination.hasNext) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMoreRef.current();
        }
      },
      { root, rootMargin: "0px 0px 100px 0px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [pagination.hasNext, conversationList.length]);

  return (
    <section
      className={`flex h-full min-h-0 flex-col rounded-[10px] overflow-hidden ${
        theme === "light"
          ? "bg-white shadow-sm"
          : "bg-[rgba(0,0,0,0.3)] backdrop-blur-[25px]"
      }`}
    >
      <div className={`px-4 py-3 flex shrink-0 items-center border-b ${
        theme === "light" ? "border-gray-100" : "border-white/10"
      }`}>
        <h2 className={`text-sm font-medium ${theme === "light" ? "text-[#1D2233]" : "text-white"}`}>
          历史对话
        </h2>
      </div>

      {error && (
        <div className="mx-3 mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">
          {error}
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
      >
        {isLoading && conversationList.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <Spin />
          </div>
        ) : conversationList.length === 0 ? (
          <div className="flex items-center justify-center h-full py-8">
            <Empty 
              description={
                <span className={theme === "light" ? "text-gray-400" : "text-white/50"}>
                  暂无对话记录
                </span>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <div className="space-y-1">
            {conversationList.map((item) => {
              const selected = item.conversationId === selectedConversationId;
              return (
                <button
                  key={item.conversationId}
                  type="button"
                  onClick={() => onSelectConversation(item.conversationId)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left transition-all ${
                    selected
                      ? theme === "light"
                        ? "bg-[#EDEEFF]"
                        : "bg-white/15"
                      : theme === "light"
                        ? "hover:bg-gray-50"
                        : "hover:bg-white/5"
                  }`}
                >
                  <div className={`line-clamp-1 text-sm ${
                    theme === "light" ? "text-[#1D2233]" : "text-white"
                  }`}>
                    {item.brief || "新对话"}
                  </div>
                  <div className={`mt-1 text-[11px] ${
                    theme === "light" ? "text-gray-400" : "text-white/45"
                  }`}>
                    {formatTimestamp(item.updateTime)}
                  </div>
                </button>
              );
            })}

            {isLoading && (
              <div className="flex items-center justify-center py-3">
                <Spin size="small" />
              </div>
            )}

            {pagination.hasNext && (
              <div ref={sentinelRef} className="h-1" aria-hidden="true" />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
