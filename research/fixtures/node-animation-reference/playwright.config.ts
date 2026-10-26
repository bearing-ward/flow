import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: '*.e2e.ts',
  outputDir: '../../../test-results/node-animation-reference',
  use: { viewport: { width: 960, height: 640 } },
})
