import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import type {
  EventsFixture,
  EventsFixtureOptions,
} from '../src/events-and-changes-fixture.ts'

declare global {
  var eventsFixture: EventsFixture | undefined
}

const mount = async (page: Page, options: EventsFixtureOptions) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async (fixtureOptions) => {
    const modulePath = '/src/events-and-changes-fixture.ts'
    const { mountEventsFixture } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing host')
    }

    globalThis.eventsFixture = mountEventsFixture(root, fixtureOptions)
  }, options)
}

const centre = async (locator: Locator) => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Expected a rendered element')
  }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** A point on the node label, clear of its handles and nodrag button. */
const grip = async (locator: Locator) => {
  const label = locator.locator('span').first()
  const box = await label.boundingBox()

  if (box === null) {
    throw new Error('Expected a rendered label')
  }

  return { x: box.x + 4, y: box.y + box.height / 2 }
}

const clickAt = (page: Page, point: { x: number; y: number }) =>
  page.mouse.click(point.x, point.y)

/** Real mouse drag that crosses the default 1px thresholds before moving on. */
const drag = async (
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number }
) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move(to.x, to.y, { steps: 6 })
  await page.mouse.up()
}

const handle = (page: Page, nodeId: string, handleId: string) =>
  page.locator(`[data-node-id="${nodeId}"] [data-handle-id="${handleId}"]`)

const node = (page: Page, nodeId: string) =>
  page.locator(`.flow-node[data-node-id="${nodeId}"]`)

const connect = async (page: Page, from: Locator, to: Locator) =>
  drag(page, await centre(from), await centre(to))

const edgeIds = (page: Page) =>
  page.evaluate(() =>
    globalThis.eventsFixture?.controller.getEdges().map(({ id }) => id)
  )

const nodePosition = (page: Page, id: string) =>
  page.evaluate(
    (nodeId) => globalThis.eventsFixture?.controller.getNode(nodeId)?.position,
    id
  )

test.describe('Vanilla events, changes and connection rules', () => {
  test('controlled deltas round-trip through createFlowNodesState and createFlowEdgesState', async ({
    page,
  }) => {
    await mount(page, { recipe: 'controlled' })

    const before = await nodePosition(page, 'a')
    const start = await grip(node(page, 'a'))
    await drag(page, start, { x: start.x + 80, y: start.y + 40 })

    await expect.poll(() => nodePosition(page, 'a')).not.toEqual(before)

    const changes = await page.evaluate(() => ({
      nodes: globalThis.eventsFixture?.nodeChanges,
      flow: globalThis.eventsFixture?.flowChanges.map(({ kind }) => kind),
      drags: globalThis.eventsFixture?.drags.length,
    }))

    expect(changes.nodes?.flat()).toContainEqual(
      expect.objectContaining({ id: 'a', type: 'position' })
    )
    expect(changes.flow).toContain('node-position')
    // A single-node drag is not a selection drag.
    expect(changes.drags).toBe(0)

    await clickAt(page, await grip(node(page, 'b')))
    await expect
      .poll(() =>
        page.evaluate(
          () => globalThis.eventsFixture?.controller.getNode('b')?.selected
        )
      )
      .toBe(true)

    await connect(page, handle(page, 'a', 'out'), handle(page, 'b', 'in'))
    await expect.poll(() => edgeIds(page)).toHaveLength(1)
    await expect(page.locator('.flow-edge-group')).toHaveCount(1)
    expect(
      await page.evaluate(() =>
        globalThis.eventsFixture?.edgeChanges.flat().map(({ type }) => type)
      )
    ).toContain('add')
  })

  test('runtime switches drive the Controls lock without blocking pan or node controls', async ({
    page,
  }) => {
    // Existing switches decide the initial lock state.
    await mount(page, {
      recipe: 'controlled',
      nodesDraggable: false,
      nodesConnectable: false,
      elementsSelectable: false,
    })

    const lock = page.getByRole('button', { name: 'Toggle interactivity' })
    await expect(lock).toHaveAttribute('aria-pressed', 'true')
    await expect(handle(page, 'a', 'out')).not.toHaveClass(/connectable/u)

    await lock.click()
    await expect(lock).toHaveAttribute('aria-pressed', 'false')
    await expect(handle(page, 'a', 'out')).toHaveClass(/connectablestart/u)
    expect(
      await page.evaluate(() =>
        globalThis.eventsFixture?.controller.getInteractivity()
      )
    ).toEqual({
      nodesDraggable: true,
      nodesConnectable: true,
      elementsSelectable: true,
    })

    await lock.click()
    await expect(lock).toHaveAttribute('aria-pressed', 'true')
    expect(
      await page.evaluate(() => globalThis.eventsFixture?.interactiveCalls)
    ).toEqual([true, false])

    // Dragging a locked node pans the viewport and leaves the node in place.
    const before = await nodePosition(page, 'a')
    const start = await grip(node(page, 'a'))
    await drag(page, start, { x: start.x + 60, y: start.y + 30 })

    await expect
      .poll(() =>
        page.evaluate(() => globalThis.eventsFixture?.controller.getViewport())
      )
      .toEqual({ x: 60, y: 30, zoom: 1 })
    expect(await nodePosition(page, 'a')).toEqual(before)

    // Clicks still report, but do not select; keyboard selection is blocked.
    await clickAt(page, await grip(node(page, 'b')))
    await node(page, 'b').focus()
    await page.keyboard.press('Enter')
    expect(
      await page.evaluate(() => ({
        clicks: globalThis.eventsFixture?.nodeClicks,
        selected: globalThis.eventsFixture?.controller.getNode('b')?.selected,
      }))
    ).toEqual({ clicks: ['b'], selected: undefined })

    // Controls inside nodes keep working.
    await page.getByRole('button', { name: 'act-b' }).click()
    expect(
      await page.evaluate(() => globalThis.eventsFixture?.buttonClicks())
    ).toBe(1)

    // Connections cannot start, and shift box selection does not select.
    await connect(page, handle(page, 'a', 'out'), handle(page, 'b', 'in'))
    expect(await edgeIds(page)).toEqual([])

    const pane = await page.getByTestId('flow-canvas').boundingBox()

    if (pane === null) {
      throw new Error('Missing canvas')
    }

    await page.keyboard.down('Shift')
    await drag(
      page,
      { x: pane.x + 5, y: pane.y + 5 },
      { x: pane.x + pane.width - 5, y: pane.y + pane.height - 60 }
    )
    await page.keyboard.up('Shift')
    expect(
      await page.evaluate(() =>
        globalThis.eventsFixture?.controller
          .getNodes()
          .filter(({ selected }) => selected === true)
          .map(({ id }) => id)
      )
    ).toEqual([])
  })

  test('Connection Limit: a handle stops accepting after its limit', async ({
    page,
  }) => {
    await mount(page, { recipe: 'connection-limit' })

    await connect(page, handle(page, 'a', 'out'), handle(page, 'b', 'in'))
    await expect.poll(() => edgeIds(page)).toHaveLength(1)
    await expect(handle(page, 'b', 'in')).not.toHaveClass(/connectableend/u)

    await connect(page, handle(page, 'c', 'out'), handle(page, 'b', 'in'))
    await expect.poll(() => edgeIds(page)).toHaveLength(1)

    const last = await page.evaluate(() => {
      const ends = globalThis.eventsFixture?.connectEnds ?? []

      return ends.at(-1)?.outcome
    })

    expect(last).toBe('rejected')
  })

  test('Add Node On Edge Drop: the drop position and connection state add a node', async ({
    page,
  }) => {
    await mount(page, { recipe: 'add-node-on-drop' })

    const from = await centre(handle(page, 'a', 'out'))
    const drop = { x: from.x + 200, y: from.y + 220 }

    // The connection state reports the drag while it is in progress.
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(from.x + 3, from.y + 3)
    await page.mouse.move(drop.x, drop.y, { steps: 6 })

    expect(
      await page.evaluate(() => {
        const state = globalThis.eventsFixture?.controller.getConnection()

        return {
          inProgress: state?.inProgress,
          fromNode: state?.fromNode?.id,
          fromHandle: state?.fromHandle?.id,
          toHandle: state?.toHandle,
        }
      })
    ).toEqual({
      inProgress: true,
      fromNode: 'a',
      fromHandle: 'out',
      toHandle: null,
    })

    await page.mouse.up()

    await expect.poll(() => edgeIds(page)).toEqual(['drop-1-edge'])

    const end = await page.evaluate(() => {
      const payload = globalThis.eventsFixture?.connectEnds.at(-1)

      return {
        outcome: payload?.outcome,
        clientPosition: payload?.clientPosition,
        position: payload?.position,
        hasEvent: payload?.event instanceof MouseEvent,
        inProgress: payload?.connectionState
          ? 'inProgress' in payload.connectionState
          : undefined,
        fromNode: payload?.connectionState.fromNode?.id,
        toPosition: payload?.connectionState.toPosition,
        node: globalThis.eventsFixture?.controller.getNode('drop-1')?.position,
      }
    })

    expect(end).toMatchObject({
      outcome: 'cancelled',
      clientPosition: drop,
      hasEvent: true,
      inProgress: false,
      fromNode: 'a',
      toPosition: null,
    })
    expect(end.node).toEqual(end.position)
    expect(
      await page.evaluate(() => globalThis.eventsFixture?.connections.at(-1))
    ).toMatchObject({ inProgress: false })
  })

  test('Temporary Edges: a dropped connection stays pending until accepted or cancelled', async ({
    page,
  }) => {
    await mount(page, { recipe: 'temporary-edges' })

    const from = await centre(handle(page, 'a', 'out'))
    await drag(page, from, { x: from.x + 200, y: from.y + 220 })

    await expect.poll(() => edgeIds(page)).toEqual(['temp-edge'])
    expect(
      await page.evaluate(
        () => globalThis.eventsFixture?.controller.getEdge('temp-edge')?.data
      )
    ).toEqual({ temporary: true })

    await page.evaluate(() => globalThis.eventsFixture?.acceptTemporary())
    await expect
      .poll(() =>
        page.evaluate(
          () => globalThis.eventsFixture?.controller.getEdge('temp-edge')?.data
        )
      )
      .toBeUndefined()
    expect(await edgeIds(page)).toEqual(['temp-edge'])

    // A second pending edge is cancelled and leaves nothing behind.
    await page.evaluate(() => globalThis.eventsFixture?.cancelTemporary())
    await expect.poll(() => edgeIds(page)).toEqual([])

    await drag(page, await centre(handle(page, 'c', 'out')), {
      x: from.x + 260,
      y: from.y + 260,
    })
    await expect.poll(() => edgeIds(page)).toEqual(['temp-edge'])
    await page.evaluate(() => globalThis.eventsFixture?.cancelTemporary())
    await expect.poll(() => edgeIds(page)).toEqual([])
    await expect(node(page, 'temp')).toHaveCount(0)
  })

  test('reconnect and group drag payloads carry the old edge and dragged nodes', async ({
    page,
  }) => {
    await mount(page, { recipe: 'payloads' })

    await page.evaluate(() =>
      globalThis.eventsFixture?.controller.updateEdge('e1', { selected: true })
    )

    const anchor = page.locator(
      '[data-testid="flow-edge-reconnect-anchor"][data-endpoint="target"]'
    )

    await drag(
      page,
      await centre(anchor),
      await centre(handle(page, 'd', 'in'))
    )

    await expect
      .poll(() => page.evaluate(() => globalThis.eventsFixture?.reconnects))
      .toEqual([
        {
          edge: expect.objectContaining({ source: 'a', target: 'd' }),
          details: {
            oldEdge: expect.objectContaining({ id: 'e1', target: 'b' }),
            newConnection: {
              source: 'a',
              sourceHandle: 'out',
              target: 'd',
              targetHandle: 'in',
            },
          },
        },
      ])

    // Group drag: both selected nodes arrive in the payload at their drag positions.
    await page.evaluate(() => {
      const controller = globalThis.eventsFixture?.controller
      controller?.updateNode('a', { selected: true })
      controller?.updateNode('c', { selected: true })
    })

    const start = await grip(node(page, 'a'))
    await drag(page, start, { x: start.x + 40, y: start.y + 20 })

    await expect
      .poll(() =>
        page.evaluate(() =>
          globalThis.eventsFixture?.drags
            .at(-1)
            ?.nodes.map(({ id, position }) => ({
              id,
              position,
            }))
        )
      )
      .toEqual([
        { id: 'a', position: { x: 100, y: 80 } },
        { id: 'c', position: { x: 100, y: 280 } },
      ])
  })
})
