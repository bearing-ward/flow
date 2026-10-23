import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import type { ClosingCanvasOptions } from '../src/closing-gaps-test.ts'

const mount = async (page: Page, options: ClosingCanvasOptions = {}) => {
  await page.goto('/test.html')
  await page.evaluate(async (initial) => {
    const { mountClosingGapsFixture } =
      await import('../src/closing-gaps-test.ts')

    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing fixture root')
    }

    mountClosingGapsFixture(root, initial)
  }, options)
  await expect(page.locator('[data-node-id="a"]').first()).toBeVisible()
}

const boxOf = async (locator: Locator) => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Missing rendered box')
  }

  return box
}

const viewport = (page: Page) =>
  page.evaluate(() => window.__flowVueClosing?.flow().viewport.value)

const viewportX = async (page: Page) => {
  const value = await viewport(page)

  return value?.x
}

const position = (page: Page, selectedId = 'a') =>
  page.evaluate(
    (nodeId) =>
      window.__flowVueClosing
        ?.flow()
        .getNodes()
        .find(({ id }) => id === nodeId)?.position,
    selectedId
  )

const events = (page: Page) =>
  page.evaluate(() => window.__flowVueClosing?.events())

const frames = (page: Page) =>
  page.evaluate(
    () =>
      // eslint-disable-next-line promise/avoid-new -- The test waits for real rendering frames, not a wall-clock sleep.
      new Promise<void>((resolve) => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
      })
  )

test('node and edge roles, label and description render from the model', async ({
  page,
}) => {
  await mount(page)
  const node = page.locator('[data-node-id="a"]')
  await expect(node).toHaveAttribute('aria-label', 'Custom alpha')
  await expect(node).toHaveAttribute(
    'aria-description',
    'Custom node description'
  )
  await expect(node).toHaveAttribute('role', 'article')
  await expect(node).not.toHaveAttribute('aria-describedby')
  await expect(page.locator('[data-node-id="b"]')).toHaveAttribute(
    'role',
    'group'
  )
  await expect(page.locator('[data-flow-edge-hit="ab"]')).toHaveAttribute(
    'role',
    'link'
  )

  const anchor = page.locator(
    '[data-testid="flow-edge-reconnect-anchor"][data-endpoint="source"]'
  )

  await expect(anchor).toHaveAttribute('r', '10')
  await expect(anchor).toHaveAttribute('cx', '215')
})

test('configured node description and live message accompany selected-node arrow movement', async ({
  page,
}) => {
  await mount(page, { snapGrid: [15, 25], snapToGrid: false })
  await expect(page.getByTestId('flow-node-description')).toHaveText(
    'Use arrows to move'
  )
  await page.locator('[data-node-id="a"]').focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => position(page)).toEqual({ x: 85, y: 100 })
  await expect(page.getByTestId('flow-aria-live')).toHaveText('right:80,100')
  await page.keyboard.press('Shift+ArrowDown')
  await expect.poll(() => position(page)).toEqual({ x: 85, y: 120 })
  await expect(page.getByTestId('flow-aria-live')).toHaveText('down:85,100')
  await expect(page.getByTestId('flow-aria-live')).toHaveAttribute(
    'aria-live',
    'assertive'
  )
})

test('disableKeyboardA11y prevents arrow movement, selection and focus pan', async ({
  page,
}) => {
  await mount(page, { disableKeyboardA11y: true })
  await expect(page.getByTestId('flow-node-description')).toHaveText(
    'Selection only'
  )
  await expect(page.getByTestId('flow-aria-live')).toHaveCount(0)
  await page.locator('[data-node-id="b"]').focus()
  await page.keyboard.press('Enter')
  expect(
    await page.evaluate(
      () =>
        window.__flowVueClosing
          ?.flow()
          .getNodes()
          .find(({ id }) => id === 'b')?.selected
    )
  ).not.toBe(true)
  await page.locator('[data-node-id="a"]').focus()
  await page.keyboard.press('ArrowRight')
  expect(await position(page)).toEqual({ x: 80, y: 100 })
  expect(
    await page.evaluate(
      () =>
        window.__flowVueClosing
          ?.flow()
          .getNodes()
          .find(({ id }) => id === 'a')?.selected
    )
  ).toBe(true)
  await page.keyboard.press('Tab')
  await page.locator('[data-node-id="offscreen"]').focus()
  expect(await viewport(page)).toEqual({ x: 0, y: 0, zoom: 1 })
})

for (const enabled of [true, false]) {
  test(`keyboard focus auto-pan ${enabled ? 'centres offscreen nodes' : 'can be disabled'}`, async ({
    page,
  }) => {
    await mount(page, { autoPanOnNodeFocus: enabled })
    await page.keyboard.press('Tab')
    await page.locator('[data-node-id="offscreen"]').focus()

    if (enabled) {
      await expect
        .poll(() => viewport(page))
        .toEqual({ x: -960, y: -670, zoom: 1 })
    } else {
      expect(await viewport(page)).toEqual({ x: 0, y: 0, zoom: 1 })
    }
  })

  test(`node drag auto-pan ${enabled ? 'continues at the edge and commits its compensated position' : 'can be disabled'}`, async ({
    page,
  }) => {
    await mount(page, { autoPanOnNodeDrag: enabled, autoPanSpeed: 8 })
    const node = await boxOf(page.locator('[data-node-id="a"]'))
    const canvas = await boxOf(page.getByTestId('flow-canvas'))
    const from = { x: node.x + 60, y: node.y + 30 }
    const to = { x: canvas.x + canvas.width - 5, y: from.y }
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(from.x + 3, from.y)
    await page.mouse.move(to.x, to.y)

    if (enabled) {
      await expect.poll(async () => await viewportX(page)).toBeLessThan(-8)
    } else {
      await frames(page)
      expect(await viewport(page)).toEqual({ x: 0, y: 0, zoom: 1 })
    }

    await page.mouse.up()
    await expect.poll(() => events(page)).toContain('drag-stop')
    const finalViewport = await viewport(page)
    const finalPosition = await position(page)
    expect((finalPosition?.x ?? 0) + (finalViewport?.x ?? 0)).toBeCloseTo(
      80 + to.x - from.x,
      0
    )
    await frames(page)
    expect(await viewport(page)).toEqual(finalViewport)
  })

  test(`selection auto-pan ${enabled ? 'continues with a stationary pointer and selects offscreen content' : 'can be disabled'}`, async ({
    page,
  }) => {
    await mount(page, {
      autoPanOnSelection: enabled,
      selectionOnDrag: true,
      autoPanSpeed: 80,
    })
    const canvas = await boxOf(page.getByTestId('flow-canvas'))
    await page.mouse.move(canvas.x + 40, canvas.y + 40)
    await page.mouse.down()
    await page.mouse.move(
      canvas.x + canvas.width - 4,
      canvas.y + canvas.height - 4
    )

    if (enabled) {
      await expect.poll(async () => await viewportX(page)).toBeLessThan(-900)
    } else {
      await frames(page)
      expect(await viewport(page)).toEqual({ x: 0, y: 0, zoom: 1 })
    }

    await page.mouse.up()
    // Untouched unselected nodes retain absent flags, including when auto-pan
    // is disabled (pinned packages/react/src/utils/changes.ts:245-257).
    expect(
      await page.evaluate(
        () =>
          window.__flowVueClosing
            ?.flow()
            .getNodes()
            .find(({ id }) => id === 'offscreen')?.selected
      )
    ).toBe(enabled ? true : undefined)
    const final = await viewport(page)
    await frames(page)
    expect(await viewport(page)).toEqual(final)
  })
}

for (const interrupt of ['unmount', 'replace'] as const) {
  test(`node auto-pan stops if a move listener ${interrupt === 'unmount' ? 'unmounts the canvas' : 'replaces the graph'}`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await mount(page, { interruptPan: interrupt })
    const node = await boxOf(page.locator('[data-node-id="a"]'))
    const canvas = await boxOf(page.getByTestId('flow-canvas'))
    await page.mouse.move(node.x + 40, node.y + 30)
    await page.mouse.down()
    await page.mouse.move(canvas.x + canvas.width - 5, node.y + 30)
    await expect(page.getByTestId('flow-node')).toHaveCount(0)
    await page.mouse.up()
    await frames(page)
    const recorded = await events(page)
    expect(recorded?.filter((event) => event === 'move')).toHaveLength(1)
    expect(errors).toEqual([])
  })
}

for (const distance of [0, 10]) {
  test(`pane and node click distances ${distance} suppress only clicks beyond travel`, async ({
    page,
  }) => {
    await mount(page, {
      nodeClickDistance: distance,
      paneClickDistance: distance,
      nodeDragThreshold: 100,
    })
    const node = await boxOf(page.locator('[data-node-id="a"]'))
    const canvas = await boxOf(page.getByTestId('flow-canvas'))
    await page.mouse.move(node.x + 40, node.y + 25)
    await page.mouse.down()
    await page.mouse.move(node.x + 45, node.y + 25)
    await page.mouse.up()
    await page.mouse.move(canvas.x + 40, canvas.y + 350)
    await page.mouse.down()
    await page.mouse.move(canvas.x + 45, canvas.y + 350)
    await page.mouse.up()
    const recorded = await events(page)
    expect(recorded?.filter((event) => event === 'node-click')).toHaveLength(
      distance === 0 ? 0 : 1
    )
    expect(recorded?.filter((event) => event === 'pane-click')).toHaveLength(
      distance === 0 ? 0 : 1
    )
  })
}

test('connection container style and reconnect radius reach the rendered SVG', async ({
  page,
}) => {
  await mount(page, { reconnectRadius: 16 })

  const anchor = page.locator(
    '[data-testid="flow-edge-reconnect-anchor"][data-endpoint="source"]'
  )

  await expect(anchor).toHaveAttribute('r', '16')
  await expect(anchor).toHaveAttribute('cx', '221')
  await page.evaluate(() =>
    window.__flowVueClosing?.configure({ reconnectRadius: 8 })
  )
  await expect(anchor).toHaveAttribute('r', '8')
  await expect(anchor).toHaveAttribute('cx', '213')

  const source = await boxOf(
    page.locator('[data-node-id="a"] [data-handle-id="out"]')
  )

  await page.mouse.move(
    source.x + source.width / 2,
    source.y + source.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(source.x + 70, source.y + 40)
  await expect(page.getByTestId('flow-connection-line-container')).toHaveCSS(
    'opacity',
    '0.4'
  )
  await expect(page.getByTestId('flow-connection-preview')).toHaveCSS(
    'stroke',
    'rgb(255, 0, 114)'
  )
  await page.keyboard.press('Escape')
  await page.mouse.up()
})

for (const field of [
  'input',
  'textarea',
  'select',
  'editable',
  'plaintext',
  'noneditable',
  'panel',
  'label',
  'shadow',
  'null',
  'modifier',
  'extra-key',
] as const) {
  test(`delete guard protects ${field} until a confirmed positive delete`, async ({
    page,
  }) => {
    await mount(page, field === 'null' ? { deleteKeyCode: null } : {})
    await page.evaluate((kind) => {
      if (kind === 'panel' || kind === 'label') {
        document
          .querySelector<HTMLElement>(
            `[data-testid="${kind === 'panel' ? 'panel' : 'edge-label'}-input"]`
          )
          ?.focus()

        return
      }

      let tag = 'div'

      if (kind === 'textarea' || kind === 'select') {
        tag = kind
      } else if (kind === 'input' || kind === 'shadow') {
        tag = 'input'
      }

      const element = document.createElement(tag)

      element.tabIndex = 0

      if (
        kind === 'editable' ||
        kind === 'plaintext' ||
        kind === 'noneditable'
      ) {
        let editable = 'false'

        if (kind === 'editable') {
          editable = 'true'
        } else if (kind === 'plaintext') {
          editable = 'plaintext-only'
        }

        element.setAttribute('contenteditable', editable)
      }

      if (kind === 'shadow') {
        const host = document.createElement('div')
        document.querySelector('[data-primary-canvas]')?.append(host)
        host.attachShadow({ mode: 'open' }).append(element)
      } else {
        document.body.append(element)
      }

      element.focus()
    }, field)

    if (field === 'extra-key') {
      await page.keyboard.down('a')
    }

    await page.keyboard.press(
      field === 'modifier' ? 'Meta+Backspace' : 'Backspace'
    )

    if (field === 'extra-key') {
      await page.keyboard.up('a')
    }

    await frames(page)
    // A real deletion after the guarded event proves the asynchronous delete path has completed.
    await page.evaluate(async () => {
      const flow = window.__flowVueClosing?.flow()
      await flow?.applyEdit({
        operations: [
          {
            kind: 'set-nodes',
            nodes: flow
              .getNodes()
              .map((node) => ({ ...node, selected: node.id === 'b' })),
          },
        ],
      })
      window.__flowVueClosing?.configure({ deleteKeyCode: 'Delete' })
      document
        .querySelector<HTMLElement>('[data-testid="outside-button"]')
        ?.focus()
    })
    await page.keyboard.press('Delete')
    await expect(page.locator('[data-node-id="b"]')).toHaveCount(0)
    await expect(page.locator('[data-node-id="a"]')).toHaveCount(1)
    await expect(page.locator('[data-flow-edge-hit="ab"]')).toHaveCount(0)
  })
}

test('document deletion accepts an exact configured modifier combination', async ({
  page,
}) => {
  await mount(page, { deleteKeyCode: 'Meta+Backspace' })
  await page.getByTestId('outside-button').focus()
  await page.keyboard.press('Meta+Backspace')
  await expect(page.locator('[data-node-id="a"]')).toHaveCount(0)
})

for (const layout of ['siblings', 'nested'] as const) {
  test(`Delete belongs to the focused ${layout} canvas, including outside controls`, async ({
    page,
  }) => {
    await mount(page, { deleteKeyCode: 'Delete', multipleCanvases: layout })
    const primary = page.locator('[data-primary-canvas]')
    const secondary = page.getByTestId('secondary-canvas')
    await secondary.locator('[data-node-id="a"]').focus()
    await page.keyboard.press('Delete')
    await expect(secondary.locator('[data-node-id="a"]')).toHaveCount(0)
    await expect(primary.locator('[data-node-id="a"]')).toHaveCount(1)
    await primary.locator('[data-node-id="a"]').focus()
    await page.getByTestId('outside-button').focus()
    await page.keyboard.press('Delete')
    await expect(primary.locator('[data-node-id="a"]')).toHaveCount(0)
    await expect(secondary.locator('[data-node-id="b"]')).toHaveCount(1)
  })
}

test('click-distance equality counts as a click and an excursion followed by return does not', async ({
  page,
}) => {
  await mount(page, {
    nodeClickDistance: 10,
    paneClickDistance: 10,
    nodeDragThreshold: 100,
  })
  const node = await boxOf(page.locator('[data-node-id="a"]'))
  const canvas = await boxOf(page.getByTestId('flow-canvas'))

  const checkFrom = async (from: {
    readonly x: number
    readonly y: number
  }) => {
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(from.x + 10, from.y)
    await page.mouse.up()
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(from.x + 20, from.y)
    await page.mouse.move(from.x, from.y)
    await page.mouse.up()
  }

  await checkFrom({ x: node.x + 40, y: node.y + 25 })
  await checkFrom({ x: canvas.x + 40, y: canvas.y + 350 })

  const recorded = await events(page)
  expect(recorded?.filter((event) => event === 'node-click')).toHaveLength(1)
  expect(recorded?.filter((event) => event === 'pane-click')).toHaveLength(1)
})

test('zero click distances admit stationary clicks at fractional client coordinates', async ({
  page,
}) => {
  await mount(page, { nodeClickDistance: 0, paneClickDistance: 0 })
  const node = await boxOf(page.locator('[data-node-id="b"]'))
  const canvas = await boxOf(page.getByTestId('flow-canvas'))
  await page.mouse.click(node.x + 40.25, node.y + 25.25)
  await expect.poll(() => events(page)).toContain('node-click')
  expect(
    await page.evaluate(
      () =>
        window.__flowVueClosing
          ?.flow()
          .getNodes()
          .find(({ id }) => id === 'b')?.selected
    )
  ).toBe(true)
  await page.mouse.click(canvas.x + 250.25, canvas.y + 350.25)
  await expect.poll(() => events(page)).toContain('pane-click')
})

test('paneClickDistance also gates selection movement, with the selection key bypassing it', async ({
  page,
}) => {
  await mount(page, { paneClickDistance: 100, selectionOnDrag: true })
  const canvas = await boxOf(page.getByTestId('flow-canvas'))
  await page.mouse.move(canvas.x + 250, canvas.y + 350)
  await page.mouse.down()
  await page.mouse.move(canvas.x + 300, canvas.y + 350)
  await expect(page.getByTestId('flow-selection-rect')).toHaveCSS(
    'width',
    '0px'
  )
  await page.mouse.up()
  // Pinned packages/react/src/container/Pane/index.tsx:107,299,340: below-threshold release remains a pane click and resets selection.
  expect(
    await page.evaluate(
      () =>
        window.__flowVueClosing
          ?.flow()
          .getNodes()
          .find(({ id }) => id === 'a')?.selected
    )
  ).toBe(false)
  await page.keyboard.down('Shift')
  await page.mouse.move(canvas.x + 250, canvas.y + 350)
  await page.mouse.down()
  await page.mouse.move(canvas.x + 300, canvas.y + 350)
  await expect(page.getByTestId('flow-selection-rect')).toHaveCSS(
    'width',
    '50px'
  )
  await page.mouse.up()
  await page.keyboard.up('Shift')
})

test('grid keyboard moves snap each selected absolute position and use Shift grid steps', async ({
  page,
}) => {
  await mount(page, { snapToGrid: true, snapGrid: [15, 25] })
  await page.evaluate(async () => {
    const flow = window.__flowVueClosing?.flow()
    await flow?.applyEdit({
      operations: [
        {
          kind: 'set-nodes',
          nodes: flow.getNodes().map((node) => ({
            ...node,
            selected: node.id !== 'offscreen',
            position: node.id === 'a' ? { x: 7, y: 103 } : node.position,
          })),
        },
      ],
    })
  })
  await page.locator('[data-node-id="a"]').focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => position(page)).toEqual({ x: 15, y: 100 })
  await expect.poll(() => position(page, 'b')).toEqual({ x: 360, y: 175 })
  await page.keyboard.press('Shift+ArrowDown')
  await expect.poll(() => position(page)).toEqual({ x: 15, y: 200 })
  await expect.poll(() => position(page, 'b')).toEqual({ x: 360, y: 275 })
})

test('unfocusable nodes have no keyboard movement, selection or focus pan', async ({
  page,
}) => {
  await mount(page)
  await page.evaluate(async () => {
    const flow = window.__flowVueClosing?.flow()
    await flow?.applyEdit({
      operations: [
        {
          kind: 'set-nodes',
          nodes: flow.getNodes().map((node) => ({ ...node, focusable: false })),
        },
      ],
    })
  })
  const node = page.locator('[data-node-id="a"]')
  await expect(node).not.toHaveAttribute('tabindex')
  await node.click()
  // Consumers may explicitly focus an unfocusable wrapper, but it still has no keyboard handlers.
  await node.evaluate((element) => {
    element.setAttribute('tabindex', '-1')
    element.focus()
  })
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await frames(page)
  expect(await position(page)).toEqual({ x: 80, y: 100 })
  expect(
    await page.evaluate(
      () =>
        window.__flowVueClosing
          ?.flow()
          .getNodes()
          .find(({ id }) => id === 'a')?.selected
    )
  ).toBe(true)
  await page.keyboard.press('Tab')
  await page.locator('[data-node-id="offscreen"]').evaluate((element) => {
    element.setAttribute('tabindex', '-1')
    element.focus()
  })
  await frames(page)
  expect(await viewport(page)).toEqual({ x: 0, y: 0, zoom: 1 })
})

test('non-draggable nodes admit clicks beyond nodeClickDistance', async ({
  page,
}) => {
  await mount(page, { nodesDraggable: false, nodeClickDistance: 0 })
  const node = await boxOf(page.locator('[data-node-id="b"]'))
  await page.mouse.move(node.x + 30, node.y + 25)
  await page.mouse.down()
  await page.mouse.move(node.x + 45, node.y + 25)
  await page.mouse.up()
  await expect.poll(() => events(page)).toContain('node-click')
  expect(
    await page.evaluate(
      () =>
        window.__flowVueClosing
          ?.flow()
          .getNodes()
          .find(({ id }) => id === 'b')?.selected
    )
  ).toBe(true)
})

test('empty node ariaDescription falls back to the shared description', async ({
  page,
}) => {
  await mount(page)
  await page.evaluate(async () => {
    const flow = window.__flowVueClosing?.flow()
    await flow?.applyEdit({
      operations: [
        {
          kind: 'set-nodes',
          nodes: flow
            .getNodes()
            .map((node) => ({ ...node, ariaDescription: '' })),
        },
      ],
    })
  })
  await expect(page.locator('[data-node-id="a"]')).not.toHaveAttribute(
    'aria-description'
  )
  await expect(page.locator('[data-node-id="a"]')).toHaveAttribute(
    'aria-describedby',
    /-node-description$/u
  )
})
