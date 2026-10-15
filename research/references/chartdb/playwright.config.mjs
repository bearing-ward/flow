import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: 'scenarios.spec.mjs',
  outputDir: '/tmp/chartdb-ref/playwright-output',
  reporter: [
    ['list'],
    ['json', { outputFile: '/tmp/chartdb-ref/playwright-report.json' }],
  ],
  workers: 1,
  fullyParallel: false,
  timeout: 120000,
  use: {
    baseURL: 'http://127.0.0.1:4190',
    viewport: { width: 1600, height: 1000 },
    colorScheme: 'light',
    locale: 'en-US',
    reducedMotion: 'reduce',
    acceptDownloads: true,
  },
})
