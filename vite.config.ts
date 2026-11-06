import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    include: ['react-router-dom', 'firebase/app', 'firebase/auth', 'xlsx'],
    exclude: ['lucide-react'],
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
