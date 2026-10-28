import { execFileSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

describe('example-recipes checker', () => {
  it('validates the real repository', () => {
    expect(() =>
      execFileSync('bun', ['run', 'scripts/check-example-recipes.ts'], {
        stdio: 'pipe',
      })
    ).not.toThrow()
  })
})
