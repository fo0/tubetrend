import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import fs from 'fs';

// Get build information
function getBuildInfo() {
  let commitHash = 'unknown';
  let commitHashShort = 'unknown';
  let branch = 'unknown';

  try {
    commitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    commitHashShort = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    // Not a git repo or git not available
  }

  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

  return {
    version: packageJson.version || '0.0.0',
    commitHash,
    commitHashShort,
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
