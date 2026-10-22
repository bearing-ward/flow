import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import type { VueEventsFixture } from '../src/events-and-changes-test.ts'

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

/** Drag with real mouse input, crossing the 1px drag thresholds first. */
const drag = async (page: Page, from: Point, to: Point) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await page.mouse.up()
}

const handle = (page: Page, nodeId: string, handleId: string) =>
  page.locator(`[data-node-id="${nodeId}"] [data-handle-id="${handleId}"]`)

const node = (page: Page, nodeId: string) =>
  page.locator(`.flow-vue-node[data-node-id="${nodeId}"]`)

/** Run a reader against the mounted fixture API inside the page. */
const fixture = async <Result>(
  page: Page,
  read: (api: VueEventsFixture) => Result
): Promise<Awaited<Result>> =>
  // SAFETY: the reader runs in the page against the fixture it is typed for.
  (await page.evaluate(
    `(${read.toString()})(window.__flowVueEvents)`
  )) as Awaited<Result>

const connect = async (
  page: Page,
  from: readonly [string, string],
  to: readonly [string, string]
) =>
  drag(
    page,
    await centreOf(handle(page, ...from)),
    await centreOf(handle(page, ...to))
  )

const emptyPane = async (page: Page): Promise<Point> => {
  const canvas = await boxOf(page.locator('.flow-vue-canvas'))

  return { x: canvas.x + 760, y: canvas.y + 170 }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const { mountVueEventsFixture } =
      await import('../src/events-and-changes-test.ts')

    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Vue events fixture mount point is missing')
    }

    mountVueEventsFixture(root)
  })
  await expect(node(page, 'a')).toBeVisible()
})

test('controlled split binding follows node and edge deltas', async ({
  page,
}) => {
  // Drag: a position delta updates the caller's nodes and the canvas.
  const before = await boxOf(node(page, 'a'))
  await drag(
    page,
    { x: before.x + 20, y: before.y + 10 },
    { x: before.x + 80, y: before.y + 50 }
  )
  await expect
    .poll(() =>
      fixture(page, (api) => api.nodes().find(({ id }) => id === 'a')?.position)
    )
    .toEqual({ x: 120, y: 100 })
  expect(
    await fixture(page, (api) =>
      api.nodeChanges().filter((change) => change.type === 'position')
    )
  ).toEqual([{ id: 'a', type: 'position', position: { x: 120, y: 100 } }])
  await expect
    .poll(async () => {
      const moved = await boxOf(node(page, 'a'))

      return moved.x - before.x
    })
    .toBeCloseTo(60, 0)

  // Select: a pane rectangle produces select deltas.
  const a = await boxOf(node(page, 'a'))
  await page.keyboard.down('Shift')
  await drag(
    page,
    { x: a.x - 20, y: a.y - 20 },
    { x: a.x + a.width + 20, y: a.y + a.height + 20 }
  )
  await page.keyboard.up('Shift')
  await expect
    .poll(() =>
      fixture(page, (api) =>
        api
          .nodes()
          .filter(({ selected }) => selected === true)
          .map(({ id }) => id)
      )
    )
    .toEqual(['a'])
  expect(
    await fixture(page, (api) =>
      api
        .nodeChanges()
        .filter((change) => change.type === 'select' && change.selected)
        .map((change) => (change.type === 'select' ? change.id : ''))
    )
  ).toEqual(['a'])

  // Connect: an add delta; useConnection reports the live gesture. Selected
  // Alpha shows resize handles over its handle, so connect from Second.
  await connect(page, ['s', 'out'], ['b', 'in'])
  await expect.poll(() => fixture(page, (api) => api.edges().length)).toBe(1)
  await expect(page.getByTestId('flow-edge')).toHaveCount(1)
  expect(
    await fixture(page, (api) => api.edgeChanges().map(({ type }) => type))
  ).toEqual(['add'])

  const states = await fixture(page, (api) => api.connectionStates())

  expect(states).toContainEqual({
    inProgress: true,
    fromNode: 's',
    fromHandle: 'out',
    toNode: 'b',
    isValid: true,
  })
  expect(states.at(-1)?.inProgress).toBe(false)

  const end = await fixture(page, (api) =>
    api.events().findLast(({ name }) => name === 'connectEnd')
  )

  expect(end?.status).toBe('proposed')
  expect(end?.eventType).toBe('pointerup')
  expect(end?.clientPosition).toEqual(
    await centreOf(handle(page, 'b', 'in')).then(({ x, y }) => ({
      x: expect.closeTo(x, 0),
      y: expect.closeTo(y, 0),
    }))
  )
  expect(end?.connectionState).toMatchObject({
    isValid: true,
    fromNode: { id: 's' },
    fromHandle: { id: 'out', nodeId: 's', type: 'source' },
    toNode: { id: 'b' },
    toHandle: { id: 'in', nodeId: 'b', type: 'target' },
    toPosition: 'left',
  })

  // Delete: remove deltas for the node and its edge.
  await fixture(page, (api) => api.deleteElements({ nodeIds: ['b'] }))
  await expect(node(page, 'b')).toHaveCount(0)
  await expect(page.getByTestId('flow-edge')).toHaveCount(0)
  expect(
    await fixture(page, (api) => ({
      node: api.nodeChanges().at(-1),
      edge: api.edgeChanges().at(-1)?.type,
      edges: api.edges().length,
    }))
  ).toEqual({ node: { id: 'b', type: 'remove' }, edge: 'remove', edges: 0 })
})

test('runtime switches and the Controls lock gate drag, connect and select', async ({
  page,
}) => {
  const lock = page.getByRole('button', { name: 'Toggle interactivity' })
  await expect(lock).toHaveAttribute('aria-pressed', 'false')
  await expect(handle(page, 'a', 'out')).toHaveClass(
    /\bconnectable\b.*\bconnectablestart\b.*\bconnectableend\b/u
  )

  // One switch off keeps Controls interactive, as in React Flow.
  await fixture(page, (api) => api.setProp('nodesConnectable', false))
  await expect(handle(page, 'a', 'out')).not.toHaveClass(/\bconnectable\b/u)
  await expect(handle(page, 'a', 'out')).toHaveCSS('pointer-events', 'none')
  await expect(lock).toHaveAttribute('aria-pressed', 'false')
  await connect(page, ['a', 'out'], ['b', 'in'])
  expect(await fixture(page, (api) => api.edges().length)).toBe(0)

  // Pinned packages/system/src/styles/init.css:233 and
  // packages/react/src/components/NodeWrapper/index.tsx:90,206: the disabled
  // handle passes the press to its still-draggable node.
  const positionAfterDisabledConnect = await fixture(
    page,
    (api) => api.nodes().find(({ id }) => id === 'a')?.position
  )

  expect(positionAfterDisabledConnect).not.toEqual({ x: 60, y: 60 })

  const dragStartsAfterDisabledConnect = await fixture(
    page,
    (api) => api.events().filter(({ name }) => name === 'nodeDragStart').length
  )

  expect(dragStartsAfterDisabledConnect).toBeGreaterThan(0)

  // All switches off: the lock starts from the options.
  await fixture(page, (api) => {
    api.setProp('nodesDraggable', false)
    api.setProp('elementsSelectable', false)
  })
  await expect(lock).toHaveAttribute('aria-pressed', 'true')
  await lock.click()
  await expect(lock).toHaveAttribute('aria-pressed', 'false')
  expect(await fixture(page, (api) => api.interactivity())).toEqual({
    nodesDraggable: true,
    nodesConnectable: true,
    elementsSelectable: true,
  })
  await lock.click()
  await expect(lock).toHaveAttribute('aria-pressed', 'true')
  expect(await fixture(page, (api) => api.interactiveCalls())).toEqual([
    true,
    false,
  ])

  // Locked: dragging a node pans the viewport instead of moving the node.
  const viewport = await fixture(page, (api) => api.viewport())
  const a = await boxOf(node(page, 'a'))
  await drag(page, { x: a.x + 20, y: a.y + 10 }, { x: a.x + 120, y: a.y + 60 })
  expect(
    await fixture(
      page,
      (api) => api.nodes().find(({ id }) => id === 'a')?.position
    )
  ).toEqual(positionAfterDisabledConnect)
  await expect
    .poll(() => fixture(page, (api) => api.viewport()))
    .toEqual({ x: viewport.x + 100, y: viewport.y + 50, zoom: 1 })
  expect(
    await fixture(
      page,
      (api) =>
        api.events().filter(({ name }) => name === 'nodeDragStart').length
    )
  ).toBe(dragStartsAfterDisabledConnect)

  // Locked: no pointer, keyboard or click connection.
  await connect(page, ['a', 'out'], ['b', 'in'])
  await handle(page, 'a', 'out').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('flow-connection-preview')).toHaveCount(0)
  // Pinned packages/system/src/styles/init.css:233 makes a disabled handle
  // non-actionable, so send the native click at its screen point.
  const disabledHandlePoint = await centreOf(handle(page, 'a', 'out'))
  await page.mouse.click(disabledHandlePoint.x, disabledHandlePoint.y)
  await expect(page.getByTestId('flow-connection-preview')).toHaveCount(0)
  expect(await fixture(page, (api) => api.edges().length)).toBe(0)

  // Locked: keyboard selection, Shift+Space rectangles and pane boxes do nothing.
  await node(page, 'a').focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Shift+Space')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')

  const pane = await emptyPane(page)
  const moved = await boxOf(node(page, 'a'))
  await page.keyboard.down('Shift')
  await drag(page, { x: moved.x - 30, y: moved.y - 30 }, pane)
  await page.keyboard.up('Shift')
  expect(
    await fixture(page, (api) =>
      api.nodes().filter(({ selected }) => selected === true)
    )
  ).toEqual([])
  expect(
    await fixture(page, (api) =>
      api.nodeChanges().filter(({ type }) => type === 'select')
    )
  ).toEqual([])

  // Locked: node clicks still fire and buttons inside nodes still work.
  await node(page, 'b').click()
  await page.getByTestId('node-button').click()
  expect(await fixture(page, (api) => api.buttonClicks())).toBe(1)
  expect(
    await fixture(page, (api) =>
      api.events().filter(({ name }) => name === 'nodeClick')
    )
  ).toContainEqual({ name: 'nodeClick', id: 'b', eventType: 'click' })

  // Runtime setter and props: the latest write wins.
  await fixture(page, (api) => api.setInteractivity({ nodesDraggable: true }))
  await fixture(page, (api) => api.setProp('nodesDraggable', true))
  await fixture(page, (api) => api.setProp('nodesDraggable', false))
  expect(await fixture(page, (api) => api.interactivity().nodesDraggable)).toBe(
    false
  )
  await fixture(page, (api) => api.setInteractivity({ nodesConnectable: true }))
  // The prior disabled-handle drag moved a beside b; their handles overlap.
  // Use the untouched source to check restored connectability.
  await connect(page, ['s', 'out'], ['b', 'in'])
  await expect.poll(() => fixture(page, (api) => api.edges().length)).toBe(1)
  await expect(lock).toHaveAttribute('aria-pressed', 'false')
})

test('Connection Limit rejects a second connection to a full handle', async ({
  page,
}) => {
  await connect(page, ['a', 'out'], ['l', 'in'])
  await expect.poll(() => fixture(page, (api) => api.edges().length)).toBe(1)
  await expect(handle(page, 'l', 'in')).not.toHaveClass(/\bconnectable\b/u)

  await connect(page, ['s', 'out'], ['l', 'in'])
  await expect
    .poll(() =>
      fixture(
        page,
        (api) => api.events().filter(({ name }) => name === 'connectEnd').length
      )
    )
    .toBe(2)
  expect(
    await fixture(
      page,
      (api) =>
        api.events().findLast(({ name }) => name === 'connectEnd')?.status
    )
  ).toBe('rejected')
  expect(await fixture(page, (api) => api.edges().length)).toBe(1)
  await expect(page.getByTestId('flow-edge')).toHaveCount(1)

  // Other handles stay open.
  await connect(page, ['s', 'out'], ['b', 'in'])
  await expect.poll(() => fixture(page, (api) => api.edges().length)).toBe(2)
})

test('Add Node On Edge Drop places a node at the release position', async ({
  page,
}) => {
  await fixture(page, (api) => api.setDropMode('add-node'))

  const pane = await emptyPane(page)
  await drag(page, await centreOf(handle(page, 'a', 'out')), pane)

  const added = node(page, 'added-1')
  await expect(added).toBeVisible()

  const box = await boxOf(added)
  // Within the canvas border.
  expect(Math.abs(box.x - pane.x)).toBeLessThanOrEqual(2)
  expect(Math.abs(box.y - pane.y)).toBeLessThanOrEqual(2)
  expect(await fixture(page, (api) => api.edges())).toEqual([
    {
      id: 'edge-added-1',
      source: 'a',
      sourceHandle: 'out',
      target: 'added-1',
      targetHandle: 'in',
    },
  ])

  const end = await fixture(page, (api) =>
    api.events().findLast(({ name }) => name === 'connectEnd')
  )

  expect(end).toMatchObject({
    status: 'rejected',
    reason: 'no-target',
    eventType: 'pointerup',
    connectionState: {
      isValid: null,
      fromNode: { id: 'a' },
      toNode: null,
      toHandle: null,
      toPosition: null,
    },
  })
  await expect(page.getByTestId('flow-edge')).toHaveCount(1)
})

test('Temporary Edges can be accepted or cancelled', async ({ page }) => {
  await fixture(page, (api) => api.setDropMode('temporary'))

  const pane = await emptyPane(page)
  await drag(page, await centreOf(handle(page, 'a', 'out')), pane)
  await expect(node(page, 'temp-1')).toBeVisible()
  await expect(
    page.locator('[data-edge-id="edge-temp-1"] [data-testid="flow-edge-path"]')
  ).toHaveAttribute('stroke', '#f59e0b')

  // Cancel leaves no edge.
  await node(page, 'temp-1').getByTestId('temporary-cancel').click()
  await expect(node(page, 'temp-1')).toHaveCount(0)
  await expect(page.getByTestId('flow-edge')).toHaveCount(0)
  expect(await fixture(page, (api) => api.edges())).toEqual([])

  // Accept turns it into a persistent edge to a real node.
  await drag(page, await centreOf(handle(page, 's', 'out')), pane)
  await expect(node(page, 'temp-2')).toBeVisible()
  await node(page, 'temp-2').getByTestId('temporary-accept').click()
  await expect(node(page, 'temp-2')).toHaveCount(0)
  expect(await fixture(page, (api) => api.edges())).toEqual([
    {
      id: 'accepted-temp-2',
      source: 's',
      sourceHandle: 'out',
      target: 'b',
      targetHandle: 'in',
    },
  ])
  await expect(page.getByTestId('flow-edge')).toHaveCount(1)
})

test('mouse events carry the browser event and failures reach the error event', async ({
  page,
}) => {
  await node(page, 'a').click({ button: 'right' })
  await node(page, 'a').dblclick()
  await connect(page, ['a', 'out'], ['b', 'in'])
  await expect(page.getByTestId('flow-edge')).toHaveCount(1)

  const edgeHit = page.getByTestId('flow-edge-hit-target')
  await edgeHit.click({ button: 'right' })
  await edgeHit.click()
  await edgeHit.focus()
  await page.keyboard.press('Enter')

  const events = await fixture(page, (api) =>
    api
      .events()
      .filter(({ name }) =>
        [
          'nodeContextMenu',
          'nodeDoubleClick',
          'edgeContextMenu',
          'edgeClick',
        ].includes(name)
      )
  )

  expect(events).toEqual([
    { name: 'nodeContextMenu', id: 'a', eventType: 'contextmenu' },
    { name: 'nodeDoubleClick', id: 'a', eventType: 'dblclick' },
    { name: 'edgeContextMenu', id: 'edge-1', eventType: 'contextmenu' },
    { name: 'edgeClick', id: 'edge-1', eventType: 'pointerdown' },
    { name: 'edgeClick', id: 'edge-1', eventType: 'keydown' },
  ])

  expect(
    await fixture(page, (api) =>
      api.failingEdit({
        operations: [
          {
            kind: 'add-nodes',
            nodes: [{ id: 'a', label: 'Duplicate', position: { x: 0, y: 0 } }],
          },
        ],
      })
    )
  ).not.toBe('resolved')
  expect(await fixture(page, (api) => api.failingDelete('s'))).toBe(
    'FlowDeleteApprovalFailed'
  )
  await fixture(page, (api) => api.failingStateListener())
  await drag(page, await centreOf(node(page, 'f')), await emptyPane(page))
  await connect(page, ['s', 'out'], ['l', 'in'])
  await expect
    .poll(() =>
      fixture(page, (api) => api.errors().map(({ boundary }) => boundary))
    )
    .toEqual(['edit', 'delete', 'state-listener'])
  expect(await fixture(page, (api) => api.errors()[1]?.name)).toBe(
    'FlowDeleteApprovalFailed'
  )
})
