import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: 'site.e2e.ts',
  outputDir: '../../test-results/site',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4186',
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: 'bun run scripts/site/server.ts',
    cwd: new URL('../..', import.meta.url).pathname,
    url: 'http://127.0.0.1:4186/flow/',
    reuseExistingServer: false,
  },
})
