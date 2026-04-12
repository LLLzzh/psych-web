import axios from "axios";
import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
//定义接口返回的数据结构
interface ApiResponse {
  code: number;
  msg: string;
  data?: object;
}
//Axios实例
const service: AxiosInstance = axios.create({
  baseURL: "https://api.aiecnu.net/psych",
  timeout: 5000,
});

// 从 auth-storage（zustand persist）或 chat_token 获取 token，用于 conversation 等需鉴权的接口
function getAuthToken(): string | null {
  try {
    const raw = localStorage.getItem("auth-storage");
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { token?: string } };
      const token = parsed?.state?.token;
      if (token) return token;
    }
  } catch {
    // ignore parse error
  }
  return localStorage.getItem("chat_token");
}

//请求拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    //发送请求前的处理>
    config.headers["X-Xh-Env"] = "test";
    if (config.headers) {
      const token = getAuthToken();
      if (token) {
        config.headers["Authorization"] = token;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

//响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const res = response.data as ApiResponse;

    // 根据后端约定的状态码判断请求是否成功
    if (res.code !== 0) {
      return Promise.reject(new Error(res.msg || "请求失败"));
    }

    return response;
  },
  (error: AxiosError) => {
    let message = "请求错误";

    if (error.response) {
      switch (error.response.status) {
        case 401:
          message = "未授权，请重新登录";
          // 可以在这里处理登录过期逻辑
          // 动态导入 store 以避免循环依赖
          import("../store/authStore").then(({ useAuthStore }) => {
            useAuthStore.getState().clearAuth();
          });
          break;
        case 403:
          message = "拒绝访问";
          break;
        case 404:
          message = "请求错误，未找到该资源";
          break;
        case 500:
          message = "服务器错误";
          break;
        default:
          message = "请求失败";
      }
    } else {
      message = error.message || "网络错误，请检查网络连接";
    }
    console.error(message);
    return Promise.reject(error);
  }
);

/** 运行时修改 Axios baseURL，开发环境下可在控制台执行：`setBase("http://localhost:8080/psych")` */
export function setBase(baseURL: string) {
  service.defaults.baseURL = baseURL;
  console.info("[request] baseURL →", baseURL);
}

if (import.meta.env.DEV && typeof window !== "undefined") {
  window.setBase = setBase;
}

//封装请求方法
const request = {
  /**
   * @description GET请求
   * @param url
   * @param config
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await service.get(url, config);
    return res.data;
  },

  /**
   * @description POST请求
   * @param url
   * @param data
   * @param config
   */
  async post<T>(
    url: string,
    data?: object,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const res = await service.post(url, data, config);
    return res.data;
  },
};

export default request;
