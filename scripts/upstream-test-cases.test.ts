import { describe, expect, it } from 'vitest'

import {
  enumerateSourceCases,
  enumerateUpstreamCases,
} from './upstream-test-cases.ts'

describe('upstream executable test inventory', () => {
  it('counts test bodies including skip/only and retains inline guards on the parent', () => {
    const cases = enumerateSourceCases({
      path: 'suite.ts',
      phase: 126,
      text: `
// test('comment', () => {})
test.describe('outer', () => {
  test.describe('inner', () => {
    test('first', async () => {
      test.skip(browserName !== 'chromium', 'CDP only');
    });
    test.skip('declared skip', () => {});
    test.only('declared only', function () {});
  });
});
describe('Cypress', () => { it('case', () => {}); });
`,
    })

    expect(
      cases.map(({ title, upstream }) => ({ title, upstream }))
    ).toStrictEqual([
      { title: 'outer > inner > first', upstream: 'suite.ts:5' },
      { title: 'outer > inner > declared skip', upstream: 'suite.ts:8' },
      { title: 'outer > inner > declared only', upstream: 'suite.ts:9' },
      { title: 'Cypress > case', upstream: 'suite.ts:12' },
    ])
    expect(cases[0]?.guards).toStrictEqual([
      {
        upstream: 'suite.ts:6',
        condition: "browserName !== 'chromium'",
        reason: 'CDP only',
      },
    ])
  })

  it('enumerates the pinned executable suite and its three Playwright guards', async () => {
    const cases = await enumerateUpstreamCases()

    expect(
      [126, 127, 128].map(
        (phase) => cases.filter((entry) => entry.phase === phase).length
      )
    ).toStrictEqual([50, 67, 107])
    expect(
      cases
        .filter((entry) => entry.phase === 126)
        .flatMap((entry) => entry.guards)
    ).toHaveLength(3)
  })
})
