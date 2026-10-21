import { readFile } from 'node:fs/promises'

import {
  ViewportBoundsSchema,
  ViewportLimitsSchema,
  ViewportPaddingSchema,
  ViewportSchema,
} from '@flow/core'
import type * as CoreModule from '@flow/core'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { Schema as S } from 'effect'

type Scenario = 'extent' | 'fit' | 'fit-selected' | 'radius' | 'click'

const ViewportContractFixtureSchema = S.Struct({
  coordinateCases: S.Array(
    S.Struct({
      hostRect: S.Struct({ left: S.Finite, top: S.Finite }),
      client: S.Struct({ x: S.Finite, y: S.Finite }),
      viewport: ViewportSchema,
      flow: S.Struct({ x: S.Finite, y: S.Finite }),
      screen: S.Struct({ x: S.Finite, y: S.Finite }),
    })
  ),
  fitCases: S.Array(
    S.Struct({
      bounds: ViewportBoundsSchema,
      pane: S.Struct({ width: S.Finite, height: S.Finite }),
      limits: ViewportLimitsSchema,
      padding: ViewportPaddingSchema,
      viewport: ViewportSchema,
    })
  ),
})

const readViewportContractFixture = async () => {
  const source = await readFile(
    new URL(
      '../../../research/fixtures/viewport-contract.json',
      import.meta.url
    ),
    'utf-8'
  )

  return S.decodeUnknownSync(ViewportContractFixtureSchema)(JSON.parse(source))
}

const mountScenario = async (page: Page, scenario: Scenario): Promise<void> => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async (kind) => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = globalThis.document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow host')
    }

    let nodes

    if (kind === 'extent') {
      nodes = [{ id: 'a', label: 'Alpha', position: { x: -80, y: -50 } }]
    } else if (kind === 'fit' || kind === 'fit-selected') {
      nodes = [
        { id: 'near', label: 'Near', position: { x: 100, y: 120 } },
        {
          id: 'far',
          label: 'Far',
          position: { x: 1600, y: 300 },
          selected: kind === 'fit-selected',
        },
      ]
    } else {
      nodes = [
        {
          id: 'source',
          label: 'Source',
          position: { x: 80, y: 180 },
          handles: [
            { id: 'out', kind: 'source' as const, side: 'right' as const },
          ],
        },
        {
          id: 'valid',
          label: 'Valid',
          position: { x: 300, y: 180 },
          handles: [
            { id: 'in', kind: 'target' as const, side: 'left' as const },
          ],
        },
        {
          id: 'invalid',
          label: 'Invalid',
          position: { x: 300, y: 205 },
          handles: [
            { id: 'in', kind: 'target' as const, side: 'left' as const },
          ],
        },
      ]
    }

    const controller = mountFlow(
      root,
      { nodes, edges: [] },
      {
        documentMode: kind === 'extent' ? 'controlled' : 'uncontrolled',
        nodeExtent:
          kind === 'extent'
            ? { minX: 0, minY: 0, maxX: 500, maxY: 400 }
            : undefined,
        renderOnlyVisible: kind === 'fit' || kind === 'fit-selected',
        connectionRadius: kind === 'radius' ? 30 : undefined,
        isValidConnection:
          kind === 'radius'
            ? (candidate: CoreModule.FlowConnection) =>
                candidate.target === 'valid'
            : undefined,
        connectOnClick: kind === 'click',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )

    globalThis.flowChanges = []
    controller.subscribe((change: CoreModule.FlowChange) =>
      globalThis.flowChanges?.push(change)
    )
    globalThis.flowController = controller
  }, scenario)
}

const position = (page: Page, nodeId: string) =>
  page.locator(`[data-node-id="${nodeId}"]`).evaluate((element) => {
    const matrix = new DOMMatrixReadOnly(
      globalThis.getComputedStyle(element).transform
    )

    return { x: matrix.m41, y: matrix.m42 }
  })

const centerOf = async (page: Page, selector: string) => {
  const box = await page.locator(selector).boundingBox()

  if (box === null) {
    throw new Error(`Missing bounds for ${selector}`)
  }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test('initial and controlled node positions render inside the measured extent', async ({
  page,
}) => {
  await mountScenario(page, 'extent')
  const node = page.locator('[data-node-id="a"]')
  await expect(node).toHaveAttribute('data-measured-width', '150')
  await expect.poll(() => position(page, 'a')).toStrictEqual({ x: 0, y: 0 })

  await page.evaluate(() =>
    globalThis.flowController?.update({
      nodes: [{ id: 'a', label: 'Alpha', position: { x: 600, y: 600 } }],
      edges: [],
    })
  )
  await expect
    .poll(() => position(page, 'a'))
    .toStrictEqual({
      x: 350,
      y: 356,
    })

  const start = await centerOf(page, '[data-node-id="a"]')
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x - 40, start.y - 40)
  await page.mouse.up()
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toStrictEqual({
      kind: 'node-position',
      nodeId: 'a',
      position: { x: 310, y: 316 },
    })
  await expect
    .poll(() => position(page, 'a'))
    .toStrictEqual({
      x: 350,
      y: 356,
    })
})

test('fitView includes a distant node before culling has measured it', async ({
  page,
}) => {
  await mountScenario(page, 'fit')
  await expect(page.locator('[data-node-id="near"]')).toHaveCount(1)
  await expect(page.locator('[data-node-id="far"]')).toHaveCount(0)

  const fitResult = await page.evaluate(() =>
    globalThis.flowController?.fitView().then((result) => result.status)
  )

  expect(fitResult).toBe('accepted')
  const far = page.locator('[data-node-id="far"]')
  await expect(far).toHaveCount(1)
  await expect(far).toHaveAttribute('data-measured-width', '150')

  const canvas = await page.getByTestId('flow-canvas').boundingBox()
  const bounds = await far.boundingBox()

  if (canvas === null || bounds === null) {
    throw new Error('Missing fitted node bounds')
  }

  expect(bounds.x).toBeGreaterThanOrEqual(canvas.x)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(canvas.x + canvas.width)
})

test('selected-node fit includes a selected node that was culled', async ({
  page,
}) => {
  await mountScenario(page, 'fit-selected')
  await expect(page.locator('[data-node-id="far"]')).toHaveCount(0)

  const fitResult = await page.evaluate(() =>
    globalThis.flowController
      ?.fitView({ nodes: 'selected' })
      .then((result) => result.status)
  )

  expect(fitResult).toBe('accepted')
  const far = page.locator('[data-node-id="far"]')
  await expect(far).toHaveCount(1)
  const canvas = await page.getByTestId('flow-canvas').boundingBox()
  const bounds = await far.boundingBox()

  if (canvas === null || bounds === null) {
    throw new Error('Missing selected node bounds')
  }

  expect(bounds.x).toBeGreaterThan(canvas.x + canvas.width / 4)
  expect(bounds.x + bounds.width).toBeLessThan(
    canvas.x + (canvas.width * 3) / 4
  )
})

const checkConnectionRadiusAtZoom = async (
  page: Page,
  zoom: number
): Promise<void> => {
  await mountScenario(page, 'radius')
  const sourceSelector = '[data-node-id="source"] [data-handle-id="out"]'
  const validSelector = '[data-node-id="valid"] [data-handle-id="in"]'
  const invalidSelector = '[data-node-id="invalid"] [data-handle-id="in"]'

  await page.evaluate(
    (nextZoom) =>
      globalThis.flowController?.updateViewport({
        x: 0,
        y: 0,
        zoom: nextZoom,
      }),
    zoom
  )
  const source = await centerOf(page, sourceSelector)
  const valid = await centerOf(page, validSelector)
  const invalid = await centerOf(page, invalidSelector)
  // Connection radius is measured in client-space CSS pixels, independent of zoom.
  const near = { x: valid.x - 10, y: valid.y }
  const far = { x: valid.x - 34, y: valid.y }

  await page.mouse.move(source.x, source.y)
  await page.mouse.down()
  // Cross the default one-pixel connection drag threshold.
  await page.mouse.move(source.x + 2, source.y)
  await expect(page.getByTestId('flow-connection-preview')).toBeVisible()
  await page.mouse.move(near.x, near.y)
  await expect(page.locator(validSelector)).toHaveClass(/connection-valid/u)
  await page.mouse.move(far.x, far.y)
  await expect(page.locator(validSelector)).not.toHaveClass(/connection-valid/u)
  await page.mouse.move(invalid.x, invalid.y)
  await expect(page.locator(invalidSelector)).toHaveClass(/connection-invalid/u)
  await expect(page.locator(validSelector)).not.toHaveClass(/connection-valid/u)
  await page.mouse.up()
  await expect(page.locator('.flow-edge-group')).toHaveCount(0)
}

test('connection radius and direct hit priority at half zoom', async ({
  page,
}) => {
  await checkConnectionRadiusAtZoom(page, 0.5)
})

test('connection radius and direct hit priority at double zoom', async ({
  page,
}) => {
  await checkConnectionRadiusAtZoom(page, 2)
})

test('pending click status is announced and focus returns on all exits', async ({
  page,
}) => {
  await mountScenario(page, 'click')
  const source = page.locator('[data-node-id="source"] [data-handle-id="out"]')
  const target = page.locator('[data-node-id="valid"] [data-handle-id="in"]')
  const status = page.getByTestId('flow-connection-status')
  await expect(status).toHaveAttribute('role', 'status')
  await expect(status).toHaveAttribute('aria-live', 'polite')

  // Pinned packages/react/src/components/NodeWrapper/index.tsx:207 hides unmeasured nodes before focus is possible.
  await source.waitFor({ state: 'visible' })
  await source.focus()
  await page.keyboard.press('Enter')
  await expect(status).toContainText(/connection|target/iu)
  await page.keyboard.press('Escape')
  await expect(source).toBeFocused()
  await expect(status).toContainText(/cancel/iu)

  await page.keyboard.press('Enter')
  const canvas = page.getByTestId('flow-canvas')
  const canvasBox = await canvas.boundingBox()

  if (canvasBox === null) {
    throw new Error('Missing canvas bounds')
  }

  await page.mouse.click(canvasBox.x + 20, canvasBox.y + 20)
  await expect(source).toBeFocused()
  await expect(status).toContainText(/cancel/iu)

  await page.keyboard.press('Enter')
  await target.click()
  await expect(page.locator('.flow-edge-group')).toHaveCount(1)
  await expect(source).toBeFocused()
  await expect(status).toContainText(/connect/iu)
})

test('viewport operations match the shared coordinate fixture through host offsets and document scroll', async ({
  page,
}) => {
  const fixture = await readViewportContractFixture()
  const [coordinate] = fixture.coordinateCases

  if (coordinate === undefined) {
    throw new Error('Missing coordinate fixture')
  }

  await page.goto('/')
  await page.evaluate(
    async ({ viewport, hostRect }) => {
      const modulePath = '/src/public.ts'
      const { mountFlow } = await import(modulePath)
      const root = globalThis.document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing flow host')
      }

      root.style.position = 'absolute'
      root.style.left = `${hostRect.left}px`
      root.style.top = `${hostRect.top}px`
      root.style.width = '800px'
      root.style.height = '600px'
      globalThis.document.body.style.minHeight = '1200px'
      globalThis.scrollTo(0, 20)
      globalThis.flowController = mountFlow(
        root,
        { nodes: [], edges: [] },
        {
          documentMode: 'uncontrolled',
          viewport: {
            mode: 'uncontrolled',
            initial: viewport,
            limits: { minZoom: 0.25, maxZoom: 4 },
          },
        }
      )
    },
    { viewport: coordinate.viewport, hostRect: coordinate.hostRect }
  )

  const result = await page.evaluate(
    ({ client, hostRect, expectedFlow }) => {
      const controller = globalThis.flowController

      if (controller === undefined) {
        throw new Error('Missing controller')
      }

      const canvas = globalThis.document.querySelector<HTMLElement>(
        '[data-testid="flow-canvas"]'
      )

      if (canvas === null) {
        throw new Error('Missing canvas')
      }

      const rect = canvas.getBoundingClientRect()
      const local = { x: client.x - hostRect.left, y: client.y - hostRect.top }
      const clientPoint = { x: rect.left + local.x, y: rect.top + local.y }

      return {
        rect: { x: rect.left, y: rect.top },
        flow: controller.screenToFlowPosition(clientPoint),
        screen: controller.flowToScreenPosition(expectedFlow),
        clientPoint,
      }
    },
    {
      client: coordinate.client,
      hostRect: coordinate.hostRect,
      expectedFlow: coordinate.flow,
    }
  )

  expect(result.rect.x).toBeGreaterThan(0)
  expect(result.rect.y).toBeGreaterThan(0)
  expect(result.flow.x).toBeCloseTo(coordinate.flow.x, 8)
  expect(result.flow.y).toBeCloseTo(coordinate.flow.y, 8)
  expect(result.screen.x).toBeCloseTo(result.clientPoint.x, 8)
  expect(result.screen.y).toBeCloseTo(result.clientPoint.y, 8)

  const fitResults = await page.evaluate((fitCases) => {
    const controller = globalThis.flowController

    if (controller === undefined) {
      throw new Error('Missing controller')
    }

    return fitCases.map((fit) =>
      controller.getViewportForBounds(fit.bounds, { padding: fit.padding })
    )
  }, fixture.fitCases)

  expect(fitResults).toHaveLength(fixture.fitCases.length)

  for (const [index, fit] of fixture.fitCases.entries()) {
    expect(fitResults[index]).toEqual(fit.viewport)
  }

  const zoomResult = await page.evaluate(() => {
    const controller = globalThis.flowController

    if (controller === undefined) {
      throw new Error('Missing controller')
    }

    return controller.zoomTo(0.73)
  })

  expect(zoomResult.status).toBe('accepted')
  expect(zoomResult.viewport.zoom).toBe(0.73)
})

test('programmatic viewport animations observe lifecycle and settle replaced and disposed requests', async ({
  page,
}) => {
  await mountScenario(page, 'extent')

  const results = await page.evaluate(async () => {
    const controller = globalThis.flowController

    if (controller === undefined) {
      throw new Error('Missing controller')
    }

    const events: string[] = []
    controller.subscribeViewport((event) => events.push(event.kind))

    const animated = await controller.setViewport(
      { x: -5, y: -10, zoom: 1.2 },
      { duration: 80, easing: 'linear' }
    )

    const animatedChanges = events.filter((kind) => kind === 'change').length

    const replaced = controller.setViewport(
      { x: -10, y: -20, zoom: 1.4 },
      { duration: 180, easing: 'linear' }
    )

    const accepted = controller.setViewport({ x: -30, y: -40, zoom: 1.6 })

    const [replacedResult, acceptedResult] = await Promise.all([
      replaced,
      accepted,
    ])

    const disposed = controller.setViewport(
      { x: -50, y: -60, zoom: 1.8 },
      { duration: 180 }
    )

    controller.destroy()
    const disposedResult = await disposed

    return {
      animated: animated.status,
      animatedChanges,
      replaced: replacedResult.status,
      accepted: acceptedResult.status,
      disposed: disposedResult.status,
      events,
    }
  })

  expect(results.animated).toBe('accepted')
  expect(results.animatedChanges).toBeGreaterThan(1)
  expect(results.replaced).toBe('superseded')
  expect(results.accepted).toBe('accepted')
  expect(results.disposed).toBe('disposed')
  expect(results.events).toContain('start')
  expect(results.events).toContain('change')
  expect(results.events).toContain('end')
})

test('controlled viewport operations return a proposal without changing accepted viewport', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = globalThis.document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow host')
    }

    globalThis.flowController = mountFlow(
      root,
      { nodes: [], edges: [] },
      {
        documentMode: 'uncontrolled',
        viewport: {
          mode: 'controlled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )
  })

  const result = await page.evaluate(async () => {
    const controller = globalThis.flowController

    if (controller === undefined) {
      throw new Error('Missing controller')
    }

    const proposal = await controller.setViewport({ x: 10, y: 20, zoom: 1.5 })

    return {
      status: proposal.status,
      proposal: proposal.viewport,
      accepted: controller.getViewport(),
    }
  })

  expect(result.status).toBe('proposed')
  expect(result.proposal).toStrictEqual({ x: 10, y: 20, zoom: 1.5 })
  expect(result.accepted).toStrictEqual({ x: 0, y: 0, zoom: 1 })
})

test('reduced motion completes viewport animations without waiting for the requested duration', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mountScenario(page, 'extent')

  const result = await page.evaluate(async () => {
    const controller = globalThis.flowController

    if (controller === undefined) {
      throw new Error('Missing controller')
    }

    const startedAt = performance.now()

    const operation = await controller.setViewport(
      { x: -10, y: -20, zoom: 1.5 },
      { duration: 1000 }
    )

    return { status: operation.status, elapsed: performance.now() - startedAt }
  })

  expect(result.status).toBe('accepted')
  expect(result.elapsed).toBeLessThan(250)
})
