import request from "../utils/request";
import { CONFIG } from "../config";
import type {
  ConversationListItem,
  ConversationMessageItem,
  CreateConversationRequest,
  CreateConversationResponse,
  GetConversationHistoryRequest,
  GetConversationHistoryResponse,
  GetConversationListRequest,
  GetConversationListResponse,
} from "../types/conversation";

const CONVERSATION_API = {
  create: "/conversation/create",
  list: "/conversation/list",
  history: "/conversation/get",
} as const;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const USE_CONVERSATION_MOCK = CONFIG.USE_CONVERSATION_MOCK;
const CONVERSATION_REQUEST_CONFIG = { baseURL: "" } as const;

const nowSec = Math.floor(Date.now() / 1000);

let mockConversations: ConversationListItem[] = [
  {
    conversationId: "mock-conv-001",
    brief: "关于学习压力的讨论",
    createTime: nowSec - 86400 * 5,
    updateTime: nowSec - 86400 * 2,
  },
  {
    conversationId: "mock-conv-002",
    brief: "如何改善睡眠质量",
    createTime: nowSec - 86400 * 3,
    updateTime: nowSec - 86400,
  },
  {
    conversationId: "mock-conv-003",
    brief: "面对考试焦虑的应对方式",
    createTime: nowSec - 86400,
    updateTime: nowSec - 3600 * 10,
  },
  {
    conversationId: "mock-conv-004",
    brief: "亲子沟通中的冲突处理",
    createTime: nowSec - 3600 * 36,
    updateTime: nowSec - 3600 * 6,
  },
  {
    conversationId: "mock-conv-005",
    brief: "情绪低落时如何自我调节",
    createTime: nowSec - 3600 * 30,
    updateTime: nowSec - 3600 * 2,
  },
];

let mockMessagesByConversation: Record<string, ConversationMessageItem[]> = {
  "mock-conv-001": [
    { role: "user", content: "最近作业和考试都很多，压力很大。", index: 1 },
    { role: "assistant", content: "先别急，我们可以先把任务拆成几块，逐步完成。", index: 2 },
    { role: "user", content: "我总觉得时间不够用。", index: 3 },
    { role: "assistant", content: "建议你用番茄钟法，每次专注25分钟，再休息5分钟。", index: 4 },
  ],
  "mock-conv-002": [
    { role: "user", content: "我晚上总是很晚才睡着。", index: 1 },
    { role: "assistant", content: "睡前1小时尽量减少手机使用，同时固定入睡时间。", index: 2 },
    { role: "user", content: "白天会犯困。", index: 3 },
    { role: "assistant", content: "可以先从规律起床时间开始，白天适度运动也有帮助。", index: 4 },
  ],
  "mock-conv-003": [
    { role: "user", content: "一到考试我就心慌。", index: 1 },
    { role: "assistant", content: "考试前可以做4-7-8呼吸法，先把生理紧张降下来。", index: 2 },
    { role: "user", content: "我担心自己会发挥失常。", index: 3 },
    { role: "assistant", content: "把注意力放回“下一道题”，避免反复评估自己状态。", index: 4 },
  ],
  "mock-conv-004": [
    { role: "user", content: "孩子总是顶嘴，沟通很难。", index: 1 },
    { role: "assistant", content: "先共情再表达规则，冲突通常会缓和不少。", index: 2 },
  ],
  "mock-conv-005": [
    { role: "user", content: "最近做什么都提不起劲。", index: 1 },
    { role: "assistant", content: "先从最小可执行目标开始，比如每天散步10分钟。", index: 2 },
    { role: "user", content: "我怕坚持不下来。", index: 3 },
    { role: "assistant", content: "可以找一个固定时间和提醒机制，降低执行门槛。", index: 4 },
    { role: "user", content: "听起来可以试试。", index: 5 },
    { role: "assistant", content: "很好，我们先从一周计划开始，完成后再微调。", index: 6 },
  ],
};

function paginate<T>(list: T[], page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const start = (safePage - 1) * safeLimit;
  const end = start + safeLimit;
  const sliced = list.slice(start, end);
  return {
    list: sliced,
    pagination: {
      total: list.length,
      page: safePage,
      limit: safeLimit,
      hasNext: end < list.length,
    },
  };
}

function sortConversations(list: ConversationListItem[]) {
  return [...list].sort((a, b) => b.updateTime - a.updateTime);
}

export async function createConversation(
  payload: CreateConversationRequest = {}
): Promise<CreateConversationResponse> {
  if (USE_CONVERSATION_MOCK) {
    const conversationId = `mock-conv-${Date.now()}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const conversation: ConversationListItem = {
      conversationId,
      brief: "新对话",
      createTime: timestamp,
      updateTime: timestamp,
    };
    mockConversations = sortConversations([conversation, ...mockConversations]);
    mockMessagesByConversation = {
      ...mockMessagesByConversation,
      [conversationId]: [],
    };
    return {
      conversationId,
      code: 0,
      msg: "success",
    };
  }
  return request.post<CreateConversationResponse>(
    CONVERSATION_API.create,
    payload,
    CONVERSATION_REQUEST_CONFIG
  );
}

export async function getConversationList(
  payload: GetConversationListRequest = {}
): Promise<GetConversationListResponse> {
  const page = payload.page ?? DEFAULT_PAGE;
  const limit = payload.limit ?? DEFAULT_LIMIT;
  if (USE_CONVERSATION_MOCK) {
    const sorted = sortConversations(mockConversations);
    const { list, pagination } = paginate(sorted, page, limit);
    return {
      conversationList: list,
      pagination,
      code: 0,
      msg: "success",
    };
  }
  const body = { page, limit };
  return request.post<GetConversationListResponse>(
    CONVERSATION_API.list,
    body,
    CONVERSATION_REQUEST_CONFIG
  );
}

export async function getConversationHistory(
  payload: GetConversationHistoryRequest
): Promise<GetConversationHistoryResponse> {
  const page = payload.page ?? DEFAULT_PAGE;
  const limit = payload.limit ?? DEFAULT_LIMIT;
  if (USE_CONVERSATION_MOCK) {
    const messages = mockMessagesByConversation[payload.conversationId] || [];
    const { list, pagination } = paginate(messages, page, limit);
    return {
      messageList: list,
      pagination,
      code: 0,
      msg: "success",
    };
  }
  const body = {
    conversationId: payload.conversationId,
    page,
    limit,
  };
  return request.post<GetConversationHistoryResponse>(
    CONVERSATION_API.history,
    body,
    CONVERSATION_REQUEST_CONFIG
  );
}
