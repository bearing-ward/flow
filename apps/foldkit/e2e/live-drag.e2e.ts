import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import type { FoldkitLiveDragFixture } from './live-drag-fixture.ts'

declare global {
  interface Window {
    __flowFoldkitLiveDrag?: FoldkitLiveDragFixture
  }
}

interface Point {
  readonly x: number
  readonly y: number
}

const mount = async (page: Page, nodesResizable = false) => {
  await page.goto('/test.html')
  await page.evaluate(async (resizable) => {
    const modulePath = '/e2e/live-drag-fixture.ts'
    const { mountFoldkitLiveDragFixture } = await import(modulePath)
    const host = document.querySelector<HTMLElement>('#app')

    if (host === null) {
      throw new Error('Missing Foldkit fixture host')
    }

    host.innerHTML = '<div id="live-drag-fixture"></div>'

    const container = document.querySelector<HTMLElement>('#live-drag-fixture')

    if (container === null) {
      throw new Error('Missing Foldkit live drag container')
    }

    window.__flowFoldkitLiveDrag = mountFoldkitLiveDragFixture(container, {
      nodesResizable: resizable,
    })
  }, nodesResizable)
  await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(3)
}

const nodeLocator = (page: Page, nodeId: string) =>
  page.locator(`.flow-foldkit-node[data-node-id="${nodeId}"]`)

const nodeBox = async (page: Page, nodeId: string) => {
  const box = await nodeLocator(page, nodeId).boundingBox()

  if (box === null) {
    throw new Error(`Node ${nodeId} is not rendered`)
  }

  return box
}

const centre = async (page: Page, nodeId: string): Promise<Point> => {
  const box = await nodeBox(page, nodeId)

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** A screen point along an SVG path, through its screen CTM. */
const pointAt = (path: Locator, fraction: number): Promise<Point> =>
  path.evaluate((element, at) => {
    if (!(element instanceof SVGPathElement)) {
      throw new Error('Expected an SVG path')
    }

    const matrix = element.getScreenCTM()

    if (matrix === null) {
      throw new Error('Path has no screen matrix')
    }

    const point = element.getPointAtLength(element.getTotalLength() * at)
    const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix)

    return { x: screen.x, y: screen.y }
  }, fraction)

const builtInPath = (page: Page) =>
  page.locator('[data-edge-id="built-in"] .flow-foldkit-edge-path')

const floatingPath = (page: Page) => page.getByTestId('floating-path')

const events = (page: Page) =>
  page.evaluate(() => window.__flowFoldkitLiveDrag?.events() ?? [])

const lastEvent = async (page: Page, name: string) => {
  const all = await events(page)

  return all.findLast((event) => event.name === name)
}

const lastField = async <K extends 'nodeIds' | 'edgeId'>(
  page: Page,
  name: string,
  field: K
) => {
  const event = await lastEvent(page, name)

  return event?.[field]
}

const selection = (page: Page) =>
  lastField(page, 'onSelectionChange', 'nodeIds')

/** Node element changes of one type, flattened in publication order. */
const nodeChanges = async (page: Page, type: 'dimensions' | 'position') => {
  const deltas = await page.evaluate(
    () => window.__flowFoldkitLiveDrag?.deltas() ?? []
  )

  return deltas
    .flatMap(({ nodes }) => nodes)
    .filter((change) => change.type === type)
}

const nodeEdge = async (page: Page, nodeId: string, axis: 'x' | 'y') => {
  const box = await nodeBox(page, nodeId)

  return box[axis]
}

const expectNear = (actual: Point, expected: Point, tolerance = 1.5) => {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(tolerance)
}

const clickAt = (page: Page, point: Point) => page.mouse.click(point.x, point.y)

/** Press, cross the 1px threshold by 3px, then travel; the caller releases. */
const pressAndMove = async (page: Page, from: Point, to: Point) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y)
  await page.mouse.move(to.x, to.y, { steps: 6 })
}

test('Foldkit nodes, built-in edges and floating custom edges follow a live drag', async ({
  page,
}) => {
  await mount(page)

  // Each node's first measurement arrives as a React Flow dimensions change.
  await expect
    .poll(async () => {
      const changes = await nodeChanges(page, 'dimensions')

      return changes
        .map((change) => ('id' in change ? change.id : ''))
        .toSorted()
    })
    .toEqual(['a', 'b', 'c'])

  const before = await nodeBox(page, 'a')
  const builtInStart = await pointAt(builtInPath(page), 0)
  const floatingStart = await pointAt(floatingPath(page), 0)
  const from = await centre(page, 'a')
  const delta = { x: 120, y: 90 }

  await pressAndMove(page, from, { x: from.x + delta.x, y: from.y + delta.y })

  // Mid-drag, before release: the node and both edges follow the pointer.
  await expect
    .poll(() => nodeEdge(page, 'a', 'x'))
    .toBeCloseTo(before.x + delta.x, 0)
  expectNear(await nodeBox(page, 'a'), {
    x: before.x + delta.x,
    y: before.y + delta.y,
  })
  expectNear(await pointAt(builtInPath(page), 0), {
    x: builtInStart.x + delta.x,
    y: builtInStart.y + delta.y,
  })

  const movedFloating = await pointAt(floatingPath(page), 0)
  const moved = await nodeBox(page, 'a')

  expect(movedFloating).not.toEqual(floatingStart)
  // The floating start stays on the moved node's border.
  expect(movedFloating.x).toBeGreaterThanOrEqual(moved.x - 2)
  expect(movedFloating.x).toBeLessThanOrEqual(moved.x + moved.width + 2)
  expect(movedFloating.y).toBeGreaterThanOrEqual(moved.y - 2)
  expect(movedFloating.y).toBeLessThanOrEqual(moved.y + moved.height + 2)

  await expect(nodeLocator(page, 'a')).toHaveClass(/dragging/u)
  await expect(
    nodeLocator(page, 'a').locator('[data-dragging]')
  ).toHaveAttribute('data-dragging', 'true')
  await expect(
    nodeLocator(page, 'b').locator('[data-dragging]')
  ).toHaveAttribute('data-dragging', 'false')

  // Snapshot reads and node bounds report the live position mid-drag.
  const snapshot = await page.evaluate(() =>
    window.__flowFoldkitLiveDrag?.snapshotNode('a')
  )

  expect(snapshot).toEqual({
    position: { x: 60 + delta.x, y: 60 + delta.y },
    bounds: { x: 60 + delta.x, y: 60 + delta.y },
  })

  expect(await lastEvent(page, 'onNodeDrag')).toMatchObject({
    nodeId: 'a',
    nodeIds: ['a'],
    position: { x: 60 + delta.x, y: 60 + delta.y },
    positionAbsolute: { x: 60 + delta.x, y: 60 + delta.y },
  })
  expect(await lastEvent(page, 'onNodeDragStart')).toMatchObject({
    nodeId: 'a',
    position: { x: 60, y: 60 },
  })

  await page.mouse.up()
  await expect(nodeLocator(page, 'a')).not.toHaveClass(/dragging/u)
  expectNear(await nodeBox(page, 'a'), {
    x: before.x + delta.x,
    y: before.y + delta.y,
  })
  expect(await lastEvent(page, 'onNodeDragStop')).toMatchObject({
    nodeId: 'a',
    outcome: 'accepted',
    position: { x: 60 + delta.x, y: 60 + delta.y },
  })
  // The click that ends the drag does not select the dragged node.
  expect(await lastEvent(page, 'onSelectionChange')).toBeUndefined()
})

test('Foldkit clicks select nodes, Meta toggles, and selected nodes drag together', async ({
  page,
}) => {
  await mount(page)

  await clickAt(page, await centre(page, 'c'))
  await expect.poll(() => selection(page)).toEqual(['c'])

  await page.keyboard.down('Meta')
  await clickAt(page, await centre(page, 'b'))
  await page.keyboard.up('Meta')
  await expect.poll(() => selection(page)).toEqual(['b', 'c'])

  const beforeB = await nodeBox(page, 'b')
  const beforeC = await nodeBox(page, 'c')
  const beforeA = await nodeBox(page, 'a')
  const from = await centre(page, 'b')
  const delta = { x: -60, y: 70 }

  await pressAndMove(page, from, { x: from.x + delta.x, y: from.y + delta.y })

  // Both selected nodes move live; the unselected node stays.
  await expect
    .poll(() => nodeEdge(page, 'c', 'y'))
    .toBeCloseTo(beforeC.y + delta.y, 0)
  expectNear(await nodeBox(page, 'b'), {
    x: beforeB.x + delta.x,
    y: beforeB.y + delta.y,
  })
  expectNear(await nodeBox(page, 'a'), beforeA)
  await expect(nodeLocator(page, 'c')).toHaveClass(/dragging/u)

  expect(await lastEvent(page, 'onSelectionDragMove')).toMatchObject({
    nodeId: 'b',
    nodeIds: ['b', 'c'],
    nodePositions: [
      { nodeId: 'b', position: { x: 420 + delta.x, y: 60 + delta.y } },
      { nodeId: 'c', position: { x: 60 + delta.x, y: 420 + delta.y } },
    ],
  })

  await page.mouse.up()
  await expect
    .poll(() => lastField(page, 'onSelectionDragStop', 'nodeIds'))
    .toEqual(['b', 'c'])
  expect(await lastEvent(page, 'onSelectionDragStart')).toMatchObject({
    nodeIds: ['b', 'c'],
  })

  const positions = await nodeChanges(page, 'position')

  expect(positions).toEqual([
    expect.objectContaining({
      id: 'b',
      position: { x: 420 + delta.x, y: 60 + delta.y },
    }),
    expect.objectContaining({
      id: 'c',
      position: { x: 60 + delta.x, y: 420 + delta.y },
    }),
  ])
  expectNear(await nodeBox(page, 'c'), {
    x: beforeC.x + delta.x,
    y: beforeC.y + delta.y,
  })

  // A plain click selects only the clicked node again.
  await clickAt(page, await centre(page, 'a'))
  await expect.poll(() => selection(page)).toEqual(['a'])
})

test('Foldkit custom edges hit-test along the path they report', async ({
  page,
}) => {
  await mount(page)

  const onFloating = await pointAt(floatingPath(page), 0.25)

  // The handle-based route the hit target used to follow: a's source handle
  // to c's target handle, a quarter of the way along.
  const handleCentre = async (nodeId: string, handleId: string) => {
    const box = await nodeLocator(page, nodeId)
      .locator(`[data-handle-id="${handleId}"]`)
      .boundingBox()

    if (box === null) {
      throw new Error('Missing handle')
    }

    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }

  const out = await handleCentre('a', 'out')
  const into = await handleCentre('c', 'in')

  const onRoute = {
    x: out.x + (into.x - out.x) * 0.25,
    y: out.y + (into.y - out.y) * 0.25,
  }

  const edgeAt = (point: Point) =>
    page.evaluate(
      ({ x, y }) =>
        document.elementFromPoint(x, y)?.closest<SVGElement>('[data-edge-id]')
          ?.dataset.edgeId ?? null,
      point
    )

  expect(
    Math.hypot(onRoute.x - onFloating.x, onRoute.y - onFloating.y)
  ).toBeGreaterThan(20)
  expect(await edgeAt(onFloating)).toBe('floating')
  expect(await edgeAt(onRoute)).toBeNull()

  await page.mouse.click(onFloating.x, onFloating.y)
  await expect
    .poll(() => lastField(page, 'onEdgeClick', 'edgeId'))
    .toBe('floating')
})

test('Foldkit shows resize controls only with nodesResizable, below the handles', async ({
  page,
}) => {
  await mount(page)
  await clickAt(page, await centre(page, 'c'))
  await expect.poll(() => selection(page)).toEqual(['c'])
  // Off by default, as React Flow shows resize controls only with a NodeResizer.
  await expect(
    nodeLocator(page, 'c').locator('.flow-foldkit-resize')
  ).toHaveCount(0)

  await mount(page, true)
  await clickAt(page, await centre(page, 'c'))
  await expect(
    nodeLocator(page, 'c').locator('.flow-foldkit-resize')
  ).toHaveCount(8)

  // The source handle on the selected node stays on top and connectable.
  const handleCentre = async (nodeId: string, handleId: string) => {
    const box = await nodeLocator(page, nodeId)
      .locator(`[data-handle-id="${handleId}"]`)
      .boundingBox()

    if (box === null) {
      throw new Error('Missing handle')
    }

    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }

  const out = await handleCentre('c', 'out')
  const into = await handleCentre('b', 'in')

  const topHandle = await page.evaluate(
    ({ x, y }) =>
      document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-handle-id]')
        ?.dataset.handleId ?? null,
    out
  )

  expect(topHandle).toBe('out')

  await pressAndMove(page, out, into)
  await page.mouse.up()
  await expect(page.locator('[data-testid="flow-edge"]')).toHaveCount(3)
})
