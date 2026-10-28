import { execFileSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

import { checkEvidenceLink } from './check-api-members.ts'

describe('api-members checker', () => {
  it('validates the real repository', () => {
    expect(() =>
      execFileSync('bun', ['run', 'scripts/check-api-members.ts'], {
        stdio: 'pipe',
      })
    ).not.toThrow()
  })
})

describe('evidence line matching', () => {
  it('accepts line ranges and rejects out-of-range or escaping paths', () => {
    const files = new Map([['src/example.ts', 'one\ntwo']])
    const failures: string[] = []
    checkEvidenceLink('member', 'src/example.ts:1-2', files, failures)
    expect(failures).toStrictEqual([])
    checkEvidenceLink('member', 'src/example.ts:2-3', files, failures)
    checkEvidenceLink('member', 'src/../example.ts:1', files, failures)
    expect(failures).toStrictEqual([
      'Invalid evidence line for member: src/example.ts:2-3',
      'Evidence link escapes repository for member: src/../example.ts:1',
    ])
  })
})
