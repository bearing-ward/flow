import { expect, test } from '@playwright/test'

test('Vue state composables expose isolated readonly accepted state', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  await expect(page.getByTestId('state-probe-left')).toHaveAttribute(
    'data-node-count',
    '2'
  )
  await expect(page.locator("[data-node-id='left-hidden']")).toHaveCount(0)

  const initial = await page.evaluate(() => ({
    left: window.__flowVueTest?.publicState('left'),
    right: window.__flowVueTest?.publicState('right'),
  }))

  expect(initial.left?.nodeIds).toEqual(['left-visible', 'left-hidden'])
  expect(initial.left?.edgeIds).toEqual(['left-edge'])
  expect(initial.left?.missingNode).toBe(true)
  expect(initial.left?.missingEdge).toBe(true)
  expect(initial.left?.frozen).toBe(true)
  expect(initial.left?.mutationRejected).toBe(true)
  expect(initial.left?.notifications).toBe(0)
  expect(initial.right?.nodeIds).toEqual(['right-node'])
  expect(initial.right?.viewport).toEqual({ x: 15, y: 25, zoom: 1.25 })

  await page.evaluate(() => window.__flowVueTest?.proposePublicPosition('left'))
  expect(
    await page.evaluate(() => window.__flowVueTest?.publicState('left'))
  ).toMatchObject({ firstNodeX: 20, notifications: 0, events: ['proposal'] })

  await page.evaluate(() => {
    const harness = window.__flowVueTest
    harness?.acceptPublicProposals()
    harness?.proposePublicPosition('left')
  })
  await expect
    .poll(() => page.evaluate(() => window.__flowVueTest?.publicState('left')))
    .toMatchObject({
      firstNodeX: 90,
      notifications: 1,
      events: ['proposal', 'proposal', 'accepted'],
    })

  await page.evaluate(() =>
    window.__flowVueTest?.updatePublicViewport({ x: 40, y: 50, zoom: 1.5 })
  )
  await expect
    .poll(() => page.evaluate(() => window.__flowVueTest?.publicState('left')))
    .toMatchObject({ viewport: { x: 40, y: 50, zoom: 1.5 }, notifications: 2 })

  await page.evaluate(() => window.__flowVueTest?.proposePublicViewport())
  await expect
    .poll(() => page.evaluate(() => window.__flowVueTest?.publicState('left')))
    .toMatchObject({ viewport: { x: 35, y: 45, zoom: 1.2 }, notifications: 3 })

  await page.evaluate(() =>
    window.__flowVueTest?.updatePublicDocument('left', {
      nodes: [
        { id: 'replacement', label: 'Replacement', position: { x: 12, y: 14 } },
      ],
      edges: [],
    })
  )
  await expect
    .poll(() => page.evaluate(() => window.__flowVueTest?.publicState('left')))
    .toMatchObject({
      nodeIds: ['replacement'],
      edgeIds: [],
      firstNodeX: 12,
      notifications: 4,
    })

  await page.evaluate(() =>
    window.__flowVueTest?.proposePublicPosition('right')
  )
  await expect
    .poll(() => page.evaluate(() => window.__flowVueTest?.publicState('right')))
    .toMatchObject({ firstNodeX: 90, notifications: 1 })
  expect(
    await page.evaluate(() => window.__flowVueTest?.publicState('left'))
  ).toMatchObject({ firstNodeX: 12, notifications: 4 })

  await page.evaluate(() => window.__flowVueTest?.unmountPublicObserver())
  await expect(page.getByTestId('state-probe-left')).toHaveCount(0)
  await page.evaluate(() =>
    window.__flowVueTest?.proposePublicPosition('right')
  )
  expect(
    await page.evaluate(() => window.__flowVueTest?.publicState('right'))
  ).toMatchObject({ firstNodeX: 90, notifications: 1 })

  await page.evaluate(() => window.__flowVueTest?.destroyPublicCanvases())
  await page.evaluate(() =>
    window.__flowVueTest?.proposePublicPosition('right')
  )
  expect(
    await page.evaluate(() => window.__flowVueTest?.publicState('right'))
  ).toMatchObject({ firstNodeX: 90, notifications: 1 })
  expect(
    await page.evaluate(() => window.__flowVueTest?.outsideProviderError())
  ).toContain(
    'useFlow must be called in setup() below a mounted FlowCanvas provider'
  )
})

test('Vue accepted state listeners deduplicate and queue reentrant changes', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const order = await page.evaluate(() =>
    window.__flowVueTest?.exercisePublicNotificationPolicy()
  )

  expect(order).toEqual([
    'first:100',
    'failure:100',
    'last:100',
    'first:101',
    'failure:101',
    'last:101',
  ])
})

test('Vue accepted state treats object key order as equal document values', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  await page.evaluate(() => {
    window.__flowVueTest?.updatePublicDocument('left', {
      nodes: [
        {
          id: 'left-visible',
          label: 'Left visible',
          position: { x: 20, y: 30 },
          data: { alpha: 1, beta: 2 },
        },
        {
          id: 'left-hidden',
          label: 'Left hidden',
          hidden: true,
          position: { x: 240, y: 30 },
        },
      ],
      edges: [
        { id: 'left-edge', source: 'left-visible', target: 'left-hidden' },
      ],
    })
  })

  await page.evaluate(() => {
    window.__flowVueTest?.updatePublicDocument('left', {
      nodes: [
        {
          id: 'left-visible',
          label: 'Left visible',
          position: { x: 20, y: 30 },
          data: { beta: 2, alpha: 1 },
        },
        {
          id: 'left-hidden',
          label: 'Left hidden',
          hidden: true,
          position: { x: 240, y: 30 },
        },
      ],
      edges: [
        { id: 'left-edge', source: 'left-visible', target: 'left-hidden' },
      ],
    })
  })

  expect(
    await page.evaluate(() => window.__flowVueTest?.publicState('left'))
  ).toMatchObject({
    notifications: 1,
    nodeIds: ['left-visible', 'left-hidden'],
  })
})
