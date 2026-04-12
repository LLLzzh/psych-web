import { useNavigate, useParams } from "react-router-dom";
import { useCallback, useState } from "react";
import { message } from "antd";
import { Background } from "./Background";
import { ConversationListPanel } from "./ConversationListPanel";
import { ConversationHistoryPanel } from "./ConversationHistoryPanel";
import { useConversationRecords } from "../hooks/useConversationRecords";
import { useConfigStore } from "../store/configStore";
import { CONFIG } from "../config";
import { pathChat } from "../paths";

function ConversationRecordsPage() {
  const navigate = useNavigate();
  const { unitUri = CONFIG.DEFAULT_UNIT_URI } = useParams<{ unitUri: string }>();
  const { theme, toggleTheme } = useConfigStore();
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

  const handleToggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    toggleTheme();
    message.success(nextTheme === "light" ? "已切换为浅色模式" : "已切换为深色模式");
  };

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans">
      <Background hideDarkOverlay />
      <div className="relative z-10 flex h-full min-h-0 w-full flex-col p-3 md:p-6">
        <div
          className={`mx-auto flex h-full min-h-0 w-full max-w-[1200px] flex-col rounded-2xl p-4 md:p-5 ${
            theme === "light"
              ? "bg-[rgba(255,255,255,0.35)] shadow-[8px_0px_20px_rgba(233,241,252,0.6)] backdrop-blur-[10px]"
              : "bg-[rgba(0,0,0,0.4)] backdrop-blur-[10px]"
          }`}
        >
          {/* Header */}
          <div className={`mb-4 flex shrink-0 items-center justify-between`}>
            <div className="flex items-center gap-3">
              {mobileView === "detail" && (
                <button
                  type="button"
                  onClick={handleMobileBack}
                  className={`mr-1 flex items-center justify-center w-8 h-8 rounded-lg transition-colors md:hidden ${
                    theme === "light" 
                      ? "text-[#3C4A6B] hover:bg-white/50" 
                      : "text-white hover:bg-white/10"
                  }`}
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
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                type="button"
                onClick={handleToggleTheme}
                className={`hidden md:flex items-center justify-center w-9 h-9 rounded-[10px] transition-all ${
                  theme === "light"
                    ? "bg-white/60 text-[#3C4A6B] hover:bg-white/80"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
                title={theme === "light" ? "切换到深色模式" : "切换到浅色模式"}
              >
                {theme === "light" ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
              {/* Back Button */}
              <button
                type="button"
                onClick={() => navigate(pathChat(unitUri))}
                className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-medium transition-all bg-gradient-to-r from-[#96C0FF] to-[#8686FF] text-white hover:opacity-90"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.5 5L2.5 10L7.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2.5 10H17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="hidden sm:inline">返回对话</span>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
            <div
              className={`min-h-0 h-full ${mobileView === "detail" ? "hidden" : ""} md:block`}
            >
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
              />
            </div>

            <div
              className={`min-h-0 h-full ${mobileView === "list" ? "hidden" : ""} md:block`}
            >
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
