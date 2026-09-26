import type * as CoreModule from '@flow/core'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

type Scenario = 'extent' | 'fit' | 'fit-selected' | 'radius' | 'click'

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

  await expect
    .poll(() => page.evaluate(() => globalThis.flowController?.fitView()))
    .toBe(true)
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
  await expect
    .poll(() =>
      page.evaluate(() =>
        globalThis.flowController?.fitView({ nodes: 'selected' })
      )
    )
    .toBe(true)
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
  const near = { x: valid.x - 10 * zoom, y: valid.y }
  const far = { x: valid.x - 34 * zoom, y: valid.y }

  await page.mouse.move(source.x, source.y)
  await page.mouse.down()
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
