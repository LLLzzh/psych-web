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
  PaginationInfo,
} from "../types/conversation";

const CONVERSATION_API = {
  create: "/conversation/create",
  list: "/conversation/list",
  history: "/conversation/get",
} as const;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const USE_CONVERSATION_MOCK = CONFIG.USE_CONVERSATION_MOCK;

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
    { role: 3, content: "最近作业和考试都很多，压力很大。", index: 1 },
    { role: 2, content: "先别急，我们可以先把任务拆成几块，逐步完成。", index: 2 },
    { role: 3, content: "我总觉得时间不够用。", index: 3 },
    { role: 2, content: "建议你用番茄钟法，每次专注25分钟，再休息5分钟。", index: 4 },
  ],
  "mock-conv-002": [
    { role: 3, content: "我晚上总是很晚才睡着。", index: 1 },
    { role: 2, content: "睡前1小时尽量减少手机使用，同时固定入睡时间。", index: 2 },
    { role: 3, content: "白天会犯困。", index: 3 },
    { role: 2, content: "可以先从规律起床时间开始，白天适度运动也有帮助。", index: 4 },
  ],
  "mock-conv-003": [
    { role: 3, content: "一到考试我就心慌。", index: 1 },
    { role: 2, content: "考试前可以做4-7-8呼吸法，先把生理紧张降下来。", index: 2 },
    { role: 3, content: "我担心自己会发挥失常。", index: 3 },
    { role: 2, content: "把注意力放回“下一道题”，避免反复评估自己状态。", index: 4 },
  ],
  "mock-conv-004": [
    { role: 3, content: "孩子总是顶嘴，沟通很难。", index: 1 },
    { role: 2, content: "先共情再表达规则，冲突通常会缓和不少。", index: 2 },
  ],
  "mock-conv-005": [
    { role: 3, content: "最近做什么都提不起劲。", index: 1 },
    { role: 2, content: "先从最小可执行目标开始，比如每天散步10分钟。", index: 2 },
    { role: 3, content: "我怕坚持不下来。", index: 3 },
    { role: 2, content: "可以找一个固定时间和提醒机制，降低执行门槛。", index: 4 },
    { role: 3, content: "听起来可以试试。", index: 5 },
    { role: 2, content: "很好，我们先从一周计划开始，完成后再微调。", index: 6 },
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

/** 后端统一为 { code, msg, data: { ...业务字段 } }，与 mock 的扁平结构对齐 */
function normalizePaginationInfo(
  raw: PaginationInfo | undefined,
  fallbackLimit: number
): PaginationInfo {
  if (!raw) {
    return {
      total: 0,
      page: 1,
      limit: fallbackLimit,
      hasNext: false,
    };
  }
  const limit =
    typeof raw.limit === "number" && raw.limit > 0 ? raw.limit : fallbackLimit;
  return {
    ...raw,
    limit,
  };
}

function normalizeGetConversationListResponse(
  raw: unknown
): GetConversationListResponse {
  const r = raw as GetConversationListResponse & {
    data?: Pick<GetConversationListResponse, "conversationList" | "pagination">;
  };
  const list = (r.conversationList ?? r.data?.conversationList ?? []).map(
    (item) => {
      const extended = item as ConversationListItem & {
        character?: { id?: string; name?: string; image?: string };
      };
      return {
        ...item,
        characterId: item.characterId ?? extended.character?.id,
        characterName: item.characterName ?? extended.character?.name,
        characterImage: item.characterImage ?? extended.character?.image,
      };
    }
  );
  const pag = normalizePaginationInfo(
    r.pagination ?? r.data?.pagination,
    DEFAULT_LIMIT
  );
  return {
    code: r.code ?? 0,
    msg: r.msg ?? "success",
    conversationList: list,
    pagination: pag,
  };
}

function normalizeGetConversationHistoryResponse(
  raw: unknown
): GetConversationHistoryResponse {
  const r = raw as GetConversationHistoryResponse & {
    data?: Pick<GetConversationHistoryResponse, "messageList" | "pagination">;
  };
  const list = r.messageList ?? r.data?.messageList ?? [];
  const pag = normalizePaginationInfo(
    r.pagination ?? r.data?.pagination,
    DEFAULT_LIMIT
  );
  return {
    code: r.code ?? 0,
    msg: r.msg ?? "success",
    messageList: list,
    pagination: pag,
  };
}

function normalizeCreateConversationResponse(
  raw: unknown
): CreateConversationResponse {
  const r = raw as CreateConversationResponse & {
    data?: { conversationId?: string };
  };
  const id = r.conversationId ?? r.data?.conversationId ?? "";
  return {
    code: r.code ?? 0,
    msg: r.msg ?? "success",
    conversationId: id,
  };
}

/** 页面卸载时调用（关闭标签页、刷新），使用 fetch keepalive 确保请求能发出 */
export function createConversationOnUnload(): void {
  if (USE_CONVERSATION_MOCK) return;
  let token: string | null = null;
  try {
    const raw = localStorage.getItem("auth-storage");
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { token?: string } };
      token = parsed?.state?.token ?? null;
    }
    if (!token) token = localStorage.getItem("chat_token");
  } catch {
    return;
  }
  if (!token) return;
  const url = `${CONFIG.API_BASE_URL}${CONVERSATION_API.create}`;
  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Xh-Env": CONFIG.XH_ENV,
      Authorization: token,
    },
    body: JSON.stringify({}),
    keepalive: true,
  });
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
  const raw = await request.post<unknown>(CONVERSATION_API.create, payload);
  return normalizeCreateConversationResponse(raw);
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
  const raw = await request.post<unknown>(CONVERSATION_API.list, body);
  return normalizeGetConversationListResponse(raw);
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
  const raw = await request.post<unknown>(CONVERSATION_API.history, body);
  return normalizeGetConversationHistoryResponse(raw);
}
