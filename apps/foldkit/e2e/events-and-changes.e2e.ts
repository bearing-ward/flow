import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import type {
  FoldkitEventsFixture,
  FoldkitEventsScenario,
} from './events-and-changes-fixture.ts'

declare global {
  interface Window {
    __flowFoldkitEvents?: FoldkitEventsFixture
  }
}

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

const centre = async (locator: Locator): Promise<Point> => {
  const box = await boxOf(locator)

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const centreX = async (locator: Locator): Promise<number> => {
  const point = await centre(locator)

  return point.x
}

/** A canvas-relative client point. */
const inCanvas = async (page: Page, x: number, y: number): Promise<Point> => {
  const canvas = await boxOf(page.locator('.flow-foldkit-canvas'))

  return { x: canvas.x + x, y: canvas.y + y }
}

const drag = async (page: Page, from: Point, to: Point) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await page.mouse.up()
}

const handle = (page: Page, nodeId: string, handleId: string) =>
  page.locator(`[data-node-id="${nodeId}"] [data-handle-id="${handleId}"]`)

const connect = async (
  page: Page,
  [fromNode, fromHandle]: readonly [string, string],
  [toNode, toHandle]: readonly [string, string]
) =>
  drag(
    page,
    await centre(handle(page, fromNode, fromHandle)),
    await centre(handle(page, toNode, toHandle))
  )

/** Edge hit targets are zero-height for level edges, so click their midpoint. */
const edgePoint = async (page: Page, edgeId: string): Promise<Point> => {
  const box = await boxOf(
    page.locator(
      `.flow-foldkit-edge[data-edge-id="${edgeId}"] .flow-foldkit-edge-hit-target`
    )
  )

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const mount = async (page: Page, scenario: FoldkitEventsScenario) => {
  await page.goto('/test.html')
  await page.evaluate(async (name) => {
    const modulePath = '/e2e/events-and-changes-fixture.ts'
    const { mountFoldkitEventsFixture } = await import(modulePath)
    const host = document.querySelector<HTMLElement>('#app')

    if (host === null) {
      throw new Error('Missing Foldkit fixture host')
    }

    host.innerHTML = '<div id="events-fixture"></div>'

    const container = document.querySelector<HTMLElement>('#events-fixture')

    if (container === null) {
      throw new Error('Missing Foldkit events fixture container')
    }

    window.__flowFoldkitEvents = mountFoldkitEventsFixture(container, name)
  }, scenario)
  await expect(page.locator('.flow-foldkit-canvas')).toHaveCount(1)
  await expect(page.locator('.flow-foldkit-node').first()).toBeVisible()
}

const nodePosition = (page: Page, id: string) =>
  page.evaluate(
    (nodeId) =>
      window.__flowFoldkitEvents
        ?.document()
        .nodes.find((node) => node.id === nodeId)?.position,
    id
  )

const nodeSelected = (page: Page, id: string) =>
  page.evaluate(
    (nodeId) =>
      window.__flowFoldkitEvents
        ?.document()
        .nodes.find((node) => node.id === nodeId)?.selected,
    id
  )

const edgeCount = (page: Page) =>
  page.evaluate(() => window.__flowFoldkitEvents?.document().edges.length)

const nodeCount = (page: Page) =>
  page.evaluate(() => window.__flowFoldkitEvents?.document().nodes.length)

const viewportOf = (page: Page) =>
  page.evaluate(() => window.__flowFoldkitEvents?.viewport())

const viewportX = (page: Page) =>
  page.evaluate(() => window.__flowFoldkitEvents?.viewport().x)

const lastEvent = (page: Page, name: string) =>
  page.evaluate(
    (eventName) =>
      window.__flowFoldkitEvents
        ?.events()
        .findLast((event) => event.name === eventName),
    name
  )

const eventCount = (page: Page, name: string) =>
  page.evaluate(
    (eventName) =>
      window.__flowFoldkitEvents
        ?.events()
        .filter((event) => event.name === eventName).length,
    name
  )

const lastDelta = (page: Page) =>
  page.evaluate(() => window.__flowFoldkitEvents?.deltas().at(-1))

const nodeDeltaTypes = (page: Page) =>
  page.evaluate(() =>
    window.__flowFoldkitEvents
      ?.deltas()
      .flatMap(({ nodes }) => nodes.map(({ type }) => type))
  )

const limitEdges = (page: Page) =>
  page.evaluate(
    () =>
      window.__flowFoldkitEvents
        ?.document()
        .edges.filter(({ target }) => target === 'limit').length
  )

const droppedNode = (page: Page) =>
  page.evaluate(() =>
    window.__flowFoldkitEvents
      ?.document()
      .nodes.find(({ id }) => id.startsWith('dropped-'))
  )

const droppedEdgeSource = (page: Page) =>
  page.evaluate(
    () =>
      window.__flowFoldkitEvents
        ?.document()
        .edges.find(({ target }) => target.startsWith('dropped-'))?.source
  )

const temporaryData = (page: Page, source: string) =>
  page.evaluate(
    (sourceId) =>
      window.__flowFoldkitEvents
        ?.document()
        .edges.find(
          ({ source: from, target }) =>
            from === sourceId && target.startsWith('dropped-')
        )?.data,
    source
  )

test('Foldkit controlled documents follow element deltas through the update helper', async ({
  page,
}) => {
  await mount(page, 'controlled')

  const nodeA = page.locator('.flow-foldkit-node[data-node-id="a"]')
  const start = await centre(nodeA)
  await drag(page, start, { x: start.x + 80, y: start.y + 40 })
  await expect.poll(() => nodePosition(page, 'a')).toEqual({ x: 140, y: 120 })
  await expect.poll(() => centreX(nodeA)).toBeCloseTo(start.x + 80, 0)

  await connect(page, ['a', 'out'], ['b', 'in'])
  await expect.poll(() => edgeCount(page)).toBe(1)
  await expect(page.locator('.flow-foldkit-edge')).toHaveCount(1)
  await expect
    .poll(() => lastDelta(page))
    .toMatchObject({
      nodes: [],
      edges: [
        {
          type: 'add',
          item: {
            source: 'a',
            sourceHandle: 'out',
            target: 'b',
            targetHandle: 'in',
          },
        },
      ],
    })

  await nodeA.locator('.flow-foldkit-select-node').click()
  await expect.poll(() => nodeSelected(page, 'a')).toBe(true)
  await expect(nodeA.locator('.flow-foldkit-resize')).not.toHaveCount(0)
  expect(await lastDelta(page)).toMatchObject({
    nodes: expect.arrayContaining([
      { id: 'a', type: 'select', selected: true },
    ]),
  })
  expect(await nodeDeltaTypes(page)).toEqual(
    expect.arrayContaining(['position', 'select'])
  )
})

test('Foldkit runtime switches gate drag, connect and select without blocking pan or clicks', async ({
  page,
}) => {
  await mount(page, 'switches')

  const sourceHandle = handle(page, 'a', 'out')
  await expect(sourceHandle).toHaveClass(/\bconnectable\b/u)
  await expect(sourceHandle).toHaveClass(/\bconnectablestart\b/u)
  await expect(sourceHandle).toHaveClass(/\bconnectableend\b/u)

  await page.evaluate(() =>
    window.__flowFoldkitEvents?.setInteractivity({
      nodesDraggable: false,
      nodesConnectable: false,
      elementsSelectable: false,
    })
  )
  await expect(sourceHandle).not.toHaveClass(/\bconnectable\b/u)

  // A node that cannot be dragged lets the pointer pan the pane.
  const nodeA = page.locator('.flow-foldkit-node[data-node-id="a"]')
  const before = await nodePosition(page, 'a')
  const start = await centre(nodeA)
  await drag(page, start, { x: start.x + 60, y: start.y + 30 })
  await expect.poll(() => viewportX(page)).toBeGreaterThan(40)
  expect(await nodePosition(page, 'a')).toEqual(before)

  await connect(page, ['a', 'out'], ['b', 'in'])
  expect(await edgeCount(page)).toBe(0)

  // Selection is off, but node clicks still report to a registered click
  // consumer. Upstream NodeWrapper only admits pointer input on a fully
  // disabled node when onNodeClick is set (NodeWrapper/index.tsx:90).
  await page.evaluate(() =>
    window.__flowFoldkitEvents?.registerNodeClickHandler()
  )
  const clicks = (await eventCount(page, 'onNodeClick')) ?? 0
  await nodeA.click()
  await expect.poll(() => eventCount(page, 'onNodeClick')).toBe(clicks + 1)

  const select = nodeA.locator('.flow-foldkit-select-node')
  await expect(select).toHaveAttribute('aria-disabled', 'true')
  // aria-disabled controls refuse actionability checks; click anyway.
  await select.click({ force: true })
  await select.focus()
  await page.keyboard.press('Space')
  expect(await nodeSelected(page, 'a')).not.toBe(true)

  // The keyboard cannot start a connection either.
  await sourceHandle.focus()
  await page.keyboard.press('Enter')
  await handle(page, 'b', 'in').focus()
  await page.keyboard.press('Enter')
  expect(await edgeCount(page)).toBe(0)

  // Controls start from the switches: all off reads as locked.
  await page.evaluate(() => window.__flowFoldkitEvents?.mountControls())

  const lock = page.getByRole('button', { name: 'Toggle Interactivity' })
  await expect(lock).toHaveAttribute('aria-pressed', 'true')
  await lock.click()
  await expect(lock).toHaveAttribute('aria-pressed', 'false')
  await expect
    .poll(() =>
      page.evaluate(() => window.__flowFoldkitEvents?.interactivity())
    )
    .toEqual({
      nodesDraggable: true,
      nodesConnectable: true,
      elementsSelectable: true,
    })
  expect(
    await page.evaluate(() => window.__flowFoldkitEvents?.interactiveCalls())
  ).toEqual([true])
  await expect(sourceHandle).toHaveClass(/\bconnectable\b/u)
  await connect(page, ['a', 'out'], ['b', 'in'])
  await expect.poll(() => edgeCount(page)).toBe(1)
  await select.click()
  await expect.poll(() => nodeSelected(page, 'a')).toBe(true)
})

test('Foldkit isValidConnection validates targets and prevents cycles, with useConnection state', async ({
  page,
}) => {
  await mount(page, 'editor')

  // Validation: the blocked target is rejected, and the preview says so.
  const from = await centre(handle(page, 'c', 'out'))
  const to = await centre(handle(page, 'blocked', 'in'))
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await expect(
    page.locator('.flow-foldkit-connection-preview')
  ).toHaveAttribute('data-preview-valid', 'false')
  await expect
    .poll(() => page.evaluate(() => window.__flowFoldkitEvents?.connection()))
    .toMatchObject({
      inProgress: true,
      isValid: false,
      fromHandle: { nodeId: 'c', id: 'out', type: 'source' },
      toHandle: { nodeId: 'blocked', id: 'in' },
    })
  await page.mouse.up()
  await expect
    .poll(() =>
      page.evaluate(() => window.__flowFoldkitEvents?.connection().inProgress)
    )
    .toBe(false)
  expect(await edgeCount(page)).toBe(2)

  // Preventing Cycles: c -> a would close a -> b -> c.
  await connect(page, ['c', 'out'], ['a', 'in'])
  await expect
    .poll(() => lastEvent(page, 'onConnectEnd'))
    .toMatchObject({
      outcome: 'rejected',
      connectionState: {
        isValid: false,
        fromNodeId: 'c',
        toNodeId: 'a',
        toHandleId: 'in',
      },
    })
  expect(await edgeCount(page)).toBe(2)

  // A forward edge is fine.
  await connect(page, ['a', 'out'], ['c', 'in'])
  await expect.poll(() => edgeCount(page)).toBe(3)
})

test('Foldkit Connection Limit: a handle accepting one connection rejects the second', async ({
  page,
}) => {
  await mount(page, 'editor')

  const limit = handle(page, 'limit', 'in')
  await expect(limit).toHaveClass(/\bconnectableend\b/u)
  await connect(page, ['feeder', 'out'], ['limit', 'in'])
  await expect.poll(() => edgeCount(page)).toBe(3)
  await expect(limit).not.toHaveClass(/\bconnectable\b/u)
  await expect(limit).not.toHaveClass(/\bconnectableend\b/u)

  await connect(page, ['c', 'out'], ['limit', 'in'])
  await expect
    .poll(() => lastEvent(page, 'onConnectEnd'))
    .toMatchObject({
      outcome: 'rejected',
      connectionState: { fromNodeId: 'c', toNodeId: 'limit' },
    })
  expect(await edgeCount(page)).toBe(3)
  expect(await limitEdges(page)).toBe(1)
})

test('Foldkit Context Menu opens at the event position for nodes and edges', async ({
  page,
}) => {
  await mount(page, 'editor')
  await page.evaluate(() => {
    const defaults: boolean[] = []
    window.addEventListener('contextmenu', (event) => {
      defaults.push(event.defaultPrevented)
      document.body.dataset.contextDefaults = JSON.stringify(defaults)
    })
  })

  const point = await centre(
    page.locator('.flow-foldkit-node[data-node-id="b"]')
  )

  await page.mouse.click(point.x, point.y, { button: 'right' })

  const menu = page.locator('.fixture-context-menu')
  await expect(menu).toBeVisible()
  await expect
    .poll(() => lastEvent(page, 'onNodeContextMenu'))
    .toMatchObject({
      nodeId: 'b',
      button: 2,
      clientX: point.x,
      clientY: point.y,
    })
  expect(await lastEvent(page, 'onSelectionContextMenu')).toMatchObject({
    nodeId: 'b',
  })

  const box = await boxOf(menu)
  expect(box.x).toBeCloseTo(point.x, 0)
  expect(box.y).toBeCloseTo(point.y, 0)

  await menu.getByRole('menuitem', { name: 'Duplicate' }).click()
  await expect(menu).toHaveCount(0)
  await expect
    .poll(() => nodePosition(page, 'b-copy'))
    .toEqual({ x: 300, y: 100 })

  // Edge menu: dismissed with Escape, nothing changes.
  const edge = await edgePoint(page, 'ab')
  await page.mouse.click(edge.x, edge.y, { button: 'right' })
  await expect(menu).toBeVisible()
  expect(await lastEvent(page, 'onEdgeContextMenu')).toMatchObject({
    edgeId: 'ab',
  })
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  expect(await edgeCount(page)).toBe(2)
  expect(await nodeCount(page)).toBe(7)

  // Pane menu events carry the position too.
  const pane = await inCanvas(page, 700, 340)
  await page.mouse.click(pane.x, pane.y, { button: 'right' })
  await expect
    .poll(() => lastEvent(page, 'onPaneContextMenu'))
    .toMatchObject({
      clientX: pane.x,
      clientY: pane.y,
    })
  await expect(page.locator('body')).toHaveAttribute(
    'data-context-defaults',
    '[true,true,true]'
  )
})

test('Foldkit Add Node On Edge Drop and Temporary Edges use the connect end payload', async ({
  page,
}) => {
  await mount(page, 'editor')

  const drop = await inCanvas(page, 720, 340)
  await page.evaluate(() => window.__flowFoldkitEvents?.setDropMode('add'))
  await drag(page, await centre(handle(page, 'c', 'out')), drop)

  await expect
    .poll(() => lastEvent(page, 'onConnectEnd'))
    .toMatchObject({
      clientX: drop.x,
      clientY: drop.y,
      connectionState: {
        isValid: null,
        fromNodeId: 'c',
        fromHandleId: 'out',
        toNodeId: null,
      },
    })
  await expect.poll(() => droppedEdgeSource(page)).toBe('c')

  // The node sits at screenToFlow(client position).
  const dropped = await droppedNode(page)
  const pan = await viewportOf(page)
  const origin = await inCanvas(page, 0, 0)

  expect(dropped?.position.x).toBeCloseTo(drop.x - origin.x - (pan?.x ?? 0), 0)
  expect(dropped?.position.y).toBeCloseTo(drop.y - origin.y - (pan?.y ?? 0), 0)

  // Temporary Edges: accept keeps the edge, cancel leaves nothing behind.
  await page.evaluate(() =>
    window.__flowFoldkitEvents?.setDropMode('temporary')
  )
  await drag(
    page,
    await centre(handle(page, 'a', 'out')),
    await inCanvas(page, 700, 200)
  )
  await expect.poll(() => temporaryData(page, 'a')).toEqual({ temporary: true })
  await page.evaluate(() => window.__flowFoldkitEvents?.acceptTemporary())
  await expect
    .poll(() => temporaryData(page, 'a'))
    .toEqual({ temporary: false })

  const edgesBefore = (await edgeCount(page)) ?? 0
  const nodesBefore = await nodeCount(page)
  await drag(
    page,
    await centre(handle(page, 'b', 'out')),
    await inCanvas(page, 760, 460)
  )
  await expect.poll(() => edgeCount(page)).toBe(edgesBefore + 1)
  await page.evaluate(() => window.__flowFoldkitEvents?.cancelTemporary())
  await expect.poll(() => edgeCount(page)).toBe(edgesBefore)
  expect(await nodeCount(page)).toBe(nodesBefore)
})

test('Foldkit interaction events carry mouse fields, dragged node ids and selection changes', async ({
  page,
}) => {
  await mount(page, 'editor')

  const nodeA = page.locator('.flow-foldkit-node[data-node-id="a"]')
  const point = await centre(nodeA)
  await page.keyboard.down('Shift')
  await page.mouse.click(point.x, point.y)
  await page.keyboard.up('Shift')
  await expect
    .poll(() => lastEvent(page, 'onNodeClick'))
    .toMatchObject({
      nodeId: 'a',
      button: 0,
      shiftKey: true,
      altKey: false,
      clientX: point.x,
      clientY: point.y,
    })
  expect(await lastEvent(page, 'onNodeMouseEnter')).toMatchObject({
    nodeId: 'a',
    clientX: expect.any(Number),
  })
  // A plain click selects the clicked node (Shift is not a multi-select key).
  await expect
    .poll(() => lastEvent(page, 'onSelectionChange'))
    .toMatchObject({ nodeIds: ['a'], edgeIds: [] })

  const pane = await inCanvas(page, 700, 340)
  await page.mouse.click(pane.x, pane.y)
  await expect
    .poll(() => lastEvent(page, 'onPaneClick'))
    .toMatchObject({
      clientX: pane.x,
      clientY: pane.y,
    })

  await drag(page, point, { x: point.x + 20, y: point.y + 60 })
  await expect
    .poll(() => lastEvent(page, 'onNodeDragStop'))
    .toMatchObject({
      nodeId: 'a',
      nodeIds: ['a'],
      outcome: 'accepted',
    })
  expect(await lastEvent(page, 'onNodeDragStart')).toMatchObject({
    nodeIds: ['a'],
  })

  await page
    .locator('.flow-foldkit-node[data-node-id="b"] .flow-foldkit-select-node')
    .click()
  await expect
    .poll(() => lastEvent(page, 'onSelectionChange'))
    .toMatchObject({
      nodeIds: ['a', 'b'],
      edgeIds: [],
    })

  const edge = await edgePoint(page, 'bc')
  await page.mouse.click(edge.x, edge.y)
  await expect
    .poll(() => lastEvent(page, 'onEdgeClick'))
    .toMatchObject({
      edgeId: 'bc',
      button: 0,
      clientX: edge.x,
      clientY: edge.y,
    })
  await expect
    .poll(() => lastEvent(page, 'onSelectionChange'))
    .toMatchObject({ edgeIds: ['bc'] })
})

const interactivityOf = (page: Page) =>
  page.evaluate(() => window.__flowFoldkitEvents?.interactivity())

const lastEnd = (page: Page) =>
  page.evaluate(() =>
    window.__flowFoldkitEvents
      ?.events()
      .findLast((event) => event.name === 'onConnectEnd')
  )

test('Foldkit switches come from the Runtime and the lock follows app changes', async ({
  page,
}) => {
  // The program starts with nodesDraggable false; the client gets no initial value.
  await mount(page, 'fixed')
  await expect
    .poll(() => interactivityOf(page))
    .toEqual({
      nodesDraggable: false,
      nodesConnectable: true,
      elementsSelectable: true,
    })

  // A partial patch keeps the Runtime's other switches.
  await page.evaluate(() =>
    window.__flowFoldkitEvents?.setInteractivity({ elementsSelectable: false })
  )
  await expect
    .poll(() => interactivityOf(page))
    .toEqual({
      nodesDraggable: false,
      nodesConnectable: true,
      elementsSelectable: false,
    })

  await page.evaluate(() => window.__flowFoldkitEvents?.mountControls())

  const lock = page.getByRole('button', { name: 'Toggle Interactivity' })
  await expect(lock).toHaveAttribute('aria-pressed', 'false')

  // The lock re-renders when the app changes the switches itself.
  await page.evaluate(() =>
    window.__flowFoldkitEvents?.setInteractivity({ nodesConnectable: false })
  )
  await expect(lock).toHaveAttribute('aria-pressed', 'true')
  await page.evaluate(() =>
    window.__flowFoldkitEvents?.setInteractivity({ nodesDraggable: true })
  )
  await expect(lock).toHaveAttribute('aria-pressed', 'false')
})

test('Foldkit ends a pending click connection when switches or targets change', async ({
  page,
}) => {
  await mount(page, 'switches')

  const starts = () => eventCount(page, 'onConnectStart')

  await handle(page, 'a', 'out').click()
  await expect.poll(starts).toBe(1)
  await page.evaluate(() =>
    window.__flowFoldkitEvents?.setInteractivity({ nodesConnectable: false })
  )
  await expect
    .poll(() => lastEnd(page))
    .toMatchObject({
      phase: 'end',
      outcome: 'cancelled',
      reason: 'interactivity-changed',
    })

  await page.evaluate(() =>
    window.__flowFoldkitEvents?.setInteractivity({ nodesConnectable: true })
  )
  await handle(page, 'a', 'out').click()
  await expect.poll(starts).toBe(2)
  await page.evaluate(() =>
    window.__flowFoldkitEvents?.setAllowedTargets(['b'])
  )
  await expect
    .poll(() => lastEnd(page))
    .toMatchObject({
      phase: 'end',
      outcome: 'cancelled',
      reason: 'allowed-targets-changed',
    })
  expect(await eventCount(page, 'onConnectEnd')).toBe(2)
})
