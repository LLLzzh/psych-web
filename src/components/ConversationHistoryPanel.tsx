import type { ConversationMessageItem, PaginationInfo } from "../types/conversation";

type ThemeMode = "light" | "dark";

interface ConversationHistoryPanelProps {
  theme: ThemeMode;
  messageList: ConversationMessageItem[];
  pagination: PaginationInfo;
  isLoading: boolean;
  error: string | null;
  onLoadMore: () => void;
}

export function ConversationHistoryPanel({
  theme,
  messageList,
  pagination,
  isLoading,
  error,
  onLoadMore,
}: ConversationHistoryPanelProps) {
  return (
    <section
      className={`h-full rounded-xl border p-3 md:p-4 flex flex-col ${
        theme === "light"
          ? "bg-white border-[#E5EAF4]"
          : "bg-[#151D2A] border-[#2B3342]"
      }`}
    >
      {error && (
        <div className="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs md:text-sm text-red-500">
          {error}
        </div>
      )}

      <div className={`flex-1 overflow-y-auto space-y-3 pr-1 rounded-lg p-2 md:p-3 ${
        theme === "light" ? "bg-[#FAFCFF]" : "bg-[#101826]"
      }`}>
        {messageList.map((item) => {
          const isUser = item.role === "user";
          return (
            <div key={item.index} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[92%] md:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? "text-gray-800 [background:linear-gradient(90deg,rgba(150,192,255,0.52)_0%,rgba(130,137,247,0.52)_100%)]"
                    : theme === "light"
                      ? "bg-white text-[#1D2233] border border-[#EEF2FA]"
                      : "bg-[#1F2A3D] text-white border border-[#2C3951]"
                }`}
              >
                {item.content}
              </div>
            </div>
          );
        })}

        {!isLoading && messageList.length === 0 && (
          <div className={`rounded-[14px] p-5 text-center text-sm ${theme === "light" ? "text-[#6E7488] bg-white/70" : "text-white/70 bg-white/5"}`}>
            暂无历史消息
          </div>
        )}
      </div>

      <div className="mt-2 flex justify-center">
        <button
          type="button"
          onClick={onLoadMore}
          disabled={!pagination.hasNext || isLoading}
          className={`px-3 py-1 rounded-md text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            theme === "light" ? "bg-[#EEF3FF] text-[#3C4A6B] hover:bg-[#E1E9FF]" : "bg-[#2A3342] text-white hover:bg-[#354257]"
          }`}
        >
          {isLoading ? "加载中..." : pagination.hasNext ? "加载更多" : "没有更多了"}
        </button>
      </div>
    </section>
  );
}
