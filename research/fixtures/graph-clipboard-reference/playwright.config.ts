import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: 'reference.e2e.ts',
  workers: 1,
  timeout: 60_000,
  use: { viewport: { width: 1200, height: 900 } },
})
