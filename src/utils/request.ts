import axios from "axios";
import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
//定义接口返回的数据结构
interface ApiResponse {
  code: number;
  msg: string;
  data?: object;
}
//Axios实例
const service: AxiosInstance = axios.create({
  baseURL: "/api",
  timeout: 5000,
});

//请求拦截器
service.interceptors.request.use(
  (config) => {
    //发送请求前的处理>
    config.headers["X-Xh-Env"] = "test";
    config.headers["Authorization"] = localStorage.getItem('chat_token');
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
