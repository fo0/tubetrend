/// <reference types="vite/client" />

interface BuildInfo {
  version: string;
  commitHash: string;
  commitHashShort: string;
  branch: string;
  buildDate: string;
}

declare const __BUILD_INFO__: BuildInfo;
