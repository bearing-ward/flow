import { expect, test } from '@playwright/test'

test('public mounted Runtime retains native fields and correlates legacy failure, same-owner recovery and disposal', async ({
  page,
}) => {
  const defects: string[] = []
  page.on('pageerror', (error) => defects.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') {
      defects.push(message.text())
    }
  })
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const fixturePath = '/e2e/native-schema-fixture.ts'
    const fixture = await import(fixturePath)

    return fixture.runNativeSchemaProof()
  })

  expect(result.initialCounts).toStrictEqual({
    failure: 1,
    success: 0,
    accepted: 0,
  })
  expect(result.initialFailure).toMatchObject({
    status: 'failed',
    reason: 'native-fields-require-versioned-session',
  })
  expect(result.initialRetained).toStrictEqual(result.coreRetained)
  expect(result.coreDetached).toBeTruthy()
  expect(result.coreFrozen).toBeTruthy()
  expect(result.initialRetained.document.nodes[0]).toMatchObject({
    connectable: false,
    ariaRole: '',
    ariaLabel: '',
    ariaDescription: '',
  })
  expect(result.initialRetained.document.edges[0]).toMatchObject({
    ariaRole: 'custom role',
    ariaLabel: '',
  })
  expect(result.beforeFailure).toStrictEqual(result.afterFailure)
  expect(result.beforeFailure).toStrictEqual(result.undefinedSnapshot)
  expect(result.beforeFailure.nodeKeys).toEqual(
    expect.arrayContaining([
      'connectable',
      'ariaRole',
      'ariaLabel',
      'ariaDescription',
    ])
  )
  expect(result.beforeFailure.edgeKeys).toEqual(
    expect.arrayContaining(['ariaRole', 'ariaLabel'])
  )
  expect(
    Object.hasOwn(result.undefinedJson.nodes[0], 'connectable')
  ).toBeFalsy()
  expect(Object.hasOwn(result.undefinedJson.nodes[0], 'ariaRole')).toBeFalsy()
  expect(Object.hasOwn(result.undefinedJson.edges[0], 'ariaRole')).toBeFalsy()
  expect(result.unchangedViewport).toStrictEqual({ x: 5, y: -7, zoom: 1.5 })
  expect(result.notificationsAfterFailure).toBe(
    result.notificationsBeforeFailure
  )
  expect(result.undefinedFailure).toMatchObject({
    status: 'failed',
    reason: 'native-fields-require-versioned-session',
  })
  expect(result.failures).toStrictEqual([
    {
      requestId: result.initialFailure.requestId,
      code: 'native-fields-require-versioned-session',
    },
    {
      requestId: result.undefinedFailure.requestId,
      code: 'native-fields-require-versioned-session',
    },
  ])
  expect(result.recovered.status).toBe('succeeded')
  expect(result.recovered.response.snapshot.document.nodes[0].label).toBe(
    'Ordinary recovery'
  )
  expect(result.recovered.response.savedSession.version).toBe(1)
  expect(
    Object.hasOwn(
      result.recovered.response.savedSession.document.nodes[0],
      'selected'
    )
  ).toBeFalsy()
  expect(
    Object.hasOwn(
      result.recovered.response.savedSession.document.edges[0],
      'selected'
    )
  ).toBeFalsy()
  expect(result.successes).toStrictEqual([result.recovered.response.requestId])
  expect(result.disposed.status).toBe('disposed')
  expect(result.disposedAgain.status).toBe('disposed')
  expect(result.settled).toBe(1)
  expect(result.countsAfterDispose).toStrictEqual(result.countsBeforeDispose)
  expect(defects).toStrictEqual([])
})
