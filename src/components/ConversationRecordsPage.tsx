import { useNavigate } from "react-router-dom";
import { useCallback, useState } from "react";
import { Background } from "./Background";
import { ConversationListPanel } from "./ConversationListPanel";
import { ConversationHistoryPanel } from "./ConversationHistoryPanel";
import { useConversationRecords } from "../hooks/useConversationRecords";
import { useConfigStore } from "../store/configStore";

function ConversationRecordsPage() {
  const navigate = useNavigate();
  const { theme } = useConfigStore();
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  const {
    conversationList,
    selectedConversationId,
    listPagination,
    isListLoading,
    listError,
    messageList,
    historyPagination,
    isHistoryLoading,
    historyError,
    loadMoreConversationList,
    selectConversation,
    loadMoreHistory,
    createNewConversation,
  } = useConversationRecords({ autoSelectFirst: false });

  const selectedBrief = conversationList.find(
    (c) => c.conversationId === selectedConversationId
  )?.brief;

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      void selectConversation(conversationId);
      setMobileView("detail");
    },
    [selectConversation]
  );

  const handleMobileBack = useCallback(() => {
    setMobileView("list");
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans">
      <Background hideDarkOverlay />
      <div className="relative z-10 h-full w-full p-3 md:p-6">
        <div
          className={`mx-auto h-full max-w-[1500px] rounded-2xl border p-3 md:p-4 ${
            theme === "light"
              ? "bg-[rgba(248,250,255,0.9)] border-[#E5EAF4]"
              : "bg-[rgba(12,17,27,0.88)] border-[#2B3342]"
          }`}
        >
          <div className={`mb-3 flex items-center justify-between rounded-xl border px-4 py-3 ${
            theme === "light" ? "border-[#E5EAF4] bg-white" : "border-[#2B3342] bg-[#151D2A]"
          }`}>
            <div className="flex items-center gap-2">
              {mobileView === "detail" && (
                <button
                  type="button"
                  onClick={handleMobileBack}
                  className={`mr-1 flex items-center md:hidden ${theme === "light" ? "text-[#3C4A6B]" : "text-white"}`}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
              <h1 className={`text-lg md:text-xl font-semibold ${theme === "light" ? "text-[#1D2233]" : "text-white"}`}>
                <span className="md:inline hidden">对话记录</span>
                <span className="md:hidden">
                  {mobileView === "list" ? "对话记录" : (selectedBrief || "对话详情")}
                </span>
              </h1>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => navigate("/chat")}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  theme === "light" ? "bg-[#EEF3FF] text-[#3C4A6B] hover:bg-[#E1E9FF]" : "bg-[#2A3342] text-white hover:bg-[#354257]"
                }`}
              >
                返回对话
              </button>
            </div>
          </div>

          <div className="h-[calc(100%-5rem)] grid grid-cols-1 gap-3 md:grid-cols-[300px_minmax(0,1fr)]">
            <div className={`${mobileView === "detail" ? "hidden" : ""} md:block h-full`}>
              <ConversationListPanel
                theme={theme}
                conversationList={conversationList}
                selectedConversationId={selectedConversationId}
                pagination={listPagination}
                isLoading={isListLoading}
                error={listError}
                onSelectConversation={handleSelectConversation}
                onLoadMore={() => {
                  void loadMoreConversationList();
                }}
                onCreateConversation={() => {
                  void createNewConversation();
                }}
              />
            </div>

            <div className={`${mobileView === "list" ? "hidden" : ""} md:block h-full`}>
              <ConversationHistoryPanel
                theme={theme}
                messageList={messageList}
                pagination={historyPagination}
                isLoading={isHistoryLoading}
                error={historyError}
                onLoadMore={() => {
                  void loadMoreHistory();
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConversationRecordsPage;
