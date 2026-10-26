import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: '*.e2e.ts',
  outputDir: '../../../test-results/tree-reference',
  use: { viewport: { width: 1200, height: 800 } },
})
