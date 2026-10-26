import { defineConfig } from '@playwright/test'

export default defineConfig({
  outputDir: '../test-results/edge-routing',
  projects: [
    { name: 'vanilla', use: { baseURL: 'http://127.0.0.1:4186' } },
    { name: 'vue', use: { baseURL: 'http://127.0.0.1:4187' } },
    { name: 'foldkit', use: { baseURL: 'http://127.0.0.1:4188' } },
  ],
  testDir: '../apps/shared/edge-routing',
  testMatch: 'routing.e2e.ts',
  webServer: [
    {
      command:
        'bun run --cwd apps/vanilla vite --host 127.0.0.1 --port 4186 --strictPort',
      cwd: '..',
      reuseExistingServer: false,
      url: 'http://127.0.0.1:4186',
    },
    {
      command:
        'bun run --cwd apps/foldkit vite --host 127.0.0.1 --port 4188 --strictPort',
      cwd: '..',
      reuseExistingServer: false,
      url: 'http://127.0.0.1:4188',
    },
    {
      command:
        'bun run --cwd apps/vue vite --host 127.0.0.1 --port 4187 --strictPort',
      cwd: '..',
      reuseExistingServer: false,
      url: 'http://127.0.0.1:4187',
    },
  ],
})
