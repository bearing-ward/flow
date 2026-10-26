import { defineConfig } from '@playwright/test'

export default defineConfig({
  outputDir: '../test-results/collaborative',
  testDir: '../apps/shared/collaborative',
  testMatch: 'mixed-host.e2e.ts',
  use: { viewport: { width: 1000, height: 800 } },
  webServer: [
    ...[
      ['vanilla', 4190],
      ['vue', 4191],
      ['foldkit', 4192],
    ].map(([host, port]) => ({
      command: `bun run --cwd apps/${host} vite --host 127.0.0.1 --port ${port} --strictPort`,
      cwd: new URL('..', import.meta.url).pathname,
      reuseExistingServer: false,
      url: `http://127.0.0.1:${port}`,
    })),
    {
      command: 'bun run --cwd packages/collaboration-yjs server',
      cwd: new URL('..', import.meta.url).pathname,
      reuseExistingServer: false,
      url: 'http://127.0.0.1:4193',
    },
  ],
})
