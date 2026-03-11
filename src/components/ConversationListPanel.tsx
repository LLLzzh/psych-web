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
  onCreateConversation: () => void;
}

function formatTimestamp(timestamp: number): string {
  if (!timestamp) {
    return "--";
  }
  const date = new Date(timestamp * 1000);
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
  onCreateConversation,
}: ConversationListPanelProps) {
  return (
    <section
      className={`h-full rounded-xl border p-3 md:p-4 ${
        theme === "light"
          ? "bg-white border-[#E5EAF4]"
          : "bg-[#151D2A] border-[#2B3342]"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className={`text-sm md:text-base font-semibold ${theme === "light" ? "text-[#1D2233]" : "text-white"}`}>
          对话记录
        </h2>
        <button
          type="button"
          className="px-2.5 py-1 text-xs rounded-md bg-[linear-gradient(303.86deg,#8686FF_6.61%,#96C0FF_93.39%)] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
          onClick={onCreateConversation}
          disabled={isLoading}
        >
          新建
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs md:text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="h-[calc(100%-5.25rem)] overflow-y-auto pr-1 space-y-1.5">
        {conversationList.map((item) => {
          const selected = item.conversationId === selectedConversationId;
          return (
            <button
              key={item.conversationId}
              type="button"
              onClick={() => onSelectConversation(item.conversationId)}
              className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all ${
                selected
                  ? theme === "light"
                    ? "bg-[#EEF3FF] border-[#DCE6FD]"
                    : "bg-[#283449] border-[#3A4B67]"
                  : theme === "light"
                    ? "bg-white border-transparent hover:border-[#E5EAF4] hover:bg-[#FAFCFF]"
                    : "bg-[#1A2332] border-transparent hover:border-[#2B3342]"
              }`}
            >
              <div className={`line-clamp-1 text-sm ${theme === "light" ? "text-[#20263A]" : "text-white"}`}>
                {item.brief || "新对话"}
              </div>
              <div className={`mt-1 text-[11px] ${theme === "light" ? "text-[#6E7488]" : "text-white/60"}`}>
                {formatTimestamp(item.updateTime)}
              </div>
            </button>
          );
        })}

        {!isLoading && conversationList.length === 0 && (
          <div className={`rounded-[14px] p-4 text-center text-sm ${theme === "light" ? "text-[#6E7488] bg-white/70" : "text-white/70 bg-white/5"}`}>
            暂无对话记录
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-center">
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
