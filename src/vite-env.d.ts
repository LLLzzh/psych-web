/// <reference types="vite/client" />

interface Window {
  /** 开发环境由 request.ts 注入，用于控制台切换 API baseURL */
  setBase?: (baseURL: string) => void;
}
