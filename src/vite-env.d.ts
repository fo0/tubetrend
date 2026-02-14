/// <reference types="vite/client" />

interface BuildInfo {
  version: string;
  commitHash: string;
  branch: string;
  buildDate: string;
}

declare const __BUILD_INFO__: BuildInfo;
