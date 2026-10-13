import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

const recipe = (scene: string) => `/ui-recipes/layout/?scene=${scene}`

/** Rendered node rects by id, read from the DOM. */
const nodeRects = (page: Page) =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll<HTMLElement>('.flow-node')].map(
        (element) => {
          const { x, y, width, height } = element.getBoundingClientRect()

          return [element.dataset.nodeId ?? '', { x, y, width, height }]
        }
      )
    )
  )

const rectOf = (rects: Readonly<Record<string, Box>>, id: string): Box => {
  const rect = rects[id]

  if (rect === undefined) {
    throw new Error(`Missing node ${id}`)
  }

  return rect
}

const overlapping = (rects: Readonly<Record<string, Box>>) => {
  const entries = Object.entries(rects)

  return entries.flatMap(([firstId, first], index) =>
    entries
      .slice(index + 1)
      .filter(
        ([, second]) =>
          first.x < second.x + second.width - 0.5 &&
          second.x < first.x + first.width - 0.5 &&
          first.y < second.y + second.height - 0.5 &&
          second.y < first.y + first.height - 0.5
      )
      .map(([secondId]) => `${firstId}/${secondId}`)
  )
}

const edgePairs = async (page: Page) => {
  const pairs =
    (await page.getByTestId('recipe-status').getAttribute('data-edges')) ?? ''

  return pairs
    .split(',')
    .filter((pair) => pair.length > 0)
    .map((pair) => {
      const [source = '', target = ''] = pair.split('>')

      return { source, target }
    })
}

/** Every edge runs top to bottom (TB) or left to right (LR) between node rects. */
const flowDirectionViolations = async (page: Page, direction: 'TB' | 'LR') => {
  const rects = await nodeRects(page)

  const pairs = await edgePairs(page)

  return pairs.filter(({ source, target }) => {
    const from = rectOf(rects, source)
    const to = rectOf(rects, target)

    return direction === 'TB'
      ? to.y < from.y + from.height - 0.5
      : to.x < from.x + from.width - 0.5
  })
}

const layoutsOf = async (page: Page) =>
  Number(await page.getByTestId('recipe-status').getAttribute('data-layouts'))

const waitForLayouts = async (page: Page, count: number) => {
  await expect
    .poll(() => layoutsOf(page), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(count)
}

const expectNoOverlaps = async (page: Page) => {
  await expect.poll(async () => overlapping(await nodeRects(page))).toEqual([])
}

for (const scene of ['dagre-tree', 'elk-tree'] as const) {
  test(`${scene}: measured tree layout in both directions`, async ({
    page,
  }) => {
    await page.goto(recipe(scene))
    await waitForLayouts(page, 1)
    await expectNoOverlaps(page)
    expect(await flowDirectionViolations(page, 'TB')).toEqual([])

    const before = await layoutsOf(page)
    await page.getByTestId('layout-lr').click()
    await waitForLayouts(page, before + 1)
    await expect.poll(() => flowDirectionViolations(page, 'LR')).toEqual([])
    await expectNoOverlaps(page)

    const root = rectOf(await nodeRects(page), '1')

    const handle = await page
      .locator('.flow-handle[data-node-id="1"][data-handle-id="out"]')
      .boundingBox()

    expect(
      Math.abs(
        (handle?.x ?? 0) + (handle?.width ?? 0) / 2 - root.x - root.width
      )
    ).toBeLessThanOrEqual(2)
  })
}

test('elk-multiple-handles: fixed ports order targets so edges do not cross', async ({
  page,
}) => {
  await page.goto(recipe('elk-multiple-handles'))
  await waitForLayouts(page, 1)
  const rects = await nodeRects(page)
  expect(overlapping(rects)).toEqual([])
  expect(rectOf(rects, 't3').y).toBeLessThan(rectOf(rects, 't1').y)
  expect(rectOf(rects, 't1').y).toBeLessThan(rectOf(rects, 't2').y)

  const zoom = Number(
    await page.getByTestId('flow-viewport').getAttribute('data-zoom')
  )

  const source = rectOf(rects, 's')

  const rendered = await page
    .locator('.flow-handle[data-node-id="s"]')
    .evaluateAll((handles) =>
      handles.map((handle) => {
        const { y, height } = handle.getBoundingClientRect()

        return { id: handle.dataset.handleId, center: y + height / 2 }
      })
    )

  const ports = (
    (await page.getByTestId('recipe-status').getAttribute('data-ports')) ?? ''
  ).split(',')

  expect(ports.map((port) => port.split('@')[0])).toEqual([
    's:out-a',
    's:out-b',
    's:out-c',
  ])

  for (const port of ports) {
    const [name = '', offset = ''] = port.split('@')
    const handle = rendered.find(({ id }) => `s:${id}` === name)
    const expected = ((handle?.center ?? 0) - source.y) / zoom
    expect(Math.abs(Number(offset) - expected)).toBeLessThanOrEqual(1)
  }
})

test('auto-layout: adding and removing nodes re-runs the layout', async ({
  page,
}) => {
  await page.goto(recipe('auto-layout'))
  await waitForLayouts(page, 1)

  await page.getByTestId('add-child').click()
  await expect(page.locator('.flow-node[data-node-id="n1"]')).toHaveCount(1)
  await page.getByTestId('add-child').click()
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-edges',
    /1>n1,1>n2$/u
  )
  await expectNoOverlaps(page)
  await expect.poll(() => flowDirectionViolations(page, 'TB')).toEqual([])

  await page.locator('.flow-node[data-node-id="2b"]').click()
  await page.getByTestId('add-child').click()
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-edges',
    /2b>n3$/u
  )
  await expect
    .poll(async () => {
      const rects = await nodeRects(page)
      const parent = rectOf(rects, '2b')

      return rectOf(rects, 'n3').y >= parent.y + parent.height
    })
    .toBe(true)
  await expectNoOverlaps(page)

  const before = await layoutsOf(page)
  await page.getByTestId('remove-last').click()
  await expect(page.locator('.flow-node[data-node-id="n3"]')).toHaveCount(0)
  await waitForLayouts(page, before + 1)
  await expectNoOverlaps(page)
})

test('force-layout: the simulation animates, settles without overlaps and pins drops', async ({
  page,
}) => {
  await page.goto(recipe('force-layout'))
  const status = page.getByTestId('recipe-status')
  const node = page.locator('.flow-node[data-node-id="a"]')
  await expect(status).toHaveAttribute('data-running', 'true')

  const first = await node.boundingBox()
  await expect
    .poll(async () => {
      const next = await node.boundingBox()

      return Math.hypot(
        (next?.x ?? 0) - (first?.x ?? 0),
        (next?.y ?? 0) - (first?.y ?? 0)
      )
    })
    .toBeGreaterThan(1)

  await expect(status).toHaveAttribute('data-running', 'false', {
    timeout: 15_000,
  })
  await expectNoOverlaps(page)

  const ticks = Number(await status.getAttribute('data-ticks'))
  const dragged = page.locator('.flow-node[data-node-id="h"]')
  const start = await dragged.boundingBox()

  if (start === null) {
    throw new Error('Missing node h')
  }

  const from = { x: start.x + start.width / 2, y: start.y + start.height / 2 }
  const dx = from.x > 450 ? -150 : 150
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y)
  await page.mouse.move(from.x + dx, from.y, { steps: 10 })
  await page.mouse.up()
  const dropped = await dragged.boundingBox()

  await expect(status).toHaveAttribute('data-running', 'true')
  await expect(status).toHaveAttribute('data-running', 'false', {
    timeout: 15_000,
  })
  expect(Number(await status.getAttribute('data-ticks'))).toBeGreaterThan(ticks)

  const settled = await dragged.boundingBox()
  expect(Math.abs((settled?.x ?? 0) - (dropped?.x ?? 0))).toBeLessThanOrEqual(3)
  expect(Math.abs((settled?.y ?? 0) - (dropped?.y ?? 0))).toBeLessThanOrEqual(3)
  expect(Math.abs((dropped?.x ?? 0) - start.x - dx)).toBeLessThanOrEqual(3)
})

test('dynamic-layouting: placeholders become nodes and nodes grow branches', async ({
  page,
}) => {
  await page.goto(recipe('dynamic-layouting'))
  const status = page.getByTestId('recipe-status')
  await waitForLayouts(page, 1)
  await expect(status).toHaveAttribute('data-nodes', '1')
  await expect(status).toHaveAttribute('data-placeholders', '1')

  await page.getByTestId('placeholder').click()
  await expect(status).toHaveAttribute('data-nodes', '2')
  await expect(status).toHaveAttribute('data-placeholders', '1')
  await expect(page.getByTestId('placeholder')).toHaveCount(1)
  await expect
    .poll(async () => {
      const rects = await nodeRects(page)
      const node = rectOf(rects, 'p1')

      return rectOf(rects, 'p2').y >= node.y + node.height
    })
    .toBe(true)
  await expectNoOverlaps(page)

  await page.locator('.flow-node[data-node-id="root"]').click()
  await expect(status).toHaveAttribute('data-placeholders', '2')
  await expect(page.getByTestId('placeholder')).toHaveCount(2)
  await expectNoOverlaps(page)
  await expect.poll(() => flowDirectionViolations(page, 'TB')).toEqual([])
})
