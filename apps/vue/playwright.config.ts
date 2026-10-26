import { defineConfig } from '@playwright/test'

const port = Number(process.env.FLOW_VUE_TEST_PORT ?? 4177)

if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
  throw new Error(
    'FLOW_VUE_TEST_PORT must be an integer between 1024 and 65535'
  )
}

const url = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  outputDir: './test-results',
  use: {
    baseURL: url,
    viewport: { width: 960, height: 640 },
  },
  webServer: {
    command:
      process.env.FLOW_VUE_TEST_PORT === undefined
        ? 'bun run dev:conformance'
        : `bun run --cwd ../.. build:vue:packages && vite --host 127.0.0.1 --port ${port} --strictPort`,
    reuseExistingServer: false,
    url,
  },
})
