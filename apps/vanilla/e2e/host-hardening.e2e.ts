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

  test('a selected node keeps its right handle usable and resize controls are opt-out', async ({
    page,
  }) => {
    await mount(page, { documentMode: 'uncontrolled' })
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
    const resize = alpha.locator(
      '.flow-node-resize-handle[data-direction="right"]'
    )

    const before = await alpha.boundingBox()
    const grip = await centre(resize)

    expect(Math.abs(grip.x - start.x)).toBeGreaterThanOrEqual(12)
    await page.mouse.move(grip.x, grip.y)
    await page.mouse.down()
    await page.mouse.move(grip.x + 3, grip.y)
    await page.mouse.move(grip.x + 30, grip.y, { steps: 3 })
    await expect(alpha).toHaveClass(/resizing/u)
    await page.mouse.up()
    await expect
      .poll(async () => {
        const after = await alpha.boundingBox()

        return (after?.width ?? 0) - (before?.width ?? 0)
      })
      .toBeGreaterThan(20)

    await mount(page, {
      documentMode: 'uncontrolled',
      nodeResizeControls: false,
    })
    await node(page, 'a').locator('.flow-node-content').click()
    await expect(node(page, 'a')).toHaveClass(/selected/u)
    await expect(page.locator('.flow-node-resize-handle')).toHaveCount(0)
  })
})
