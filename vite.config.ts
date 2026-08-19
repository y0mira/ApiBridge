import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import webConfig from './web.config.json'

export default defineConfig({
  base: process.env.BASE_PATH ?? './',
  plugins: [react()],
  server: {
    host: webConfig.host,
    port: webConfig.port,
    strictPort: true,
  },
  preview: {
    host: webConfig.host,
    port: webConfig.previewPort,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['e2e/**', 'node_modules/**'],
    testTimeout: 15000,
  },
})
