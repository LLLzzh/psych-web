export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

export interface ConversationListItem {
  conversationId: string;
  brief: string;
  createTime: number;
  updateTime: number;
}

export interface ConversationMessageItem {
  content: string;
  role: "user" | "assistant";
  index: number;
}

export interface CreateConversationRequest {
  [key: string]: never;
}

export interface CreateConversationResponse {
  conversationId: string;
  code: number;
  msg: string;
}

export interface GetConversationListRequest {
  page?: number;
  limit?: number;
}

export interface GetConversationListResponse {
  conversationList: ConversationListItem[];
  pagination: PaginationInfo;
  code: number;
  msg: string;
}

export interface GetConversationHistoryRequest {
  conversationId: string;
  page?: number;
  limit?: number;
}

export interface GetConversationHistoryResponse {
  messageList: ConversationMessageItem[];
  pagination: PaginationInfo;
  code: number;
  msg: string;
}
