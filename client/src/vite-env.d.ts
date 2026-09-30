/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KAKAO_MAPS_JS_KEY?: string;
  readonly VITE_KAKAO_MAPS_JS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
