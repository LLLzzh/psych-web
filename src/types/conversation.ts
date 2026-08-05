export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  /** 部分接口使用游标分页时返回 */
  nextToken?: string;
}

export interface ConversationListItem {
  conversationId: string;
  brief: string;
  createTime: number;
  updateTime: number;
  characterId?: string;
  characterName?: string;
  characterImage?: string;
}

export const MESSAGE_ROLE = {
  TEACHER: 2,
  STUDENT: 3,
} as const;

export type MessageRole = (typeof MESSAGE_ROLE)[keyof typeof MESSAGE_ROLE];

export interface ConversationMessageItem {
  content: string;
  role: MessageRole;
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
