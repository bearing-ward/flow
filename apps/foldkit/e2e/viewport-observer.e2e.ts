import { expect, test } from '@playwright/test'

test('Foldkit Runtime reports user and controlled viewport proposal phases', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
    await window.__flowFoldkitTest?.settlePublicState()
  })

  const controlledCanvas = page.locator('[data-testid="flow-canvas"]').nth(1)
  const bounds = await controlledCanvas.boundingBox()

  if (bounds === null) {
    throw new Error('Controlled Foldkit canvas is not rendered')
  }

  await page.mouse.move(bounds.x + 30, bounds.y + 30)
  await page.mouse.down()
  await page.mouse.move(bounds.x + 90, bounds.y + 80, { steps: 3 })
  await page.mouse.up()

  const proposal = await page.evaluate(async () => {
    const api = window.__flowFoldkitTest
    const response = await api?.requestSnapshot('controlled')

    return {
      events: api?.publicViewportEvents('controlled'),
      accepted: response?.snapshot.viewport,
    }
  })

  expect(proposal.accepted).toEqual({ x: 0, y: 0, zoom: 1 })
  expect(proposal.events?.map(({ kind }) => kind)).toEqual([
    'start',
    'change',
    'change',
    'change',
    'end',
  ])
  expect(proposal.events?.at(-2)?.viewport).not.toEqual({
    x: 0,
    y: 0,
    zoom: 1,
  })
})

test('Foldkit controlled programmatic viewport proposal is observed once before acknowledgement', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
    await window.__flowFoldkitTest?.settlePublicState()
  })

  const proposal = await page.evaluate(async () => {
    const api = window.__flowFoldkitTest

    const result = await api?.requestPublicViewport('controlled', {
      kind: 'set',
      viewport: { x: 12, y: 18, zoom: 1.25 },
      width: 600,
      height: 400,
      originX: 0,
      originY: 0,
    })

    if (result?.viewport === undefined) {
      throw new Error('Controlled viewport proposal is missing its viewport')
    }

    const snapshot = await api?.requestSnapshot('controlled')

    return {
      result,
      events: api?.publicViewportEvents('controlled'),
      accepted: snapshot?.snapshot.viewport,
    }
  })

  expect(proposal.result?.status).toBe('proposed')
  expect(proposal.accepted).toEqual({ x: 0, y: 0, zoom: 1 })
  expect(proposal.events?.map(({ kind }) => kind)).toEqual([
    'start',
    'change',
    'end',
  ])

  if (proposal.result?.viewport === undefined) {
    throw new Error('Controlled viewport proposal is missing its viewport')
  }

  await page.evaluate((viewport) => {
    window.__flowFoldkitTest?.replacePublicViewport('controlled', viewport)
  }, proposal.result.viewport)
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())

  const acknowledged = await page.evaluate(async () => {
    const api = window.__flowFoldkitTest
    const snapshot = await api?.requestSnapshot('controlled')

    return {
      events: api?.publicViewportEvents('controlled'),
      viewport: snapshot?.snapshot.viewport,
    }
  })

  expect(acknowledged.viewport).toEqual({ x: 12, y: 18, zoom: 1.25 })
  expect(acknowledged.events).toEqual(proposal.events)
})
