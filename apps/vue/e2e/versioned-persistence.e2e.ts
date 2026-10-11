import { expect, test } from '@playwright/test'

test('public versioned save isolates nested JSON and prepare waits for controlled acknowledgement', async ({
  page,
}) => {
  const defects: string[] = []
  page.on('pageerror', (error) => defects.push(error.message))
  await page.goto('/test.html')

  const result = await page.evaluate(async () => {
    const path = '/src/versioned-persistence-fixture.ts'

    const fixture = await import(path)

    return fixture.runVersionedPersistenceProof()
  })

  expect(result.canonicalBefore.version).toBe(1)
  expect(result.extendedBefore.version).toBe(2)
  expect(result.fresh).toStrictEqual(result.extendedBefore)
  expect(result.preparedOrigin).toStrictEqual([0, 0])
  expect(result.legacyCode).toBe('origin-requires-versioned-session')
  expect(result.invalidRejected).toBe(true)
  expect(result.accepted).toBe(result.notifications)
  expect(result.accepted).toBe(1)
  expect(defects).toStrictEqual([])
})
