import { readFileSync } from 'node:fs'

import {
  ViewportBoundsSchema,
  ViewportLimitsSchema,
  ViewportPaddingSchema,
  ViewportSchema,
} from '@flow/core'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { Schema as S } from 'effect'

const ViewportContractSchema = S.Struct({
  coordinateCases: S.Array(
    S.Struct({
      hostRect: S.Struct({ left: S.Number, top: S.Number }),
      client: S.Struct({ x: S.Number, y: S.Number }),
      viewport: ViewportSchema,
      flow: S.Struct({ x: S.Number, y: S.Number }),
      screen: S.Struct({ x: S.Number, y: S.Number }),
    })
  ),
  fitCases: S.Array(
    S.Struct({
      bounds: ViewportBoundsSchema,
      pane: S.Struct({ width: S.Number, height: S.Number }),
      limits: ViewportLimitsSchema,
      padding: ViewportPaddingSchema,
      viewport: ViewportSchema,
    })
  ),
})

const viewportContract = S.decodeUnknownSync(ViewportContractSchema)(
  JSON.parse(readFileSync('research/fixtures/viewport-contract.json', 'utf-8'))
)

const first = <Value>(items: readonly Value[], context: string): Value => {
  const [value] = items

  if (value === undefined) {
    throw new Error(`Viewport contract has no ${context}`)
  }

  return value
}

const mount = async (page: Page, mode: 'controlled' | 'uncontrolled') => {
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.goto('/test.html')
  await page.addStyleTag({
    content:
      'body { min-height: 1400px; } #app { padding: 90px 110px; } #app .flow-vue-canvas { width: 800px; height: 600px; min-height: 0; margin: 0; }',
  })
  await page.evaluate(
    async ({ viewportMode, viewportLimits }) => {
      const harnessUrl = '/e2e/viewport-harness.ts'
      const harness = await import(harnessUrl)
      harness.mountViewportHarness(viewportMode, viewportLimits)
    },
    {
      viewportMode: mode,
      viewportLimits: first(viewportContract.fitCases, 'fit cases').limits,
    }
  )
  await expect(page.locator('.flow-vue-canvas')).toBeVisible()
}

// eslint-disable-next-line complexity -- Keeps the fixture-driven viewport acceptance sequence in one browser scenario.
test('Vue viewport operations use pane offsets, update the rendered transform, and return terminal status', async ({
  page,
}) => {
  await mount(page, 'uncontrolled')

  const initial = await page.evaluate(() =>
    window.__flowVueViewportTest?.read()
  )

  const coordinateCase = first(
    viewportContract.coordinateCases,
    'coordinate cases'
  )

  expect(initial?.initialized).toBe(true)
  expect(initial?.rect.left).toBeGreaterThan(0)
  expect(initial?.rect.top).toBeGreaterThan(0)
  expect(initial?.zoom).toBe(1)

  const coordinateStatus = await page.evaluate(
    (target) => window.__flowVueViewportTest?.setViewport(target),
    coordinateCase.viewport
  )

  expect(coordinateStatus?.status).toBe('accepted')

  const flowPosition = await page.evaluate((coordinate) => {
    const api = window.__flowVueViewportTest
    const rect = api?.read().rect

    return api?.screenToFlow({
      x: (rect?.left ?? 0) + coordinate.client.x - coordinate.hostRect.left,
      y: (rect?.top ?? 0) + coordinate.client.y - coordinate.hostRect.top,
    })
  }, coordinateCase)

  expect(flowPosition).toEqual(coordinateCase.flow)

  const screenPosition = await page.evaluate((coordinate) => {
    const screen = window.__flowVueViewportTest?.flowToScreen(coordinate.flow)
    const rect = window.__flowVueViewportTest?.read().rect

    return screen === undefined || rect === undefined
      ? undefined
      : { x: screen.x - rect.left, y: screen.y - rect.top }
  }, coordinateCase)

  expect(screenPosition).toEqual({
    x: coordinateCase.screen.x - coordinateCase.hostRect.left,
    y: coordinateCase.screen.y - coordinateCase.hostRect.top,
  })

  await page.evaluate(() => window.scrollTo(0, 180))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(180)

  const scrolledRoundTrip = await page.evaluate((coordinate) => {
    const api = window.__flowVueViewportTest
    const rect = api?.read().rect
    const screen = api?.flowToScreen(coordinate.flow)

    return screen === undefined || rect === undefined
      ? undefined
      : api?.screenToFlow(screen)
  }, coordinateCase)

  expect(scrolledRoundTrip).toEqual(coordinateCase.flow)

  const result = await page.evaluate(() =>
    window.__flowVueViewportTest?.setViewport({ x: 24, y: 36, zoom: 1.5 })
  )

  expect(result).toMatchObject({
    status: 'accepted',
    viewport: { x: 24, y: 36, zoom: 1.5 },
  })
  await expect(page.locator('.flow-vue-viewport')).toHaveCSS(
    'transform',
    'matrix(1.5, 0, 0, 1.5, 24, 36)'
  )
  expect(
    await page.evaluate(() => window.__flowVueViewportTest?.read().viewport)
  ).toEqual({ x: 24, y: 36, zoom: 1.5 })

  const fitCase = first(viewportContract.fitCases, 'fit cases')

  const fitted = await page.evaluate(
    ({ bounds, padding }) =>
      window.__flowVueViewportTest?.fitBounds(bounds, padding),
    fitCase
  )

  expect(fitted).toMatchObject({
    status: 'accepted',
    viewport: fitCase.viewport,
  })

  const allNodesFit = await page.evaluate(() =>
    window.__flowVueViewportTest?.fitView('all')
  )

  expect(allNodesFit?.status).toBe('accepted')

  const containment = await page.evaluate(() => {
    const pane = document
      .querySelector('.flow-vue-canvas')
      ?.getBoundingClientRect()

    const nodes = [
      ...document.querySelectorAll<HTMLElement>('[data-node-id]'),
    ].map((node) => node.getBoundingClientRect())

    return {
      zoom: window.__flowVueViewportTest?.read().zoom,
      pane:
        pane === undefined
          ? undefined
          : {
              left: pane.left,
              top: pane.top,
              right: pane.right,
              bottom: pane.bottom,
            },
      nodes: nodes.map(({ left, top, right, bottom }) => ({
        left,
        top,
        right,
        bottom,
      })),
    }
  })

  expect(containment?.zoom).toBeGreaterThan(0)
  expect(containment?.zoom).toBeLessThan(1)
  expect((containment?.zoom ?? 1) % 1).not.toBe(0)
  expect(containment?.nodes).toHaveLength(2)

  for (const node of containment?.nodes ?? []) {
    expect(node.left).toBeGreaterThanOrEqual((containment?.pane?.left ?? 0) - 1)
    expect(node.right).toBeLessThanOrEqual((containment?.pane?.right ?? 0) + 1)
    expect(node.top).toBeGreaterThanOrEqual((containment?.pane?.top ?? 0) - 1)
    expect(node.bottom).toBeLessThanOrEqual(
      (containment?.pane?.bottom ?? 0) + 1
    )
  }

  const selectedFit = await page.evaluate(() =>
    window.__flowVueViewportTest?.fitView('selected')
  )

  expect(selectedFit?.status).toBe('accepted')

  const selectedCenter = await page.evaluate(() => {
    const pane = document
      .querySelector('.flow-vue-canvas')
      ?.getBoundingClientRect()

    const selected = document
      .querySelector<HTMLElement>('[data-node-id="viewport-node"]')
      ?.getBoundingClientRect()

    return {
      paneX: pane === undefined ? undefined : pane.left + pane.width / 2,
      paneY: pane === undefined ? undefined : pane.top + pane.height / 2,
      nodeX:
        selected === undefined ? undefined : selected.left + selected.width / 2,
      nodeY:
        selected === undefined ? undefined : selected.top + selected.height / 2,
    }
  })

  expect(selectedCenter?.nodeX).toBeCloseTo(selectedCenter?.paneX ?? 0, 0)
  expect(selectedCenter?.nodeY).toBeCloseTo(selectedCenter?.paneY ?? 0, 0)
  expect(
    await page.evaluate(() => window.__flowVueViewportTest?.observations())
  ).toContain('end:accepted')
})

test('controlled Vue viewport operations report proposals without waiting for acknowledgement', async ({
  page,
}) => {
  await mount(page, 'controlled')

  const result = await page.evaluate(() =>
    window.__flowVueViewportTest?.zoomTo(1.4)
  )

  expect(result).toMatchObject({ status: 'proposed', viewport: { zoom: 1.4 } })
  expect(
    await page.evaluate(() => window.__flowVueViewportTest?.proposals())
  ).toHaveLength(1)

  const observedBeforeAcknowledgement = await page.evaluate(() => ({
    events: window.__flowVueViewportTest?.observations(),
    accepted: window.__flowVueViewportTest?.read().viewport,
  }))

  expect(observedBeforeAcknowledgement?.events).toEqual([
    'start',
    'change',
    'end:proposed',
  ])
  expect(observedBeforeAcknowledgement?.accepted).toEqual({
    x: 10,
    y: 20,
    zoom: 1,
  })

  await page.evaluate(async () => {
    const api = window.__flowVueViewportTest
    const proposal = api?.proposals()[0]

    if (api === undefined || proposal === undefined) {
      throw new Error('controlled viewport proposal is unavailable')
    }

    await api.acknowledge(proposal)
  })

  expect(
    await page.evaluate(() => window.__flowVueViewportTest?.observations())
  ).toEqual(['start', 'change', 'end:proposed'])
  expect(
    await page.evaluate(() => window.__flowVueViewportTest?.read().viewport)
  ).toEqual(
    await page.evaluate(() => window.__flowVueViewportTest?.proposals()[0])
  )
})

test('Vue viewport animations settle as superseded when another operation replaces them', async ({
  page,
}) => {
  await mount(page, 'uncontrolled')

  const results = await page.evaluate(() => {
    const api = window.__flowVueViewportTest

    if (api === undefined) {
      throw new Error('viewport harness is unavailable')
    }

    const animated = api.animate({ x: 100, y: 100, zoom: 1.5 })
    const second = api.setViewport({ x: 30, y: 40, zoom: 1.2 })

    return Promise.all([animated, second])
  })

  expect(results[0]?.status).toBe('superseded')
  expect(results[1]).toMatchObject({
    status: 'accepted',
    viewport: { x: 30, y: 40, zoom: 1.2 },
  })
})

test('Vue viewport cancellation and unmount settle animations and end observation', async ({
  page,
}) => {
  await mount(page, 'uncontrolled')

  const interrupted = await page.evaluate(() => {
    const api = window.__flowVueViewportTest

    if (api === undefined) {
      throw new Error('viewport harness is unavailable')
    }

    const running = api.animate({ x: 100, y: 100, zoom: 1.5 })
    api.interrupt()

    return running
  })

  expect(interrupted.status).toBe('superseded')
  expect(
    await page.evaluate(() => window.__flowVueViewportTest?.observations())
  ).toContain('end:superseded')

  const disposed = await page.evaluate(() => {
    const api = window.__flowVueViewportTest

    if (api === undefined) {
      throw new Error('viewport harness is unavailable')
    }

    const running = api.animate({ x: 120, y: 140, zoom: 1.6 })
    api.destroy()

    return running
  })

  expect(disposed.status).toBe('disposed')
  expect(
    await page.evaluate(() => window.__flowVueViewportTest?.observations())
  ).toContain('end:disposed')
})

test('Vue viewport animation respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mount(page, 'uncontrolled')

  const result = await page.evaluate(() =>
    window.__flowVueViewportTest?.animate({ x: 70, y: 80, zoom: 1.4 })
  )

  expect(result).toMatchObject({
    status: 'accepted',
    viewport: { x: 70, y: 80, zoom: 1.4 },
  })
  expect(
    await page.evaluate(() => window.__flowVueViewportTest?.read().viewport)
  ).toEqual({ x: 70, y: 80, zoom: 1.4 })
})
