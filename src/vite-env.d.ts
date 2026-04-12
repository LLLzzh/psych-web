/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_XH_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  /** 开发环境由 request.ts 注入，用于控制台切换 API baseURL */
  setBase?: (baseURL: string) => void;
}
