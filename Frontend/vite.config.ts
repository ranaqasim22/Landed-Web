import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    env: { VITE_GOOGLE_CLIENT_ID: 'test-client-id' },
    css: false,
    restoreMocks: true,
  },
})
