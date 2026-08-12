import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getConversationHistory,
  getConversationList,
} from "../apis/conversation";
import type {
  ConversationListItem,
  ConversationMessageItem,
  PaginationInfo,
} from "../types/conversation";

const LIST_PAGE_SIZE = 10;
const HISTORY_PAGE_SIZE = 50;

const DEFAULT_PAGINATION: PaginationInfo = {
  total: 0,
  page: 1,
  limit: LIST_PAGE_SIZE,
  hasNext: false,
};

export const CURRENT_CONVERSATION_KEY = "__current_conversation__";

export type ConversationView =
  | { mode: "current" }
  | { mode: "history"; conversationId: string };

interface UseConversationSwitcherOptions {
  enabled: boolean;
  currentConversationId: string | null;
}

function sortConversations(
  conversations: ConversationListItem[]
): ConversationListItem[] {
  return [...conversations].sort((a, b) => {
    const timeDifference = a.createTime - b.createTime;
    return timeDifference !== 0
      ? timeDifference
      : a.conversationId.localeCompare(b.conversationId);
  });
}

function mergeConversations(
  current: ConversationListItem[],
  incoming: ConversationListItem[]
): ConversationListItem[] {
  const conversationsById = new Map<string, ConversationListItem>();
  for (const conversation of current) {
    conversationsById.set(conversation.conversationId, conversation);
  }
  for (const conversation of incoming) {
    conversationsById.set(conversation.conversationId, conversation);
  }
  return sortConversations(Array.from(conversationsById.values()));
}

function mergeMessages(
  current: ConversationMessageItem[],
  incoming: ConversationMessageItem[]
): ConversationMessageItem[] {
  const messagesByIndex = new Map<number, ConversationMessageItem>();
  for (const item of current) {
    messagesByIndex.set(item.index, item);
  }
  for (const item of incoming) {
    messagesByIndex.set(item.index, item);
  }
  return Array.from(messagesByIndex.values()).sort(
    (a, b) => a.index - b.index
  );
}

async function loadCompleteConversation(
  conversationId: string
): Promise<ConversationMessageItem[]> {
  let page = 1;
  let messages: ConversationMessageItem[] = [];

  while (true) {
    const response = await getConversationHistory({
      conversationId,
      page,
      limit: HISTORY_PAGE_SIZE,
    });
    messages = mergeMessages(messages, response.messageList || []);

    if (!response.pagination?.hasNext) {
      return messages;
    }

    const nextPage = (response.pagination.page || page) + 1;
    if (nextPage <= page) {
      return messages;
    }
    page = nextPage;
  }
}

export function useConversationSwitcher({
  enabled,
  currentConversationId,
}: UseConversationSwitcherOptions) {
  const [conversationList, setConversationList] = useState<
    ConversationListItem[]
  >([]);
  const [listPagination, setListPagination] =
    useState<PaginationInfo>(DEFAULT_PAGINATION);
  const [isListLoading, setIsListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [view, setView] = useState<ConversationView>({ mode: "current" });
  const [historyMessages, setHistoryMessages] = useState<
    ConversationMessageItem[]
  >([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [pendingConversationId, setPendingConversationId] = useState<
    string | null
  >(null);

  const listRequestIdRef = useRef(0);
  const historyRequestIdRef = useRef(0);
  const listLoadingLockRef = useRef(false);
  const listInitializedRef = useRef(false);
  const historyCacheRef = useRef(
    new Map<string, ConversationMessageItem[]>()
  );
  const lastFailedConversationIdRef = useRef<string | null>(null);

  const loadConversationListPage = useCallback(
    async (page: number, append: boolean, force = false) => {
      if (!enabled || (listLoadingLockRef.current && !force)) {
        return;
      }

      const requestId = listRequestIdRef.current + 1;
      listRequestIdRef.current = requestId;
      listLoadingLockRef.current = true;
      setIsListLoading(true);
      setListError(null);

      try {
        const response = await getConversationList({
          page,
          limit: LIST_PAGE_SIZE,
        });
        if (requestId !== listRequestIdRef.current) {
          return;
        }

        const incoming = response.conversationList || [];
        setConversationList((current) =>
          mergeConversations(append ? current : [], incoming)
        );
        setListPagination(response.pagination || DEFAULT_PAGINATION);
        listInitializedRef.current = true;
      } catch (error) {
        if (requestId === listRequestIdRef.current) {
          setListError(
            error instanceof Error ? error.message : "获取对话记录失败"
          );
        }
      } finally {
        if (requestId === listRequestIdRef.current) {
          listLoadingLockRef.current = false;
          setIsListLoading(false);
        }
      }
    },
    [enabled]
  );

  const refreshConversationList = useCallback(async () => {
    await loadConversationListPage(1, false, true);
  }, [loadConversationListPage]);

  const loadMoreConversationList = useCallback(async () => {
    if (!listPagination.hasNext) {
      return;
    }
    await loadConversationListPage(listPagination.page + 1, true);
  }, [
    listPagination.hasNext,
    listPagination.page,
    loadConversationListPage,
  ]);

  const selectHistoryConversation = useCallback(
    async (conversationId: string) => {
      if (
        !enabled ||
        (view.mode === "history" &&
          view.conversationId === conversationId &&
          !isHistoryLoading)
      ) {
        return;
      }

      const requestId = historyRequestIdRef.current + 1;
      historyRequestIdRef.current = requestId;
      setPendingConversationId(conversationId);
      setHistoryError(null);
      lastFailedConversationIdRef.current = null;

      const cachedMessages = historyCacheRef.current.get(conversationId);
      if (cachedMessages) {
        setHistoryMessages(cachedMessages);
        setView({ mode: "history", conversationId });
        setPendingConversationId(null);
        setIsHistoryLoading(false);
        return;
      }

      setIsHistoryLoading(true);
      try {
        const messages = await loadCompleteConversation(conversationId);
        if (requestId !== historyRequestIdRef.current) {
          return;
        }

        historyCacheRef.current.set(conversationId, messages);
        setHistoryMessages(messages);
        setView({ mode: "history", conversationId });
      } catch (error) {
        if (requestId === historyRequestIdRef.current) {
          lastFailedConversationIdRef.current = conversationId;
          setHistoryError(
            error instanceof Error ? error.message : "加载对话失败，请重试"
          );
        }
      } finally {
        if (requestId === historyRequestIdRef.current) {
          setPendingConversationId(null);
          setIsHistoryLoading(false);
        }
      }
    },
    [enabled, isHistoryLoading, view]
  );

  const retryHistoryConversation = useCallback(async () => {
    const conversationId = lastFailedConversationIdRef.current;
    if (conversationId) {
      await selectHistoryConversation(conversationId);
    }
  }, [selectHistoryConversation]);

  const selectCurrentConversation = useCallback(() => {
    historyRequestIdRef.current += 1;
    lastFailedConversationIdRef.current = null;
    setPendingConversationId(null);
    setIsHistoryLoading(false);
    setHistoryError(null);
    setView({ mode: "current" });
  }, []);

  useEffect(() => {
    if (!enabled) {
      listRequestIdRef.current += 1;
      listLoadingLockRef.current = false;
      setIsListLoading(false);
      selectCurrentConversation();
      return;
    }

    if (!listInitializedRef.current) {
      void refreshConversationList();
    }
  }, [enabled, refreshConversationList, selectCurrentConversation]);

  const visibleConversationList = useMemo(
    () =>
      conversationList.filter(
        (conversation) =>
          !currentConversationId ||
          conversation.conversationId !== currentConversationId
      ),
    [conversationList, currentConversationId]
  );

  return {
    conversationList: visibleConversationList,
    listPagination,
    isListLoading,
    listError,
    view,
    historyMessages,
    isHistoryLoading,
    historyError,
    pendingConversationId,
    refreshConversationList,
    loadMoreConversationList,
    selectHistoryConversation,
    retryHistoryConversation,
    selectCurrentConversation,
  };
}
