import { Spin, Empty } from "antd";
import { useRef, useEffect } from "react";
import { MESSAGE_ROLE, type ConversationMessageItem, type PaginationInfo } from "../types/conversation";
import teacherAvatar from "../assets/teacher-avatar.png";

type ThemeMode = "light" | "dark";

interface ConversationHistoryPanelProps {
  theme: ThemeMode;
  messageList: ConversationMessageItem[];
  pagination: PaginationInfo;
  isLoading: boolean;
  error: string | null;
  onLoadMore: () => void;
  characterName?: string;
  characterImage?: string;
}

export function ConversationHistoryPanel({
  theme,
  messageList,
  pagination,
  isLoading,
  error,
  onLoadMore,
  characterName,
  characterImage,
}: ConversationHistoryPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root || !pagination.hasNext) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMoreRef.current();
        }
      },
      { root, rootMargin: "100px 0px 0px 0px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [pagination.hasNext, messageList.length]);

  return (
    <section
      aria-label={`${characterName || "心理老师"}的对话详情`}
      className={`flex h-full min-h-0 flex-col rounded-[10px] overflow-hidden ${
        theme === "light"
          ? "bg-white shadow-sm"
          : "bg-[rgba(0,0,0,0.3)] backdrop-blur-[25px]"
      }`}
    >
      <div className={`px-4 py-3 flex shrink-0 items-center justify-between border-b ${
        theme === "light" ? "border-gray-100" : "border-white/10"
      }`}>
        <h2 className={`text-sm font-medium ${theme === "light" ? "text-[#1D2233]" : "text-white"}`}>
          对话详情
        </h2>
      </div>

      {error && (
        <div className="mx-3 mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">
          {error}
        </div>
      )}

      <div 
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
      >
        {isLoading && messageList.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Spin />
          </div>
        ) : messageList.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Empty 
              description={
                <span className={theme === "light" ? "text-gray-400" : "text-white/50"}>
                  选择对话查看详情
                </span>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {pagination.hasNext && (
              <div ref={sentinelRef} className="h-1" aria-hidden="true" />
            )}

            {isLoading && (
              <div className="flex items-center justify-center py-2">
                <Spin size="small" />
              </div>
            )}
            
            {messageList.map((item) => {
              const isStudent = item.role === MESSAGE_ROLE.STUDENT;
              
              return (
                <div 
                  key={item.index} 
                  className={`flex ${isStudent ? "justify-end" : "justify-start"}`}
                >
                  {!isStudent && (
                    <img
                      src={characterImage || teacherAvatar}
                      alt="老师头像"
                      className="w-8 h-8 rounded-full object-cover mr-2 shrink-0"
                    />
                  )}
                  
                  <div
                    className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      isStudent
                        ? theme === "light"
                          ? "text-gray-800 [background:#EDEEFF] shadow-[3.6px_3.6px_14.4px_rgba(45,43,81,0.03)] backdrop-blur-[5px] rounded-[15px]"
                          : "text-white [background:rgba(0,0,0,0.3)] backdrop-blur-[25px] rounded-[30px]"
                        : theme === "light"
                          ? "bg-white text-gray-800 drop-shadow-[3.6px_3.6px_14.4px_#E9F1FC] backdrop-blur-[5px] rounded-[15px]"
                          : "bg-[rgba(0,0,0,0.3)] text-gray-100 backdrop-blur-[25px] rounded-[30px]"
                    }`}
                  >
                    {item.content}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
