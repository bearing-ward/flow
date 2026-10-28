import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import { browserFrames } from '../../shared-e2e/browser-frames.ts'
import type {
  VueHardeningFixture,
  VueHardeningOptions,
} from '../src/host-hardening-test.ts'

interface Point {
  readonly x: number
  readonly y: number
}

const boxOf = async (locator: Locator) => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Expected a rendered element')
  }

  return box
}

const centreOf = async (locator: Locator): Promise<Point> => {
  const box = await boxOf(locator)

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const node = (page: Page, nodeId: string) =>
  page.locator(`.flow-vue-node[data-node-id="${nodeId}"]`)

const handle = (page: Page, nodeId: string, handleId: string) =>
  page.locator(`[data-node-id="${nodeId}"] [data-handle-id="${handleId}"]`)

const edgeHit = (page: Page, edgeId: string) =>
  page.locator(`[data-flow-edge-hit="${edgeId}"]`)

/** Run a reader against the mounted fixture API inside the page. */
const fixture = async <Result>(
  page: Page,
  read: (api: VueHardeningFixture) => Result
): Promise<Awaited<Result>> =>
  // SAFETY: the reader runs in the page against the fixture it is typed for.
  (await page.evaluate(
    `(${read.toString()})(window.__flowVueHardening)`
  )) as Awaited<Result>

const selectedIds = (page: Page) =>
  fixture(page, (api) => ({
    nodes: api
      .nodes()
      .filter(({ selected }) => selected === true)
      .map(({ id }) => id),
    edges: api
      .flow()
      .edges.value.filter(({ selected }) => selected === true)
      .map(({ id }) => id),
  }))

/** The first point of an SVG path. */
const pathStart = async (locator: Locator): Promise<Point> => {
  const d = (await locator.getAttribute('d')) ?? ''

  const [x = Number.NaN, y = Number.NaN] = (d.match(/-?\d+(?:\.\d+)?/gu) ?? [])
    .slice(0, 2)
    .map(Number)

  return { x, y }
}

const mount = async (page: Page, options: VueHardeningOptions = {}) => {
  await page.goto('/test.html')
  await page.evaluate(async (mountOptions) => {
    const { mountVueHardeningFixture } =
      await import('../src/host-hardening-test.ts')

    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Vue hardening fixture mount point is missing')
    }

    mountVueHardeningFixture(root, mountOptions)
  }, options)

  if (options.scene === 'nested') {
    await expect(node(page, 'k')).toBeVisible()
  } else {
    await expect(node(page, 'a')).toBeVisible()
    await expect(edgeHit(page, 'e-cd')).toHaveCount(1)
  }
}

test('a click selects a node and the multi-selection key toggles it', async ({
  page,
}) => {
  await mount(page)

  await node(page, 'a').click()
  await expect
    .poll(() => selectedIds(page))
    .toEqual({ nodes: ['a'], edges: [] })

  await node(page, 'b').click()
  await expect
    .poll(() => selectedIds(page))
    .toEqual({ nodes: ['b'], edges: [] })

  await node(page, 'c').click({ modifiers: ['Meta'] })
  await expect
    .poll(() => selectedIds(page))
    .toEqual({ nodes: ['b', 'c'], edges: [] })

  await node(page, 'b').click({ modifiers: ['Meta'] })
  await expect
    .poll(() => selectedIds(page))
    .toEqual({ nodes: ['c'], edges: [] })

  // Shift is the selection-rectangle key, not a multi-selection key.
  await node(page, 'a').click({ modifiers: ['Shift'] })
  await expect
    .poll(() => selectedIds(page))
    .toEqual({ nodes: ['a'], edges: [] })

  // An edge click selects the edge alone; the multi-selection key adds a node.
  // The a-to-b route is a horizontal line, so click its midpoint directly.
  const a = await boxOf(node(page, 'a'))
  const b = await boxOf(node(page, 'b'))

  await page.mouse.click((a.x + a.width + b.x) / 2, a.y + a.height / 2)
  await expect
    .poll(() => selectedIds(page))
    .toEqual({ nodes: [], edges: ['e-ab'] })
  await node(page, 'd').click({ modifiers: ['Meta'] })
  await expect
    .poll(() => selectedIds(page))
    .toEqual({ nodes: ['d'], edges: ['e-ab'] })

  // A drag past the threshold is not a click.
  const bCentre = await centreOf(node(page, 'b'))
  await page.mouse.move(bCentre.x, bCentre.y)
  await page.mouse.down()
  await page.mouse.move(bCentre.x + 3, bCentre.y + 3)
  await page.mouse.move(bCentre.x + 30, bCentre.y + 10, { steps: 4 })
  await page.mouse.up()
  await expect
    .poll(() => fixture(page, (api) => api.flow().getNode('b')?.position))
    .toEqual({ x: 450, y: 90 })
  expect(await selectedIds(page)).toEqual({ nodes: ['d'], edges: ['e-ab'] })
})

test('edges, custom edge props and dragging follow a node every frame', async ({
  page,
}) => {
  await mount(page)

  const builtIn = page.locator('g[data-edge-id="e-ab"] .flow-vue-edge-path')
  const floating = page.getByTestId('floating-probe-path')
  const startBuiltIn = await pathStart(builtIn)

  const floatingNodeX = Number(
    await floating.getAttribute('data-source-node-x')
  )

  const floatingSourceX = Number(await floating.getAttribute('data-source-x'))
  const floatingPath = await floating.getAttribute('d')

  const from = await centreOf(node(page, 'a'))
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move(from.x + 60, from.y + 40, { steps: 6 })

  // Mid-drag: the pointer is still down.
  await expect
    .poll(async () => {
      const start = await pathStart(builtIn)

      return [start.x - startBuiltIn.x, start.y - startBuiltIn.y]
    })
    .toEqual([60, 40])
  await expect(floating).toHaveAttribute(
    'data-source-node-x',
    String(floatingNodeX + 60)
  )
  await expect(floating).toHaveAttribute(
    'data-source-x',
    String(floatingSourceX + 60)
  )
  expect(await floating.getAttribute('d')).not.toBe(floatingPath)
  await expect(page.getByTestId('probe-a')).toHaveAttribute(
    'data-dragging',
    'true'
  )
  await expect(page.getByTestId('probe-b')).toHaveAttribute(
    'data-dragging',
    'false'
  )
  await expect(edgeHit(page, 'e-ac')).toHaveAttribute(
    'd',
    (await floating.getAttribute('d')) ?? ''
  )

  await page.mouse.up()
  await expect
    .poll(() => fixture(page, (api) => api.flow().getNode('a')?.position))
    .toEqual({ x: 140, y: 120 })
  await expect(page.getByTestId('probe-a')).toHaveAttribute(
    'data-dragging',
    'false'
  )
})

test('a selected node drags the whole selection with selection drag events', async ({
  page,
}) => {
  await mount(page)

  await node(page, 'a').click()
  await node(page, 'c').click({ modifiers: ['Meta'] })
  await expect
    .poll(() => selectedIds(page))
    .toEqual({ nodes: ['a', 'c'], edges: [] })

  const before = {
    a: await boxOf(node(page, 'a')),
    b: await boxOf(node(page, 'b')),
    c: await boxOf(node(page, 'c')),
  }

  const from = await centreOf(node(page, 'a'))
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move(from.x + 50, from.y + 30, { steps: 5 })

  await expect
    .poll(async () => {
      const moved = await boxOf(node(page, 'c'))

      return moved.x - before.c.x
    })
    .toBeCloseTo(50, 0)

  const midA = await boxOf(node(page, 'a'))
  const midB = await boxOf(node(page, 'b'))

  expect(midA.y - before.a.y).toBeCloseTo(30, 0)
  expect(midB.x).toBeCloseTo(before.b.x, 0)

  await Promise.all(
    [
      ['a', 'true'],
      ['c', 'true'],
      ['b', 'false'],
    ].map(([id, dragging]) =>
      expect(page.getByTestId(`probe-${id}`)).toHaveAttribute(
        'data-dragging',
        dragging ?? ''
      )
    )
  )

  await page.mouse.up()

  await expect
    .poll(() =>
      fixture(page, (api) =>
        api
          .nodes()
          .filter(({ id }) => id !== 'd')
          .map(({ id, position }) => [id, position.x, position.y])
      )
    )
    .toEqual([
      ['a', 130, 110],
      ['b', 420, 80],
      ['c', 130, 330],
    ])

  const events = await fixture(page, (api) => api.events())
  const names = events.map(({ name }) => name)
  expect(names[0]).toBe('selectedNodesDragStart')
  expect(names.at(-1)).toBe('selectedNodesDragStop')
  expect(names.filter((name) => name === 'selectedNodesDrag').length).toBe(
    names.length - 2
  )
  expect(names.length).toBeGreaterThan(2)
  expect(events[0]?.nodes).toEqual([
    { id: 'a', x: 80, y: 80 },
    { id: 'c', x: 80, y: 300 },
  ])
  expect(events.at(-1)).toEqual({
    name: 'selectedNodesDragStop',
    status: 'accepted',
    nodes: [
      { id: 'a', x: 130, y: 110 },
      { id: 'c', x: 130, y: 330 },
    ],
  })

  // One node dragged alone reports no selection drag.
  const d = await centreOf(node(page, 'd'))
  await page.mouse.move(d.x, d.y)
  await page.mouse.down()
  await page.mouse.move(d.x + 3, d.y + 3)
  await page.mouse.move(d.x + 20, d.y + 20, { steps: 3 })
  await page.mouse.up()
  await expect
    .poll(() => fixture(page, (api) => api.flow().getNode('d')?.position))
    .toEqual({ x: 440, y: 320 })
  const afterSingleDrag = await fixture(page, (api) => api.events())

  expect(afterSingleDrag).toHaveLength(events.length)
})

test('nodes are measured only with real geometry and report dimensions changes', async ({
  page,
}) => {
  await mount(page)

  await expect
    .poll(() =>
      fixture(page, (api) =>
        api
          .nodeChanges()
          .filter((change) => change.type === 'dimensions')
          .map((change) => change.id)
          .toSorted()
      )
    )
    .toEqual(['a', 'b', 'c', 'd'])

  const samples = await fixture(page, (api) => api.samples())

  // No sample claims a measurement without a box and both handles.
  for (const sample of samples) {
    expect(
      sample.status !== 'measured' ||
        (sample.width > 0 && sample.height > 0 && sample.handles === 2),
      JSON.stringify(sample)
    ).toBe(true)
  }

  // The fixture runs at zoom 1, so client pixels are flow units.
  const a = await boxOf(node(page, 'a'))

  expect(samples.find(({ at }) => at === 'dimensions')).toEqual({
    at: 'dimensions',
    status: 'measured',
    width: a.width,
    height: a.height,
    handles: 2,
  })
  const changes = await fixture(page, (api) => api.nodeChanges())

  expect(
    changes.find((change) => change.type === 'dimensions' && change.id === 'a')
  ).toEqual({
    id: 'a',
    type: 'dimensions',
    dimensions: { width: a.width, height: a.height },
  })

  // A size change reports again; an unchanged remeasure does not.
  const count = () =>
    fixture(
      page,
      (api) =>
        api.nodeChanges().filter((change) => change.type === 'dimensions')
          .length
    )

  const reported = await count()
  await page.evaluate(async () => {
    const flow = window.__flowVueHardening?.flow()
    await flow?.updateNodeInternals('a')
  })
  // Give a stray remeasure time to report before checking none did.
  await browserFrames(page, 6)
  expect(await count()).toBe(reported)

  await page.evaluate(async () => {
    await window.__flowVueHardening
      ?.flow()
      .setNodes((nodes) =>
        nodes.map((item) =>
          item.id === 'b' ? { ...item, size: { width: 160, height: 70 } } : item
        )
      )
  })
  await expect
    .poll(async () => {
      const resized = await boxOf(node(page, 'b'))

      return resized.width
    })
    .toBeGreaterThan(a.width)

  const b = await boxOf(node(page, 'b'))

  await expect
    .poll(() =>
      fixture(page, (api) =>
        api.nodeChanges().findLast((change) => change.type === 'dimensions')
      )
    )
    .toEqual({
      id: 'b',
      type: 'dimensions',
      dimensions: { width: b.width, height: b.height },
    })
})

test('handle offsets measured right after fitView use the rendered zoom', async ({
  page,
}) => {
  await mount(page)
  await expect
    .poll(() => fixture(page, (api) => api.internal('a')?.measurementStatus))
    .toBe('measured')

  // As a layout recipe does: move the handles, then fit the view while the
  // canvas is still remeasuring the moved handles.
  await page.evaluate(async () => {
    const flow = window.__flowVueHardening?.flow()

    if (flow === undefined) {
      throw new Error('Missing hardening fixture')
    }

    await flow.setNodes((nodes) =>
      nodes.map((item) =>
        item.id === 'a'
          ? {
              ...item,
              handles: item.handles?.map((declared) => ({
                ...declared,
                side: declared.kind === 'source' ? 'bottom' : 'top',
              })),
            }
          : item
      )
    )
    await flow.fitView({ padding: 0.3 })
  })

  /** Rendered handle centers and measured offsets of node a, in flow units. */
  const offsets = async () => {
    const zoom = await page
      .locator('.flow-vue-viewport')
      .evaluate(
        (element) => new DOMMatrix(getComputedStyle(element).transform).a
      )

    const nodeBox = await boxOf(node(page, 'a'))

    const rendered = await Promise.all(
      ['in', 'out'].map(async (handleId) => {
        const centre = await centreOf(handle(page, 'a', handleId))

        return {
          handleId,
          x: (centre.x - nodeBox.x) / zoom,
          y: (centre.y - nodeBox.y) / zoom,
        }
      })
    )

    const measured = await fixture(page, (api) =>
      api.internal('a')?.handles.map(({ handleId, offset }) => ({
        handleId,
        x: offset.x,
        y: offset.y,
      }))
    )

    return { zoom, rendered, measured: measured ?? [] }
  }

  // Nothing remeasures node a after this, so a stale offset never recovers.
  await expect
    .poll(async () => {
      const { zoom, rendered, measured } = await offsets()

      return (
        Math.abs(zoom - 1) > 0.01 &&
        measured.length === 2 &&
        rendered.every((expected) => {
          const actual = measured.find(
            ({ handleId }) => handleId === expected.handleId
          )

          return (
            actual !== undefined &&
            Math.abs(actual.x - expected.x) <= 0.5 &&
            Math.abs(actual.y - expected.y) <= 0.5
          )
        })
      )
    })
    .toBe(true)
})

test('a custom edge hit area follows the path it draws', async ({ page }) => {
  await mount(page)

  const drawn = page.getByTestId('detour-path')
  await expect(edgeHit(page, 'e-cd')).toHaveAttribute(
    'd',
    (await drawn.getAttribute('d')) ?? ''
  )

  // The straight handle route between c and d is empty canvas.
  const c = await boxOf(node(page, 'c'))
  const d = await boxOf(node(page, 'd'))
  const routeMid = { x: (c.x + c.width + d.x) / 2, y: c.y + c.height / 2 }
  await page.mouse.click(routeMid.x, routeMid.y)

  const afterRouteClick = await selectedIds(page)

  expect(afterRouteClick.edges).toEqual([])

  // The detour's bottom run, 100px below the handles, selects the edge.
  const detourMid = { x: routeMid.x, y: routeMid.y + 100 }
  await page.mouse.move(detourMid.x, detourMid.y)
  await expect
    .poll(() =>
      page.evaluate(({ x, y }) => {
        const hit = document.elementFromPoint(x, y)

        return hit instanceof SVGElement ? hit.dataset.flowEdgeHit : undefined
      }, detourMid)
    )
    .toBe('e-cd')
  await page.mouse.click(detourMid.x, detourMid.y)
  await expect
    .poll(() => selectedIds(page))
    .toEqual({ nodes: [], edges: ['e-cd'] })
})

test('handles stay usable on selected nodes; resize controls need nodesResizable', async ({
  page,
}) => {
  await mount(page)

  await node(page, 'a').click()
  await expect
    .poll(() => selectedIds(page))
    .toEqual({ nodes: ['a'], edges: [] })
  await expect(node(page, 'a').locator('.flow-vue-resize-handle')).toHaveCount(
    0
  )

  const out = await centreOf(handle(page, 'a', 'out'))
  const target = await centreOf(handle(page, 'd', 'in'))
  await page.mouse.move(out.x, out.y)
  await page.mouse.down()
  await page.mouse.move(out.x + 3, out.y + 3)
  await page.mouse.move(target.x, target.y, { steps: 8 })
  await page.mouse.up()
  await expect
    .poll(() =>
      fixture(
        page,
        (api) =>
          api
            .flow()
            .edges.value.filter(
              ({ source, target: to }) => source === 'a' && to === 'd'
            ).length
      )
    )
    .toBe(1)

  await mount(page, { nodesResizable: true })
  await node(page, 'a').click()
  await expect(node(page, 'a').locator('.flow-vue-resize-handle')).toHaveCount(
    8
  )
})

test('a click at threshold 0 with selectNodesOnDrag reads the selection from the press', async ({
  page,
}) => {
  await mount(page, { nodeDragThreshold: 0, selectNodesOnDrag: true })

  await node(page, 'a').click()
  await expect
    .poll(() => selectedIds(page))
    .toEqual({ nodes: ['a'], edges: [] })

  await node(page, 'b').click()
  await expect
    .poll(() => selectedIds(page))
    .toEqual({ nodes: ['b'], edges: [] })

  await node(page, 'c').click({ modifiers: ['Meta'] })
  await expect
    .poll(() => selectedIds(page))
    .toEqual({ nodes: ['b', 'c'], edges: [] })

  await node(page, 'c').click({ modifiers: ['Meta'] })
  await expect
    .poll(() => selectedIds(page))
    .toEqual({ nodes: ['b'], edges: [] })
})

test('dragging a child with its selected parent commits the parent', async ({
  page,
}) => {
  await mount(page, { scene: 'nested' })

  const parent = await boxOf(node(page, 'p'))

  await page.mouse.click(parent.x + parent.width - 20, parent.y + 20)
  await node(page, 'k').click({ modifiers: ['Meta'] })
  await expect
    .poll(() => selectedIds(page))
    .toEqual({ nodes: ['p', 'k'], edges: [] })

  const child = await boxOf(node(page, 'k'))
  const from = await centreOf(node(page, 'k'))

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move(from.x + 40, from.y + 30, { steps: 4 })
  await page.mouse.up()

  await expect
    .poll(() =>
      fixture(page, (api) =>
        api
          .nodes()
          .filter(({ id }) => id === 'p' || id === 'k')
          .map(({ id, position }) => [id, position.x, position.y])
      )
    )
    .toEqual([
      ['p', 120, 110],
      ['k', 40, 60],
    ])

  const moved = await boxOf(node(page, 'k'))

  expect(moved.x - child.x).toBeCloseTo(40, 0)
  expect(moved.y - child.y).toBeCloseTo(30, 0)
})

test('empty and collapsed nodes are measured at zero size', async ({
  page,
}) => {
  await mount(page, { scene: 'nested' })

  await expect
    .poll(() => fixture(page, (api) => api.flow().nodesInitialized()))
    .toBe(true)
  expect(
    await fixture(page, (api) => {
      const hidden = api.internal('z')

      return [hidden?.measurementStatus, hidden?.width, hidden?.height]
    })
  ).toEqual(['measured', 0, 0])

  await page.evaluate(() =>
    document.querySelector('#app')?.classList.add('hardening-collapsed')
  )
  await expect
    .poll(() =>
      fixture(page, (api) =>
        api
          .nodeChanges()
          .findLast(
            (change) => change.type === 'dimensions' && change.id === 'y'
          )
      )
    )
    .toEqual({
      id: 'y',
      type: 'dimensions',
      dimensions: { width: 0, height: 0 },
    })
  expect(await fixture(page, (api) => api.internal('y')?.width)).toBe(0)
})

test('handle clicks connect on click without selecting their nodes', async ({
  page,
}) => {
  await mount(page)

  await handle(page, 'a', 'out').click()
  await handle(page, 'd', 'in').click()
  await expect
    .poll(() =>
      fixture(
        page,
        (api) =>
          api
            .flow()
            .edges.value.filter(
              ({ source, target }) => source === 'a' && target === 'd'
            ).length
      )
    )
    .toBe(1)
  expect(await selectedIds(page)).toEqual({ nodes: [], edges: [] })
})
