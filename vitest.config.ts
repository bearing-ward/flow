import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          exclude: ['**/*.browser.test.ts', '**/node_modules/**'],
          include: [
            'packages/**/*.test.ts',
            'apps/shared/schema-studio/**/*.test.ts',
            'apps/foldkit/src/**/*.test.ts',
            'apps/vanilla/src/**/*.test.ts',
            'scripts/check-research-traces.test.ts',
            'scripts/check-catalogs.test.ts',
            'scripts/check-api-members.test.ts',
            'scripts/check-api-member-contracts.test.ts',
            'scripts/check-proof-matrix.test.ts',
            'scripts/check-example-recipes.test.ts',
            'scripts/check-benchmark-calibration.test.ts',
            'scripts/package-archive.test.ts',
            'scripts/collector-delivery-query.test.ts',
            'scripts/verification-plan.test.ts',
            'scripts/upstream-test-cases.test.ts',
          ],
        },
      },
      {
        test: {
          name: 'ownership',
          include: [
            'packages/vue/tests/**/*.browser.test.ts',
            'apps/vanilla/tests/**/*.browser.test.ts',
          ],
          fileParallelism: false,
          setupFiles: ['tests/browser/setup.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
            viewport: { width: 960, height: 640 },
          },
        },
      },
    ],
  },
})
