import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

// Get build information
function getBuildInfo() {
  // Try git first, then fall back to environment variables (for Docker builds)
  let commitHash = process.env.VITE_GIT_COMMIT_HASH || 'unknown';
  let commitHashShort = process.env.VITE_GIT_COMMIT_SHORT || 'unknown';
  let branch = process.env.VITE_GIT_BRANCH || 'unknown';

  try {
    commitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    commitHashShort = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    // Not a git repo or git not available - use env vars from Docker build args
  }

  return {
    version: commitHashShort,
    commitHash,
    branch,
    buildDate: new Date().toISOString(),
  };
}

export default defineConfig(() => {
  const buildInfo = getBuildInfo();

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
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
