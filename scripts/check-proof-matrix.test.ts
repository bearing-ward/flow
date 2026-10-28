import { execFileSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

describe('proof-matrix checker', () => {
  it('validates the real repository', () => {
    expect(() =>
      execFileSync('bun', ['run', 'scripts/check-proof-matrix.ts'], {
        stdio: 'pipe',
      })
    ).not.toThrow()
  })
})
