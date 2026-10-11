import { expect, test } from '@playwright/test'

test('actual Runtime shares one legacy/versioned owner and detaches every public JSON projection', async ({
  page,
}) => {
  const defects: string[] = []
  page.on('pageerror', (error) => defects.push(error.message))
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const path = '/e2e/versioned-persistence-fixture.ts'

    const fixture = await import(path)

    return fixture.runVersionedPersistenceProof()
  })

  expect(result.firstFailure).toMatchObject({
    status: 'failed',
    reason: 'origin-requires-versioned-session',
  })
  expect(result.secondFailure).toMatchObject({
    status: 'failed',
    reason: 'origin-requires-versioned-session',
  })
  expect(result.initialCounts).toStrictEqual({
    accepted: 0,
    failures: 0,
    successes: 0,
  })
  expect(result.before.savedSession.version).toBe(2)
  expect(result.canonicalBefore.savedSession.version).toBe(1)
  expect(result.afterFailures.snapshot).toStrictEqual(result.before.snapshot)
  expect(result.final.snapshot).toStrictEqual(result.canonicalBefore.snapshot)
  expect(result.final.savedSession).toStrictEqual(
    result.canonicalBefore.savedSession
  )
  expect(result).toMatchObject({
    failures: 2,
    successes: 1,
    accepted: 1,
    invalidRejected: true,
    checkedProjections: 9,
  })
  expect(defects).toStrictEqual([])
})
