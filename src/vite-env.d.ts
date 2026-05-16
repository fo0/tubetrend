/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_SEARCH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface BuildInfo {
  version: string;
  commitHash: string;
  branch: string;
  buildDate: string;
}

declare const __BUILD_INFO__: BuildInfo;
