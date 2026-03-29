import { useCallback, useEffect, useRef } from "react";
import {
  getConversationHistory,
  getConversationList,
} from "../apis/conversation";
import { useConversationStore } from "../store/conversationStore";
import type {
  ConversationListItem,
  ConversationMessageItem,
  PaginationInfo,
} from "../types/conversation";

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGINATION: PaginationInfo = {
  total: 0,
  page: 1,
  limit: DEFAULT_LIMIT,
  hasNext: false,
};

function sortConversationList(list: ConversationListItem[]): ConversationListItem[] {
  return [...list].sort((a, b) => b.updateTime - a.updateTime);
}

function mergeConversationList(
  current: ConversationListItem[],
  incoming: ConversationListItem[]
): ConversationListItem[] {
  const map = new Map<string, ConversationListItem>();
  for (const item of current) {
    map.set(item.conversationId, item);
  }
  for (const item of incoming) {
    map.set(item.conversationId, item);
  }
  return sortConversationList(Array.from(map.values()));
}

function sortMessageList(list: ConversationMessageItem[]): ConversationMessageItem[] {
  return [...list].sort((a, b) => a.index - b.index);
}

function mergeMessageList(
  current: ConversationMessageItem[],
  incoming: ConversationMessageItem[]
): ConversationMessageItem[] {
  const map = new Map<number, ConversationMessageItem>();
  for (const item of current) {
    map.set(item.index, item);
  }
  for (const item of incoming) {
    map.set(item.index, item);
  }
  return sortMessageList(Array.from(map.values()));
}

interface UseConversationRecordsOptions {
  autoSelectFirst?: boolean;
}

export function useConversationRecords(options?: UseConversationRecordsOptions) {
  const { autoSelectFirst = true } = options ?? {};
  const listRequestIdRef = useRef(0);
  const historyRequestIdRef = useRef(0);
  const listLoadingLockRef = useRef(false);
  const historyLoadingLockRef = useRef(false);

  const store = useConversationStore();
  const {
    conversationList,
    selectedConversationId,
    listPagination,
    isListLoading,
    listError,
    listInitialized,
    messageList,
    historyPagination,
    isHistoryLoading,
    historyError,
    historyConversationId,
    setConversationList,
    setSelectedConversationId,
    setListPagination,
    setListLoading,
    setListError,
    setListInitialized,
    setMessageList,
    setHistoryPagination,
    setHistoryLoading,
    setHistoryError,
    setHistoryConversationId,
  } = store;

  const loadConversationHistoryPage = useCallback(
    async (conversationId: string, page: number, append: boolean) => {
      const requestId = historyRequestIdRef.current + 1;
      historyRequestIdRef.current = requestId;
      historyLoadingLockRef.current = true;
      setHistoryLoading(true);
      setHistoryError(null);

      try {
        const response = await getConversationHistory({
          conversationId,
          page,
          limit: historyPagination.limit || DEFAULT_LIMIT,
        });

        if (requestId !== historyRequestIdRef.current) {
          return;
        }

        const activeConversationId = useConversationStore.getState().selectedConversationId;
        if (activeConversationId !== conversationId) {
          return;
        }

        const sortedMessages = sortMessageList(response.messageList || []);
        const mergedList = append
          ? mergeMessageList(useConversationStore.getState().messageList, sortedMessages)
          : sortedMessages;

        setMessageList(mergedList);
        setHistoryPagination(response.pagination || DEFAULT_PAGINATION);
        setHistoryConversationId(conversationId);
      } catch (error) {
        if (requestId === historyRequestIdRef.current) {
          setHistoryError(error instanceof Error ? error.message : "获取对话历史失败");
        }
      } finally {
        if (requestId === historyRequestIdRef.current) {
          setHistoryLoading(false);
          historyLoadingLockRef.current = false;
        }
      }
    },
    [
      historyPagination.limit,
      setHistoryError,
      setHistoryLoading,
      setHistoryPagination,
      setHistoryConversationId,
      setMessageList,
    ]
  );

  const selectConversation = useCallback(
    async (conversationId: string) => {
      setSelectedConversationId(conversationId);
      setHistoryConversationId(conversationId);
      setMessageList([]);
      setHistoryPagination(DEFAULT_PAGINATION);
      historyLoadingLockRef.current = false;
      await loadConversationHistoryPage(conversationId, 1, false);
    },
    [
      loadConversationHistoryPage,
      setHistoryConversationId,
      setHistoryPagination,
      setMessageList,
      setSelectedConversationId,
    ]
  );

  const loadConversationListPage = useCallback(
    async (page: number, append: boolean) => {
      const requestId = listRequestIdRef.current + 1;
      listRequestIdRef.current = requestId;
      listLoadingLockRef.current = true;
      setListLoading(true);
      setListError(null);

      try {
        const response = await getConversationList({
          page,
          limit: listPagination.limit || DEFAULT_LIMIT,
        });

        if (requestId !== listRequestIdRef.current) {
          return;
        }

        const sortedIncoming = sortConversationList(response.conversationList || []);
        const nextList = append
          ? mergeConversationList(useConversationStore.getState().conversationList, sortedIncoming)
          : sortedIncoming;

        setConversationList(nextList);
        setListPagination(response.pagination || DEFAULT_PAGINATION);
        setListInitialized(true);

        const currentSelected = useConversationStore.getState().selectedConversationId;
        if (!currentSelected && nextList.length > 0 && autoSelectFirst) {
          await selectConversation(nextList[0].conversationId);
          return;
        }

        if (
          currentSelected &&
          nextList.some((item) => item.conversationId === currentSelected) &&
          (!historyConversationId || historyConversationId !== currentSelected)
        ) {
          await loadConversationHistoryPage(currentSelected, 1, false);
        }
      } catch (error) {
        if (requestId === listRequestIdRef.current) {
          setListError(error instanceof Error ? error.message : "获取对话列表失败");
        }
      } finally {
        if (requestId === listRequestIdRef.current) {
          setListLoading(false);
          listLoadingLockRef.current = false;
        }
      }
    },
    [
      autoSelectFirst,
      historyConversationId,
      listPagination.limit,
      loadConversationHistoryPage,
      selectConversation,
      setConversationList,
      setListError,
      setListInitialized,
      setListLoading,
      setListPagination,
    ]
  );

  const refreshConversationList = useCallback(async () => {
    listLoadingLockRef.current = false;
    await loadConversationListPage(1, false);
  }, [loadConversationListPage]);

  const loadMoreConversationList = useCallback(async () => {
    if (listLoadingLockRef.current) return;
    const { listPagination: pag } = useConversationStore.getState();
    if (!pag.hasNext) return;
    await loadConversationListPage(pag.page + 1, true);
  }, [loadConversationListPage]);

  const loadMoreHistory = useCallback(async () => {
    if (historyLoadingLockRef.current) return;
    const state = useConversationStore.getState();
    if (!state.selectedConversationId || !state.historyPagination.hasNext) return;
    await loadConversationHistoryPage(
      state.selectedConversationId,
      state.historyPagination.page + 1,
      true
    );
  }, [loadConversationHistoryPage]);

  useEffect(() => {
    if (!listInitialized) {
      void refreshConversationList();
    }
  }, [listInitialized, refreshConversationList]);

  return {
    conversationList,
    selectedConversationId,
    listPagination,
    isListLoading,
    listError,
    messageList,
    historyPagination,
    isHistoryLoading,
    historyError,
    refreshConversationList,
    loadMoreConversationList,
    selectConversation,
    loadMoreHistory,
  };
}
