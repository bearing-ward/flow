import { execFileSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

describe('api-member-contracts checker', () => {
  it('validates the real repository', () => {
    expect(() =>
      execFileSync('bun', ['run', 'scripts/check-api-member-contracts.ts'], {
        stdio: 'pipe',
      })
    ).not.toThrow()
  })
})
