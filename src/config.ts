const env = import.meta.env;

function requireViteString(name: "VITE_API_BASE_URL" | "VITE_WS_URL"): string {
  const v = env[name];
  if (typeof v !== "string" || !v.trim()) {
    throw new Error(
      `${name} is not set. Copy .env.example and use .env.development / .env.production, or .env.*.local.`
    );
  }
  return v.trim().replace(/\/$/, "");
}

/** 与默认后端约定一致：REST 为 …/psych，WS 为 …/psych/chat（http→ws，https→wss） */
export function deriveWsUrlFromHttpApiBase(httpBase: string): string {
  const normalized = httpBase.trim().replace(/\/$/, "");
  let u: URL;
  try {
    u = new URL(normalized);
  } catch {
    throw new Error(`Invalid API base URL: ${httpBase}`);
  }
  const wsProto =
    u.protocol === "https:"
      ? "wss:"
      : u.protocol === "http:"
        ? "ws:"
        : u.protocol;
  let path = u.pathname.replace(/\/$/, "") || "";
  if (!path.endsWith("/chat")) {
    path = path === "" ? "/chat" : `${path}/chat`;
  }
  return `${wsProto}//${u.host}${path}${u.search}${u.hash}`;
}

let apiBaseUrl = requireViteString("VITE_API_BASE_URL");

/** 当前 HTTP API 根路径（与 axios baseURL、CONFIG.API_BASE_URL 一致） */
export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

let wsUrl = requireViteString("VITE_WS_URL");

/** 与控制台 setBase 同步：更新 HTTP base，并按 …/psych → …/psych/chat 规则更新 WS */
export function setApiBaseUrl(httpBase: string): void {
  const normalized = httpBase.trim().replace(/\/$/, "");
  apiBaseUrl = normalized;
  wsUrl = deriveWsUrlFromHttpApiBase(normalized);
}

export const CONFIG = {
  get API_BASE_URL() {
    return apiBaseUrl;
  },
  get WS_URL() {
    return wsUrl;
  },
  /** 请求头 X-Xh-Env，默认 test */
  XH_ENV: (typeof env.VITE_XH_ENV === "string" && env.VITE_XH_ENV.trim()
    ? env.VITE_XH_ENV.trim()
    : "test") as string,
  /** 访问 /、/login、/chat 等旧路径时使用的机构 URI 段（与链接 /{uri}/login 中一致） */
  DEFAULT_UNIT_URI:
    typeof env.VITE_DEFAULT_UNIT_URI === "string"
      ? env.VITE_DEFAULT_UNIT_URI.trim().replace(/^\/+|\/+$/g, "")
      : "",
  USE_MOCK: false,
  USE_CONVERSATION_MOCK: false,
  PLAY_LOCAL_RECORDING: false,
};
