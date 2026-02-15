import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import electron from 'vite-plugin-electron';
import { execSync } from 'child_process';

// Electron plugins are only active when ELECTRON=true is set.
// This keeps the web app (dev server, Docker build) completely unaffected.
const isElectron = process.env.ELECTRON === 'true';

// Get build information
function getBuildInfo() {
  let commitHash = process.env.VITE_GIT_COMMIT_HASH || 'unknown';
  let branch = process.env.VITE_GIT_BRANCH || 'unknown';

  try {
    commitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    // Not a git repo or git not available
  }

  const now = new Date();
  const version = now.getUTCFullYear().toString()
    + (now.getUTCMonth() + 1).toString().padStart(2, '0')
    + now.getUTCDate().toString().padStart(2, '0')
    + '-'
    + now.getUTCHours().toString().padStart(2, '0')
    + now.getUTCMinutes().toString().padStart(2, '0');

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
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      tailwindcss(),
      ...(isElectron ? [
        electron([
          {
            entry: 'electron/main.ts',
            vite: {
              build: {
                outDir: 'dist-electron',
                rollupOptions: {
                  external: ['electron'],
                },
              },
            },
          },
          {
            entry: 'electron/preload.ts',
            onstart(args) {
              args.reload();
            },
            vite: {
              build: {
                outDir: 'dist-electron',
                rollupOptions: {
                  external: ['electron'],
                },
              },
            },
          },
        ]),
      ] : []),
    ],
    define: {
      __BUILD_INFO__: JSON.stringify(buildInfo),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@features': path.resolve(__dirname, 'src/features'),
        '@shared': path.resolve(__dirname, 'src/shared'),
        '@providers': path.resolve(__dirname, 'src/providers'),
        '@i18n': path.resolve(__dirname, 'src/i18n'),
      },
    },
  };
});
