import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  outputDir: '../../test-results/react-reference',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4180',
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'bun run dev -- --port 4180 --strictPort',
    url: 'http://127.0.0.1:4180',
    reuseExistingServer: false,
  },
})
