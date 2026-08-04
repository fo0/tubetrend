import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import electron from "vite-plugin-electron";
import { execSync } from "child_process";

// Electron plugins are only active when ELECTRON=true is set.
// This keeps the web app (dev server, Docker build) completely unaffected.
const isElectron = process.env.ELECTRON === "true";

// Explicitly provided build info wins over local git detection. The Dockerfile
// passes the CI-supplied GIT_COMMIT_HASH / GIT_BRANCH build args through as
// these env vars, and its `COPY . .` may drag a `.git` directory into the build
// context — so shelling out unconditionally would silently discard what CI said
// the build is. "unknown" is the Dockerfile's ARG default, i.e. "not provided".
function fromEnv(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "unknown" ? trimmed : null;
}

// stderr is discarded so a non-git build context does not print
// "fatal: not a git repository" into the build log.
function gitOutput(command: string): string | null {
  try {
    return execSync(command, { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    // Not a git repo or git not available
    return null;
  }
}

// Get build information
function getBuildInfo() {
  const commitHash =
    fromEnv(process.env.VITE_GIT_COMMIT_HASH) ?? gitOutput("git rev-parse HEAD") ?? "unknown";
  const branch =
    fromEnv(process.env.VITE_GIT_BRANCH) ??
    gitOutput("git rev-parse --abbrev-ref HEAD") ??
    "unknown";

  const now = new Date();
  const version =
    now.getUTCFullYear().toString() +
    (now.getUTCMonth() + 1).toString().padStart(2, "0") +
    now.getUTCDate().toString().padStart(2, "0") +
    "-" +
    now.getUTCHours().toString().padStart(2, "0") +
    now.getUTCMinutes().toString().padStart(2, "0");

  return {
    version,
    commitHash,
    branch,
    buildDate: now.toISOString(),
  };
}

export default defineConfig(() => {
  const buildInfo = getBuildInfo();

  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
    },
    plugins: [
      react(),
      tailwindcss(),
      ...(isElectron
        ? [
            electron([
              {
                entry: "electron/main.ts",
                vite: {
                  build: {
                    outDir: "dist-electron",
                    rollupOptions: {
                      external: ["electron"],
                    },
                  },
                },
              },
              {
                entry: "electron/preload.ts",
                onstart(args) {
                  args.reload();
                },
                vite: {
                  build: {
                    outDir: "dist-electron",
                    rollupOptions: {
                      external: ["electron"],
                    },
                  },
                },
              },
            ]),
          ]
        : []),
    ],
    define: {
      __BUILD_INFO__: JSON.stringify(buildInfo),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
        "@features": path.resolve(__dirname, "src/features"),
        "@shared": path.resolve(__dirname, "src/shared"),
        "@providers": path.resolve(__dirname, "src/providers"),
        "@i18n": path.resolve(__dirname, "src/i18n"),
      },
    },
  };
});
