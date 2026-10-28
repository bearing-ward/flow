import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'tests/consumer/routing-package.integration.ts',
      'tests/consumer/react-fixture-source.integration.ts',
    ],
  },
})
