import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
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
