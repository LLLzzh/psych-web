import { create } from "zustand";
import type {
  ConversationListItem,
  ConversationMessageItem,
  PaginationInfo,
} from "../types/conversation";

const DEFAULT_PAGINATION: PaginationInfo = {
  total: 0,
  page: 1,
  limit: 10,
  hasNext: false,
};

interface ConversationStoreState {
  conversationList: ConversationListItem[];
  selectedConversationId: string | null;
  listPagination: PaginationInfo;
  isListLoading: boolean;
  listError: string | null;
  listInitialized: boolean;

  messageList: ConversationMessageItem[];
  historyPagination: PaginationInfo;
  isHistoryLoading: boolean;
  historyError: string | null;
  historyConversationId: string | null;

  setConversationList: (list: ConversationListItem[]) => void;
  appendConversationList: (list: ConversationListItem[]) => void;
  setSelectedConversationId: (conversationId: string | null) => void;
  setListPagination: (pagination: PaginationInfo) => void;
  setListLoading: (loading: boolean) => void;
  setListError: (error: string | null) => void;
  setListInitialized: (initialized: boolean) => void;

  setMessageList: (list: ConversationMessageItem[]) => void;
  appendMessageList: (list: ConversationMessageItem[]) => void;
  setHistoryPagination: (pagination: PaginationInfo) => void;
  setHistoryLoading: (loading: boolean) => void;
  setHistoryError: (error: string | null) => void;
  setHistoryConversationId: (conversationId: string | null) => void;

  reset: () => void;
}

export const useConversationStore = create<ConversationStoreState>((set) => ({
  conversationList: [],
  selectedConversationId: null,
  listPagination: DEFAULT_PAGINATION,
  isListLoading: false,
  listError: null,
  listInitialized: false,

  messageList: [],
  historyPagination: DEFAULT_PAGINATION,
  isHistoryLoading: false,
  historyError: null,
  historyConversationId: null,

  setConversationList: (list) => set({ conversationList: list }),
  appendConversationList: (list) =>
    set((state) => ({
      conversationList: [...state.conversationList, ...list],
    })),
  setSelectedConversationId: (conversationId) =>
    set({ selectedConversationId: conversationId }),
  setListPagination: (pagination) => set({ listPagination: pagination }),
  setListLoading: (loading) => set({ isListLoading: loading }),
  setListError: (error) => set({ listError: error }),
  setListInitialized: (initialized) => set({ listInitialized: initialized }),

  setMessageList: (list) => set({ messageList: list }),
  appendMessageList: (list) =>
    set((state) => ({ messageList: [...state.messageList, ...list] })),
  setHistoryPagination: (pagination) => set({ historyPagination: pagination }),
  setHistoryLoading: (loading) => set({ isHistoryLoading: loading }),
  setHistoryError: (error) => set({ historyError: error }),
  setHistoryConversationId: (conversationId) =>
    set({ historyConversationId: conversationId }),

  reset: () =>
    set({
      conversationList: [],
      selectedConversationId: null,
      listPagination: DEFAULT_PAGINATION,
      isListLoading: false,
      listError: null,
      listInitialized: false,
      messageList: [],
      historyPagination: DEFAULT_PAGINATION,
      isHistoryLoading: false,
      historyError: null,
      historyConversationId: null,
    }),
}));
