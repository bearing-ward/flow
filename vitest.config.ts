import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'packages/**/*.test.ts',
      'apps/foldkit/src/**/*.test.ts',
      'scripts/check-api-members.test.ts',
      'scripts/check-api-member-contracts.test.ts',
      'scripts/check-proof-matrix.test.ts',
      'scripts/check-example-recipes.test.ts',
      'scripts/check-benchmark-calibration.test.ts',
      'scripts/package-archive.test.ts',
      'scripts/collector-delivery-query.test.ts',
    ],
  },
})
