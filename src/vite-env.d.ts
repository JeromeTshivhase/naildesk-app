/// <reference types="vite/client" />
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}
