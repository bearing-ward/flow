import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import type {
  HardeningFixture,
  HardeningFixtureOptions,
} from '../src/host-hardening-fixture.ts'

declare global {
  var hardeningFixture: HardeningFixture | undefined
}

const mount = async (page: Page, options: HardeningFixtureOptions) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async (fixtureOptions) => {
    const modulePath = '/src/host-hardening-fixture.ts'
    const { mountHardeningFixture } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing host')
    }

    globalThis.hardeningFixture = mountHardeningFixture(root, fixtureOptions)
  }, options)
}

const node = (page: Page, nodeId: string) =>
  page.locator(`.flow-node[data-node-id="${nodeId}"]`)

const centre = async (locator: Locator) => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Expected a rendered element')
  }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const edgeClicks = (page: Page) =>
  page.evaluate(() => globalThis.hardeningFixture?.edgeClicks ?? [])

const edgeEnters = (page: Page) =>
  page.evaluate(() => globalThis.hardeningFixture?.edgeEnters ?? [])

/** The size `getInternalNode` reports, the measured size React Flow uses. */
const measuredSize = (page: Page, nodeId: string) =>
  page.evaluate((id) => {
    const internal = globalThis.hardeningFixture?.controller.getInternalNode(id)

    return { width: internal?.width, height: internal?.height }
  }, nodeId)

const callerNode = (page: Page, nodeId: string) =>
  page.evaluate(
    (id) =>
      globalThis.hardeningFixture
        ?.callerNodes()
        .find((candidate) => candidate.id === id),
    nodeId
  )

const nodeClicks = (page: Page) =>
  page.evaluate(() => globalThis.hardeningFixture?.nodeClicks ?? [])

const dimensionChanges = (page: Page) =>
  page.evaluate(() =>
    (globalThis.hardeningFixture?.nodeChanges ?? [])
      .flat()
      .filter((change) => change.type === 'dimensions')
  )

const dimensionChangesOf = async (page: Page, nodeId: string) => {
  const changes = await dimensionChanges(page)

  return changes.filter(({ id }) => id === nodeId)
}

const dimensionIds = async (page: Page) => {
  const changes = await dimensionChanges(page)

  return changes.map(({ id }) => id).toSorted()
}

/** Screen point at a fraction of the drawn floating path. */
const floatingPoint = (page: Page, fraction: number) =>
  page.evaluate((at) => {
    const path = document.querySelector('[data-testid="floating-path"]')

    if (!(path instanceof SVGPathElement)) {
      throw new Error('Missing floating path')
    }

    const matrix = path.getScreenCTM()

    if (matrix === null) {
      throw new Error('Floating path has no screen matrix')
    }

    const point = path.getPointAtLength(path.getTotalLength() * at)

    return new DOMPoint(point.x, point.y).matrixTransform(matrix)
  }, fraction)

const rightResize = (page: Page, nodeId: string) =>
  node(page, nodeId).locator('.flow-node-resize-handle[data-direction="right"]')

const widthOf = async (page: Page, nodeId: string) => {
  const box = await node(page, nodeId).boundingBox()

  return box?.width ?? 0
}

/** Real mouse resize from the right control, paused so the observer measures mid-gesture. */
const pointerResize = async (page: Page, nodeId: string, dx: number) => {
  const grip = await centre(rightResize(page, nodeId))
  await page.mouse.move(grip.x, grip.y)
  await page.mouse.down()
  await page.mouse.move(grip.x + 3, grip.y)
  await page.mouse.move(grip.x + dx / 2, grip.y, { steps: 3 })
  await expect(node(page, nodeId)).toHaveClass(/resizing/u)
  await page.waitForTimeout(150)
  await page.mouse.move(grip.x + dx, grip.y, { steps: 3 })
  await expect(node(page, nodeId)).toHaveClass(/resizing/u)
  await page.mouse.up()
}

test.describe('Vanilla host hardening', () => {
  test('onNodeClick fires on the first click that selects a node', async ({
    page,
  }) => {
    await mount(page, { documentMode: 'uncontrolled' })
    const alpha = node(page, 'a')
    await expect(alpha).not.toHaveClass(/selected/u)

    await alpha.locator('.flow-node-content').click()
    await expect(alpha).toHaveClass(/selected/u)
    await expect.poll(() => nodeClicks(page)).toEqual(['a'])

    await alpha.locator('.flow-node-content').click()
    await node(page, 'b').locator('.flow-node-content').click()
    await expect.poll(() => nodeClicks(page)).toEqual(['a', 'a', 'b'])
  })

  test('onNodesChange reports measured sizes as dimensions changes', async ({
    page,
  }) => {
    await mount(page, { documentMode: 'controlled' })

    await expect.poll(() => dimensionIds(page)).toEqual(['a', 'b'])

    const size = await measuredSize(page, 'a')
    const box = await node(page, 'a').boundingBox()

    expect(Math.abs((size.width ?? 0) - (box?.width ?? 0))).toBeLessThan(1)

    const [first] = await dimensionChangesOf(page, 'a')

    expect(first).toEqual({
      id: 'a',
      type: 'dimensions',
      dimensions: size,
    })
    // The controlled caller's applyNodeChanges stores the measured size.
    await expect
      .poll(() => callerNode(page, 'a'))
      .toMatchObject({ measured: size })

    // A wider label is a new measured size and one more dimensions change.
    await page.evaluate(() =>
      globalThis.hardeningFixture?.controller.updateNode('a', {
        label: 'Alpha with a much longer label',
      })
    )
    await expect
      .poll(async () => {
        const changes = await dimensionChangesOf(page, 'a')

        return changes.length
      })
      .toBe(2)

    const changesOfA = await dimensionChangesOf(page, 'a')
    const grown = changesOfA.at(-1)

    expect(grown?.dimensions).toEqual(await measuredSize(page, 'a'))
    expect(grown?.dimensions?.width).toBeGreaterThan(size.width ?? 0)
    // Unchanged sizes are not reported again.
    expect(await dimensionChangesOf(page, 'b')).toHaveLength(1)
  })

  for (const floating of ['base-edge', 'returned'] as const) {
    test(`floating edge (${floating}) hit testing follows the drawn path`, async ({
      page,
    }) => {
      await mount(page, { documentMode: 'uncontrolled', floating })
      const hit = page.locator('[data-edge-id="e"] .flow-edge-hit')
      const drawn = page.getByTestId('floating-path')
      await expect(drawn).toHaveCount(1)
      await expect
        .poll(() => hit.getAttribute('d'))
        .toBe(await drawn.getAttribute('d'))

      // The handle route bulges right of both nodes; nothing is drawn there.
      const right = await node(page, 'a').boundingBox()

      const bulge = {
        x: (right?.x ?? 0) + (right?.width ?? 0) + 60,
        y: 260,
      }

      await page.mouse.click(bulge.x, bulge.y)
      expect(await edgeClicks(page)).toEqual([])

      const point = await floatingPoint(page, 0.5)
      await page.mouse.move(point.x, point.y)
      await expect.poll(() => edgeEnters(page)).toEqual(['e'])
      await page.mouse.click(point.x, point.y)
      await expect.poll(() => edgeClicks(page)).toEqual(['e'])
      await expect(
        page.locator('[data-edge-id="e"].flow-edge-group')
      ).toHaveClass(/selected/u)
    })
  }

  test('an interactionPath that throws reports onError and keeps the handle route', async ({
    page,
  }) => {
    await mount(page, { documentMode: 'uncontrolled', floating: 'throwing' })
    const hit = page.locator('[data-edge-id="e"] .flow-edge-hit')
    const route = page.locator('[data-edge-id="e"] .flow-edge-path')
    await expect(page.getByTestId('floating-path')).toHaveCount(1)
    await expect.poll(() => hit.getAttribute('d')).not.toBeNull()
    expect(await hit.getAttribute('d')).toBe(await route.getAttribute('d'))
    await expect
      .poll(() =>
        page.evaluate(() => globalThis.hardeningFixture?.errors ?? [])
      )
      .toContain('interaction path failed')
    await expect(node(page, 'b')).toBeVisible()
  })

  test('resize controls are opt-in, and a selected node keeps its right handle usable', async ({
    page,
  }) => {
    await mount(page, { documentMode: 'uncontrolled' })
    await node(page, 'a').locator('.flow-node-content').click()
    await expect(node(page, 'a')).toHaveClass(/selected/u)
    await expect(page.locator('.flow-node-resize-handle')).toHaveCount(0)

    await mount(page, { documentMode: 'uncontrolled', nodesResizable: true })
    const alpha = node(page, 'a')
    await alpha.locator('.flow-node-content').click()
    await expect(alpha).toHaveClass(/selected/u)
    await expect(alpha.locator('.flow-node-resize-handle')).toHaveCount(8)

    const handle = alpha.locator('.flow-handle[data-handle-id="out"]')
    const start = await centre(handle)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 3, start.y + 3)
    await page.mouse.move(start.x + 60, start.y + 40, { steps: 4 })
    await expect(page.locator('.flow-connection-preview')).toHaveCount(1)
    await page.mouse.up()
    await expect(alpha).not.toHaveClass(/resizing/u)

    // The right resize control moved clear of the handle and still resizes.
    const grip = await centre(rightResize(page, 'a'))

    expect(Math.abs(grip.x - start.x)).toBeGreaterThanOrEqual(12)

    const before = await widthOf(page, 'a')
    await pointerResize(page, 'a', 30)
    await expect.poll(() => widthOf(page, 'a')).toBeGreaterThan(before + 20)
  })

  test('controlled pointer and keyboard resizes complete while every change is applied', async ({
    page,
  }) => {
    await mount(page, { documentMode: 'controlled', nodesResizable: true })
    await expect.poll(() => dimensionIds(page)).toEqual(['a', 'b'])
    await node(page, 'a').locator('.flow-node-content').click()
    await expect(node(page, 'a')).toHaveClass(/selected/u)

    const initial = await widthOf(page, 'a')
    await pointerResize(page, 'a', 60)
    await expect.poll(() => widthOf(page, 'a')).toBeGreaterThan(initial + 50)
    await expect(node(page, 'a')).not.toHaveClass(/resizing/u)

    // The measured size of the committed resize still arrives afterwards.
    await expect
      .poll(async () => {
        const changes = await dimensionChangesOf(page, 'a')
        const last = changes.at(-1)

        return last?.dimensions?.width ?? 0
      })
      .toBeGreaterThan(initial + 50)

    const afterPointer = await widthOf(page, 'a')
    const control = rightResize(page, 'a')
    await control.focus()
    await page.keyboard.down('ArrowRight')
    await expect(node(page, 'a')).toHaveClass(/resizing/u)
    // Let the observer measure the keyboard preview before the keyup.
    await page.waitForTimeout(150)
    await expect(node(page, 'a')).toHaveClass(/resizing/u)
    await page.keyboard.up('ArrowRight')
    await expect(node(page, 'a')).not.toHaveClass(/resizing/u)
    await expect.poll(() => widthOf(page, 'a')).toBeGreaterThan(afterPointer)
  })

  test('drags, resizes and handle connections do not report onNodeClick', async ({
    page,
  }) => {
    await mount(page, { documentMode: 'uncontrolled', nodesResizable: true })
    const alpha = node(page, 'a')
    await alpha.locator('.flow-node-content').click()
    await expect.poll(() => nodeClicks(page)).toEqual(['a'])

    // Node drag.
    const body = await centre(alpha.locator('.flow-node-content'))
    await page.mouse.move(body.x, body.y)
    await page.mouse.down()
    await page.mouse.move(body.x + 3, body.y + 3)
    await page.mouse.move(body.x + 40, body.y + 20, { steps: 4 })
    await page.mouse.up()

    // Resize from the bottom-right corner.
    const corner = await centre(
      alpha.locator('.flow-node-resize-handle[data-direction="bottom-right"]')
    )

    await page.mouse.move(corner.x, corner.y)
    await page.mouse.down()
    await page.mouse.move(corner.x + 3, corner.y + 3)
    await page.mouse.move(corner.x + 30, corner.y + 20, { steps: 3 })
    await page.mouse.up()

    // Connection drag from a's handle onto b's handle.
    const from = await centre(
      alpha.locator('.flow-handle[data-handle-id="out"]')
    )

    const to = await centre(
      node(page, 'b').locator('.flow-handle[data-handle-id="in"]')
    )

    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(from.x + 3, from.y + 3)
    await page.mouse.move(to.x, to.y, { steps: 6 })
    await page.mouse.up()

    await page.waitForTimeout(100)
    expect(await nodeClicks(page)).toEqual(['a'])

    // A plain click still reports.
    await node(page, 'b').locator('.flow-node-content').click()
    await expect.poll(() => nodeClicks(page)).toEqual(['a', 'b'])
  })
})
