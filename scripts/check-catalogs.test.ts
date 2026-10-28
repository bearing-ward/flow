import { execFileSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

describe('consolidated research checks', () => {
  it('validates every catalog rule against the real repository', () => {
    expect(() =>
      execFileSync('bun', ['run', 'scripts/check-catalogs.ts'], {
        stdio: 'pipe',
      })
    ).not.toThrow()
  })

  it('compares the generated inventory without writing', () => {
    expect(() =>
      execFileSync('bun', ['run', 'scripts/inventory-xyflow.ts', '--check'], {
        stdio: 'pipe',
      })
    ).not.toThrow()
  })
})
