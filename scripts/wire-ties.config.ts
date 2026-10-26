import { defineConfig } from '@playwright/test'

export default defineConfig({
  outputDir: '../test-results/wire-ties',
  projects: [
    { name: 'vanilla', use: { baseURL: 'http://127.0.0.1:4190' } },
    { name: 'vue', use: { baseURL: 'http://127.0.0.1:4191' } },
    { name: 'foldkit', use: { baseURL: 'http://127.0.0.1:4192' } },
  ],
  testDir: '../apps/shared/wire-ties',
  testMatch: 'wire-ties.e2e.ts',
  webServer: [
    {
      command:
        'bun run --cwd apps/vanilla vite --host 127.0.0.1 --port 4190 --strictPort',
      cwd: '..',
      reuseExistingServer: false,
      url: 'http://127.0.0.1:4190',
    },
    {
      command:
        'bun run --cwd apps/foldkit vite --host 127.0.0.1 --port 4192 --strictPort',
      cwd: '..',
      reuseExistingServer: false,
      url: 'http://127.0.0.1:4192',
    },
    {
      command:
        'bun run --cwd apps/vue vite --host 127.0.0.1 --port 4191 --strictPort',
      cwd: '..',
      reuseExistingServer: false,
      url: 'http://127.0.0.1:4191',
    },
  ],
})
