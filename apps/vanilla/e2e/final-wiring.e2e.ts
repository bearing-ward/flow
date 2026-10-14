import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import type {
  WiringFixture,
  WiringFixtureInput,
} from '../src/final-wiring-fixture.ts'

declare global {
  var wiringFixture: WiringFixture | undefined
}

/*
 * Plan 115: Vanilla final parity wiring. Each test mounts the public
 * `mountFlow` through `final-wiring-fixture.ts` and checks rendered output.
 */

const mount = async (page: Page, input: WiringFixtureInput) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  // Serialized, so Playwright does not instantiate the deep document types.
  await page.evaluate(async (serialized: string) => {
    const modulePath = '/src/final-wiring-fixture.ts'
    const { mountWiringFixture } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing host')
    }

    globalThis.wiringFixture = mountWiringFixture(root, JSON.parse(serialized))
  }, JSON.stringify(input))
  await page.waitForFunction(() =>
    globalThis.wiringFixture?.controller.nodesInitialized()
  )
}

const node = (page: Page, id: string) =>
  page.locator(`.flow-node[data-node-id="${id}"]`)

const box = async (locator: Locator) => {
  const bounds = await locator.boundingBox()

  if (bounds === null) {
    throw new Error('Expected a rendered element')
  }

  return bounds
}

const centre = async (locator: Locator) => {
  const bounds = await box(locator)

  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
}

/** Real mouse drag that crosses the default 1px thresholds before moving on. */
const drag = async (
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number }
) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await page.mouse.up()
}

const clickCentre = async (page: Page, locator: Locator) => {
  const point = await centre(locator)

  await page.mouse.click(point.x, point.y)
}

const nodeOf = (page: Page, id: string) =>
  page.evaluate(
    (nodeId) => globalThis.wiringFixture?.controller.getNode(nodeId),
    id
  )

const viewportOf = (page: Page) =>
  page.evaluate(() => globalThis.wiringFixture?.controller.getViewport())

const positionOf = async (page: Page, id: string) => {
  const found = await nodeOf(page, id)

  return found?.position
}

const xOf = async (page: Page, id: string) => {
  const position = await positionOf(page, id)

  return position?.x
}

const sizeOf = async (page: Page, id: string) => {
  const found = await nodeOf(page, id)

  return found?.size
}

const widthOf = async (page: Page, id: string) => {
  const size = await sizeOf(page, id)

  return size?.width
}

const selectedOf = async (page: Page, id: string) => {
  const found = await nodeOf(page, id)

  return found?.selected
}

const zoomOf = async (page: Page) => {
  const viewport = await viewportOf(page)

  return viewport?.zoom
}

const viewportXOf = async (page: Page) => {
  const viewport = await viewportOf(page)

  return viewport?.x
}

const square = (id: string, x: number, y: number, extra = {}) => ({
  id,
  label: id,
  position: { x, y },
  size: { width: 120, height: 60 },
  ...extra,
})

test.describe('Vanilla model and styling (Plan 114 checklist)', () => {
  test('node style, className, default handles and measured reads', async ({
    page,
  }) => {
    await mount(page, {
      document: {
        nodes: [
          {
            id: 'styled',
            label: 'Styled',
            position: { x: 40, y: 40 },
            style: {
              backgroundColor: 'rgb(1, 2, 3)',
              width: 222,
              opacity: 0.5,
            },
            className: 'custom-a custom-b',
            sourcePosition: 'right',
            targetPosition: 'left',
          },
          {
            id: 'plain',
            label: 'Plain',
            position: { x: 420, y: 40 },
            sourcePosition: 'bottom',
          },
        ],
        edges: [{ id: 'e', source: 'styled', target: 'plain' }],
      },
    })

    const styled = node(page, 'styled')
    await expect(styled).toHaveCSS('background-color', 'rgb(1, 2, 3)')
    await expect(styled).toHaveCSS('width', '222px')
    await expect(styled).toHaveCSS('opacity', '0.5')
    await expect(styled).toHaveClass(/custom-a custom-b/u)
    await expect(styled.locator('[data-handle-id="source"]')).toHaveClass(
      /flow-handle-right/u
    )
    await expect(styled.locator('[data-handle-id="target"]')).toHaveClass(
      /flow-handle-left/u
    )
    await expect(
      node(page, 'plain').locator('[data-handle-id="target"]')
    ).toHaveClass(/flow-handle-top/u)
    await expect(
      page.locator('.flow-edge-path[data-edge-id="e"]')
    ).toHaveAttribute('d', /^M/u)

    const measured = await nodeOf(page, 'styled')
    expect(measured?.measured?.width).toBe(222)
    expect(measured?.measured?.height).toBeGreaterThan(0)

    await page.evaluate(() =>
      globalThis.wiringFixture?.controller.updateNode('styled', {
        style: { backgroundColor: 'rgb(4, 5, 6)' },
        className: 'custom-b',
      })
    )
    await expect(styled).toHaveCSS('background-color', 'rgb(4, 5, 6)')
    await expect(styled).not.toHaveClass(/custom-a/u)
    await expect(styled).toHaveClass(/custom-b/u)
    await expect(styled).toHaveCSS('opacity', '1')
  })

  test('edge style, className, animation, label styling and marker configs', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await mount(page, {
      document: {
        nodes: [
          square('a', 40, 60, { sourcePosition: 'right' }),
          square('b', 460, 60, { targetPosition: 'left' }),
          square('c', 460, 300, { targetPosition: 'left' }),
        ],
        edges: [
          {
            id: 'styled',
            source: 'a',
            target: 'b',
            style: { stroke: '#ff00ff', strokeWidth: 4 },
            className: 'edge-x',
            animated: true,
            label: 'styled label',
            labelStyle: { fill: 'rgb(255, 0, 0)' },
            labelBgStyle: { fill: 'rgb(0, 0, 255)' },
            labelBgPadding: [6, 3],
            labelBgBorderRadius: 5,
            markerEnd: {
              type: 'arrowclosed',
              color: '#00ff00',
              width: 20,
              height: 30,
              strokeWidth: 2,
            },
          },
          {
            id: 'plain',
            source: 'a',
            target: 'c',
            label: 'no background',
            labelShowBg: false,
            markerEnd: 'arrow',
          },
        ],
      },
      options: {
        defaultMarkerColor: '#123456',
        defaultEdgeOptions: { className: 'from-defaults' },
      },
    })

    const group = page.locator('.flow-edge-group[data-edge-id="styled"]')
    const path = group.locator('.flow-edge-path')
    await expect(group).toHaveClass(/edge-x/u)
    await expect(group).toHaveClass(/animated/u)
    // Default edge options apply below the edge's own fields, as React.
    await expect(
      page.locator('.flow-edge-group[data-edge-id="plain"]')
    ).toHaveClass(/from-defaults/u)
    await expect(path).toHaveCSS('stroke', 'rgb(255, 0, 255)')
    await expect(path).toHaveCSS('stroke-width', '4px')
    await expect(path).toHaveCSS('animation-name', 'flow-dashdraw')
    await expect(path).toHaveCSS('stroke-dasharray', '5px')

    const label = page.locator('.flow-edge-label[data-edge-id="styled"]')
    await expect(label.locator('.flow-edge-label-text')).toHaveCSS(
      'color',
      'rgb(255, 0, 0)'
    )
    await expect(label).toHaveCSS('background-color', 'rgb(0, 0, 255)')
    await expect(label).toHaveCSS('padding', '3px 6px')
    await expect(label).toHaveCSS('border-radius', '5px')
    await expect(
      page.locator('.flow-edge-label[data-edge-id="plain"]')
    ).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')

    const markerId = await path.evaluate((element) =>
      element.getAttribute('marker-end')?.replaceAll(/^url\(#|\)$/gu, '')
    )

    const marker = page.locator(`marker[id="${markerId}"]`)
    await expect(marker).toHaveAttribute('markerWidth', '20')
    await expect(marker).toHaveAttribute('markerHeight', '30')
    await expect(marker.locator('polyline')).toHaveCSS('fill', 'rgb(0, 255, 0)')
    await expect(marker.locator('polyline')).toHaveCSS('stroke-width', '2px')

    // `defaultMarkerColor` colors a marker on an edge without a stroke.
    const plainMarkerId = await page
      .locator('.flow-edge-path[data-edge-id="plain"]')
      .evaluate((element) =>
        element.getAttribute('marker-end')?.replaceAll(/^url\(#|\)$/gu, '')
      )

    await expect(
      page.locator(`marker[id="${plainMarkerId}"] polyline`)
    ).toHaveCSS('stroke', 'rgb(18, 52, 86)')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(path).toHaveCSS('animation-name', 'none')
  })

  test('dragHandle limits drags to the handle while clicks still select', async ({
    page,
  }) => {
    await mount(page, {
      gripRenderer: true,
      document: {
        nodes: [
          {
            id: 'g',
            label: 'Body',
            type: 'grip',
            dragHandle: '.grip',
            position: { x: 100, y: 100 },
          },
        ],
        edges: [],
      },
    })

    const body = await centre(node(page, 'g').locator('.body'))
    await drag(page, body, { x: body.x + 120, y: body.y + 60 })
    expect(await positionOf(page, 'g')).toEqual({ x: 100, y: 100 })

    await page.mouse.click(body.x, body.y)
    await expect.poll(async () => await selectedOf(page, 'g')).toBe(true)

    const grip = await centre(node(page, 'g').locator('.grip'))
    await drag(page, grip, { x: grip.x + 120, y: grip.y + 60 })
    await expect.poll(async () => await xOf(page, 'g')).toBeGreaterThan(200)
  })

  test('colorMode light, dark and system switch the shared theme tokens', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await mount(page, {
      document: { nodes: [square('a', 60, 60)], edges: [] },
      options: { colorMode: 'dark' },
    })

    const canvas = page.locator('.flow-canvas')
    await expect(canvas).toHaveClass(/dark/u)
    await expect(node(page, 'a')).toHaveCSS(
      'background-color',
      'rgb(30, 30, 30)'
    )
    await expect(canvas).toHaveCSS('background-color', 'rgb(20, 20, 20)')

    await page.evaluate(() =>
      globalThis.wiringFixture?.controller.setColorMode('light')
    )
    await expect(canvas).not.toHaveClass(/dark/u)
    await expect(node(page, 'a')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)'
    )

    await page.evaluate(() =>
      globalThis.wiringFixture?.controller.setColorMode('system')
    )
    await expect(canvas).not.toHaveClass(/dark/u)
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(canvas).toHaveClass(/dark/u)
    await page.emulateMedia({ colorScheme: 'light' })
    await expect(canvas).not.toHaveClass(/dark/u)

    // A user `--flow-*` override wins over the mode default.
    await canvas.evaluate((element) =>
      element.style.setProperty('--flow-node-background-color', 'rgb(7, 8, 9)')
    )
    await expect(node(page, 'a')).toHaveCSS('background-color', 'rgb(7, 8, 9)')
    expect(
      await page.evaluate(
        () => globalThis.wiringFixture?.controller.getColorMode().mode
      )
    ).toBe('system')
  })

  test('zIndexMode stacks selected and child nodes as React', async ({
    page,
  }) => {
    const overlapping = {
      nodes: [square('low', 100, 100), square('high', 140, 120)],
      edges: [],
    }

    await mount(page, { document: overlapping })

    const topAt = (point: { x: number; y: number }) =>
      page.evaluate(
        ({ x, y }) =>
          document.elementFromPoint(x, y)?.closest<HTMLElement>('.flow-node')
            ?.dataset.nodeId,
        point
      )

    const low = await box(node(page, 'low'))
    const shared = { x: low.x + 60, y: low.y + 40 }
    expect(await topAt(shared)).toBe('high')

    await page.mouse.click(low.x + 10, low.y + 10)
    await expect(node(page, 'low')).toHaveClass(/selected/u)
    expect(await topAt(shared)).toBe('low')

    await mount(page, {
      document: overlapping,
      options: { zIndexMode: 'manual' },
    })
    await page.mouse.click(low.x + 10, low.y + 10)
    await expect(node(page, 'low')).toHaveClass(/selected/u)
    expect(await topAt(shared)).toBe('high')

    await mount(page, {
      document: overlapping,
      options: { elevateNodesOnSelect: false },
    })
    await page.mouse.click(low.x + 10, low.y + 10)
    await expect(node(page, 'low')).toHaveClass(/selected/u)
    expect(await topAt(shared)).toBe('high')
  })

  test('snapGrid tuple, snapToGrid and React extent tuples', async ({
    page,
  }) => {
    await mount(page, {
      document: { nodes: [square('a', 50, 50)], edges: [] },
      options: {
        snapGrid: [25, 25],
        nodeExtent: [
          [0, 0],
          [400, 300],
        ],
      },
    })

    let start = await centre(node(page, 'a'))
    await drag(page, start, { x: start.x + 63, y: start.y + 38 })

    await expect
      .poll(async () => {
        const position = await positionOf(page, 'a')

        return position === undefined
          ? false
          : position.x % 25 === 0 && position.y % 25 === 0 && position.x > 50
      })
      .toBe(true)

    start = await centre(node(page, 'a'))
    await drag(page, start, { x: start.x + 600, y: start.y + 600 })
    await expect
      .poll(async () => await positionOf(page, 'a'))
      // The 120x60 node's top-left stays inside [[0, 0], [400, 300]].
      .toEqual({ x: 280, y: 240 })

    await mount(page, {
      document: { nodes: [square('a', 50, 50)], edges: [] },
      options: { snapGrid: [25, 25], snapToGrid: false },
    })
    start = await centre(node(page, 'a'))
    await drag(page, start, { x: start.x + 63, y: start.y + 38 })
    await expect.poll(async () => await xOf(page, 'a')).not.toBe(50)
    expect(((await xOf(page, 'a')) ?? 0) % 25).not.toBe(0)

    await mount(page, {
      document: { nodes: [square('a', 50, 50)], edges: [] },
      options: {
        translateExtent: [
          [0, 0],
          [1000, 700],
        ],
      },
    })
    await page.evaluate(() =>
      globalThis.wiringFixture?.controller.setViewport({
        x: 500,
        y: 500,
        zoom: 1,
      })
    )
    await expect.poll(async () => await viewportXOf(page)).toBe(0)
  })

  test('fitView and fitViewOptions: initial fit, node list, zoom bounds, hidden nodes', async ({
    page,
  }) => {
    await mount(page, {
      document: {
        nodes: [square('a', 0, 0), square('b', 2000, 1200)],
        edges: [],
      },
      options: {
        fitView: true,
      },
    })
    await expect.poll(async () => (await zoomOf(page)) ?? 1).toBeLessThan(0.5)

    await page.evaluate(() =>
      globalThis.wiringFixture?.controller.fitView({
        nodes: [{ id: 'b' }],
        maxZoom: 1.5,
      })
    )
    await expect.poll(async () => await zoomOf(page)).toBe(1.5)

    const target = await box(node(page, 'b'))
    expect(target.x + target.width / 2).toBeCloseTo(400, -1)

    await page.evaluate(() =>
      globalThis.wiringFixture?.controller.updateNode('a', { hidden: true })
    )
    await page.evaluate(() =>
      globalThis.wiringFixture?.controller.fitView({ minZoom: 0.25 })
    )
    const visibleOnly = (await zoomOf(page)) ?? 0
    await page.evaluate(() =>
      globalThis.wiringFixture?.controller.fitView({ includeHiddenNodes: true })
    )
    await expect
      .poll(async () => (await zoomOf(page)) ?? 0)
      .toBeLessThan(visibleOnly)
  })

  test('center panels and ariaLabelConfig drive built-in and public UI labels', async ({
    page,
  }) => {
    await mount(page, {
      document: {
        nodes: [square('a', 60, 60, { sourcePosition: 'right' })],
        edges: [],
      },
      options: { ui: { controls: true, minimap: true } },
      controls: { position: 'center-right' },
      ariaLabels: {
        'controls.zoomIn.ariaLabel': 'Plus',
        'controls.ariaLabel': 'Tools',
        'minimap.ariaLabel': 'Overview',
        'handle.ariaLabel': 'Port',
        'node.a11yDescription.keyboardDisabled': 'Node help',
        'edge.a11yDescription.default': 'Edge help',
      },
      customLiveMessage: true,
    })

    await expect(page.getByRole('button', { name: 'Plus' })).toHaveCount(2)
    await expect(page.getByRole('group', { name: 'Tools' })).toHaveCount(2)
    await expect(page.getByRole('img', { name: 'Overview' })).toBeVisible()
    await expect(
      node(page, 'a').locator('[data-handle-id="source"]')
    ).toHaveAttribute('aria-label', 'Port')
    await expect(node(page, 'a')).toHaveAccessibleDescription('Node help')

    const controls = page.locator('.flow-controls-public')
    await expect(controls).toHaveAttribute('data-position', 'center-right')
    const controlsBox = await box(controls)
    const canvasBox = await box(page.locator('.flow-canvas'))
    expect(controlsBox.y + controlsBox.height / 2).toBeCloseTo(
      canvasBox.y + canvasBox.height / 2,
      0
    )
    expect(
      canvasBox.x + canvasBox.width - controlsBox.x - controlsBox.width
    ).toBeLessThan(20)

    await node(page, 'a').focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('ArrowRight')
    await expect(page.getByTestId('flow-aria-live')).toHaveText(
      /^moved right to \d+,60$/u
    )
  })

  test('expandParent drags grow the parent in one node-bounds commit', async ({
    page,
  }) => {
    await mount(page, {
      document: {
        nodes: [
          square('parent', 100, 100, { size: { width: 200, height: 150 } }),
          square('child', 20, 20, {
            parentId: 'parent',
            expandParent: true,
            size: { width: 60, height: 40 },
          }),
          square('sibling', 120, 90, {
            parentId: 'parent',
            size: { width: 60, height: 40 },
          }),
        ],
        edges: [],
      },
    })

    const start = await centre(node(page, 'child'))
    await drag(page, start, { x: start.x + 260, y: start.y })

    await expect
      .poll(async () => (await widthOf(page, 'parent')) ?? 0)
      .toBeGreaterThan(300)

    const kinds = await page.evaluate(() =>
      globalThis.wiringFixture?.changes.map(({ kind }) => kind)
    )

    expect(kinds).toContain('node-bounds')
    expect(kinds).not.toContain('node-position')

    const child = await nodeOf(page, 'child')
    const parent = await nodeOf(page, 'parent')
    expect((child?.position.x ?? 0) + 60).toBeLessThanOrEqual(
      parent?.size?.width ?? 0
    )

    // Dragging up and left past the parent origin shifts the parent and
    // compensates the sibling, so the sibling keeps its absolute position.
    // (Compared in flow units: the drag may auto-pan the viewport.)
    const absoluteSibling = async () => {
      const parentNode = await nodeOf(page, 'parent')
      const sibling = await nodeOf(page, 'sibling')

      return {
        x: (parentNode?.position.x ?? 0) + (sibling?.position.x ?? 0),
        y: (parentNode?.position.y ?? 0) + (sibling?.position.y ?? 0),
      }
    }

    const siblingBefore = await absoluteSibling()
    const again = await centre(node(page, 'child'))
    await drag(page, again, { x: again.x - 400, y: again.y - 80 })
    await expect
      .poll(async () => (await xOf(page, 'parent')) ?? 100)
      .toBeLessThan(100)
    expect(await positionOf(page, 'child')).toEqual({ x: 0, y: 0 })
    expect(await absoluteSibling()).toEqual(siblingBefore)
  })
})

test.describe('Vanilla MiniMap component', () => {
  const graph = {
    nodes: [square('a', 0, 0), square('b', 600, 400)],
    edges: [],
  }

  test('node attributes, mask, background, position and aria label', async ({
    page,
  }) => {
    await mount(page, {
      document: graph,
      minimap: {
        nodeColorById: { a: '#ff0000', b: '#00ff00' },
        nodeStrokeColor: '#0000ff',
        nodeStrokeWidth: 3,
        nodeBorderRadius: 7,
        nodeClassName: 'mm-node',
        maskColor: 'rgba(1, 2, 3, 0.5)',
        maskStrokeColor: '#ff00ff',
        maskStrokeWidth: 2,
        bgColor: 'rgb(9, 9, 9)',
        position: 'top-left',
        ariaLabel: 'Overview',
      },
    })

    const minimap = page.getByTestId('flow-minimap')
    const a = minimap.locator('[data-node-id="a"]')
    await expect(a).toHaveCSS('fill', 'rgb(255, 0, 0)')
    await expect(a).toHaveCSS('stroke', 'rgb(0, 0, 255)')
    await expect(a).toHaveCSS('stroke-width', '3px')
    await expect(a).toHaveAttribute('rx', '7')
    await expect(a).toHaveClass(/mm-node/u)
    await expect(minimap.locator('[data-node-id="b"]')).toHaveCSS(
      'fill',
      'rgb(0, 255, 0)'
    )

    const mask = page.getByTestId('flow-minimap-mask')
    await expect(mask).toHaveCSS('fill', 'rgba(1, 2, 3, 0.5)')
    await expect(mask).toHaveCSS('stroke', 'rgb(255, 0, 255)')
    await expect(mask).toHaveAttribute('d', /^M0,0h200v150h-200z M/u)
    await expect(page.getByTestId('flow-minimap-panel')).toHaveCSS(
      'background-color',
      'rgb(9, 9, 9)'
    )
    await expect(page.getByRole('img', { name: 'Overview' })).toBeVisible()

    const panel = await box(page.getByTestId('flow-minimap-panel'))
    const canvas = await box(page.locator('.flow-canvas'))
    expect(panel.x - canvas.x).toBeLessThan(20)
    expect(panel.y - canvas.y).toBeLessThan(20)

    await page.evaluate(() =>
      globalThis.wiringFixture?.controller.setViewport({
        x: -100,
        y: 0,
        zoom: 1,
      })
    )
    await expect(mask).toHaveAttribute('d', /^M0,0h200v150h-200z M/u)
  })

  test('pannable drag pans, inversePan flips it, zoomable wheel zooms', async ({
    page,
  }) => {
    await mount(page, {
      document: graph,
      minimap: { pannable: true, zoomable: true },
    })

    const minimap = await centre(page.getByTestId('flow-minimap'))
    await drag(page, minimap, { x: minimap.x + 30, y: minimap.y })
    await expect
      .poll(async () => (await viewportXOf(page)) ?? 0)
      .toBeLessThan(-50)

    const zoomBefore = (await zoomOf(page)) ?? 1
    await page.mouse.move(minimap.x, minimap.y)
    await page.mouse.wheel(0, -200)
    await expect
      .poll(async () => (await zoomOf(page)) ?? 0)
      .toBeGreaterThan(zoomBefore)

    await mount(page, {
      document: graph,
      minimap: { pannable: true, inversePan: true },
    })
    const inverse = await centre(page.getByTestId('flow-minimap'))
    await drag(page, inverse, { x: inverse.x + 30, y: inverse.y })
    await expect
      .poll(async () => (await viewportXOf(page)) ?? 0)
      .toBeGreaterThan(50)
  })

  test('custom nodes receive MiniMapNodeProps; ariaLabel null removes the title', async ({
    page,
  }) => {
    await mount(page, {
      document: graph,
      minimap: {
        customNode: true,
        nodeColorById: { a: '#ff0000', b: '#00ff00' },
        ariaLabel: null,
      },
    })

    const minimap = page.getByTestId('flow-minimap')
    await expect(minimap.locator('circle.custom-minimap-node')).toHaveCount(2)
    await expect(minimap.locator('circle[data-node-id="a"]')).toHaveAttribute(
      'fill',
      '#ff0000'
    )
    await expect(minimap.locator('title')).toHaveCount(0)

    await minimap.locator('circle[data-node-id="b"]').click()
    expect(
      await page.evaluate(() => globalThis.wiringFixture?.minimapClicks)
    ).toEqual(['b'])
  })
})

const control = (page: Page, nodeId: string, position: string) =>
  page.locator(
    `.flow-node[data-node-id="${nodeId}"] .flow-resize-control[data-direction="${position}"]`
  )

test.describe('Vanilla NodeResizer and NodeResizeControl', () => {
  const resizable = {
    nodes: [
      square('r', 100, 100, { size: { width: 150, height: 80 } }),
      square('other', 400, 100, { size: { width: 120, height: 60 } }),
    ],
    edges: [],
  }

  test('resizer controls resize with min/max limits and report ResizeParams', async ({
    page,
  }) => {
    await mount(page, {
      document: resizable,
      resizers: [
        {
          nodeId: 'r',
          kind: 'resizer',
          options: {
            minWidth: 100,
            minHeight: 50,
            maxWidth: 260,
            color: '#ff0071',
          },
        },
      ],
    })

    await expect(
      page.locator('[data-node-id="r"] .flow-resize-control')
    ).toHaveCount(8)
    await expect(control(page, 'r', 'bottom-right')).toHaveClass(/handle/u)
    await expect(control(page, 'r', 'right')).toHaveClass(/line/u)
    await expect(control(page, 'r', 'bottom-right')).toHaveCSS(
      'background-color',
      'rgb(255, 0, 113)'
    )

    const corner = await centre(control(page, 'r', 'bottom-right'))
    await drag(page, corner, { x: corner.x + 60, y: corner.y + 30 })
    await expect
      .poll(async () => await sizeOf(page, 'r'))
      .toEqual({ width: 210, height: 110 })

    const events = await page.evaluate(
      () => globalThis.wiringFixture?.resizeEvents
    )

    expect(events?.[0]).toBe('start:r')
    expect(events).toContain('resize:r')
    expect(events?.at(-1)).toBe('end:r')

    const last = await page.evaluate(() =>
      globalThis.wiringFixture?.resizeParams.at(-1)
    )

    expect(last).toEqual({ x: 100, y: 100, width: 210, height: 110 })

    const again = await centre(control(page, 'r', 'bottom-right'))
    await drag(page, again, { x: again.x + 200, y: again.y })
    await expect.poll(async () => await widthOf(page, 'r')).toBe(260)

    const left = await centre(control(page, 'r', 'left'))
    await drag(page, left, { x: left.x + 300, y: left.y })
    await expect.poll(async () => await widthOf(page, 'r')).toBe(100)
    expect(await xOf(page, 'r')).toBe(260)
  })

  test('keepAspectRatio, isVisible, shouldResize and snapGrid', async ({
    page,
  }) => {
    await mount(page, {
      document: resizable,
      resizers: [
        { nodeId: 'r', kind: 'resizer', options: { keepAspectRatio: true } },
        { nodeId: 'other', kind: 'resizer', vetoWidthAbove: 150 },
      ],
    })

    const corner = await centre(control(page, 'r', 'bottom-right'))
    await drag(page, corner, { x: corner.x + 75, y: corner.y })
    await expect
      .poll(async () => await sizeOf(page, 'r'))
      .toEqual({ width: 225, height: 120 })

    const veto = await centre(control(page, 'other', 'right'))
    await drag(page, veto, { x: veto.x + 100, y: veto.y })
    const vetoed = (await widthOf(page, 'other')) ?? 0
    expect(vetoed).toBeLessThanOrEqual(150)

    await page.evaluate(() =>
      globalThis.wiringFixture?.resizers[0]?.update({ isVisible: false })
    )
    await expect(
      page.locator('[data-node-id="r"] .flow-resize-control')
    ).toHaveCount(0)

    await mount(page, {
      document: resizable,
      options: { snapGrid: [40, 40] },
      resizers: [{ nodeId: 'r', kind: 'resizer' }],
    })
    const snapped = await centre(control(page, 'r', 'bottom-right'))
    await drag(page, snapped, { x: snapped.x + 47, y: snapped.y + 9 })
    await expect
      .poll(async () => (await widthOf(page, 'r')) ?? 0)
      .toBeGreaterThan(150)
    expect(((await widthOf(page, 'r')) ?? 0) - 150).toBe(40)
  })

  test('NodeResizeControl: one axis line control and nodesResizable relationship', async ({
    page,
  }) => {
    await mount(page, {
      document: resizable,
      options: { nodesResizable: true },
      resizers: [
        {
          nodeId: 'r',
          kind: 'control',
          options: {
            position: 'right',
            variant: 'line',
            resizeDirection: 'horizontal',
          },
        },
      ],
    })

    // A node with a resizer shows only its controls; the canvas switch still
    // shows the built-in controls on other selected nodes.
    await clickCentre(page, node(page, 'r'))
    await expect(node(page, 'r')).toHaveClass(/selected/u)
    await expect(node(page, 'r').locator('.flow-resize-control')).toHaveCount(1)
    await expect(
      node(page, 'r').locator('.flow-node-resize-handle')
    ).toHaveCount(0)
    await clickCentre(page, node(page, 'other'))
    await expect(
      node(page, 'other').locator('.flow-node-resize-handle')
    ).toHaveCount(8)

    const line = await centre(control(page, 'r', 'right'))
    await drag(page, line, { x: line.x + 50, y: line.y + 40 })
    await expect
      .poll(async () => await sizeOf(page, 'r'))
      .toEqual({ width: 200, height: 80 })
  })

  test('resizing an expandParent child grows its parent', async ({ page }) => {
    await mount(page, {
      document: {
        nodes: [
          square('parent', 100, 100, { size: { width: 200, height: 150 } }),
          square('child', 100, 80, {
            parentId: 'parent',
            expandParent: true,
            size: { width: 80, height: 50 },
          }),
        ],
        edges: [],
      },
      resizers: [{ nodeId: 'child', kind: 'resizer' }],
    })

    const corner = await centre(control(page, 'child', 'bottom-right'))
    await drag(page, corner, { x: corner.x + 100, y: corner.y + 60 })
    await expect
      .poll(async () => await sizeOf(page, 'parent'))
      .toEqual({ width: 280, height: 190 })
  })
})

test.describe('Vanilla instance and store APIs', () => {
  test('intersections, bounds, toObject, store and node-data observation', async ({
    page,
  }) => {
    await mount(page, {
      document: {
        nodes: [
          square('a', 0, 0),
          square('b', 100, 30),
          square('c', 400, 400),
          { ...square('inner', 10, 10), size: { width: 20, height: 20 } },
        ],
        edges: [],
      },
    })

    const result = await page.evaluate(() => {
      const controller = globalThis.wiringFixture?.controller

      if (controller === undefined) {
        throw new Error('Missing controller')
      }

      const a = controller.getNode('a')

      if (a === undefined) {
        throw new Error('Missing node')
      }

      const object = controller.toObject()
      const [first] = object.nodes

      if (first !== undefined) {
        Object.assign(first.position, { x: 999 })
      }

      return {
        partial: controller.getIntersectingNodes(a).map(({ id }) => id),
        contained: controller
          .getIntersectingNodes({ id: 'a' }, false)
          .map(({ id }) => id),
        rect: controller
          .getIntersectingNodes({ x: 390, y: 390, width: 20, height: 20 })
          .map(({ id }) => id),
        isIntersecting: controller.isNodeIntersecting(
          { id: 'c' },
          { x: 0, y: 0, width: 200, height: 200 }
        ),
        bounds: controller.getNodesBounds(['a', 'c']),
        objectViewport: object.viewport,
        afterMutation: controller.getNode('a')?.position.x,
      }
    })

    expect(result.partial).toEqual(['b', 'inner'])
    expect(result.contained).toEqual(['inner'])
    expect(result.rect).toEqual(['c'])
    expect(result.isIntersecting).toBe(false)
    expect(result.bounds).toEqual({ x: 0, y: 0, width: 520, height: 460 })
    expect(result.objectViewport).toEqual({ x: 0, y: 0, zoom: 1 })
    expect(result.afterMutation).toBe(0)

    await page.evaluate(() => {
      const controller = globalThis.wiringFixture?.controller

      // SAFETY: test-only observation arrays on the page global.
      const target = globalThis as typeof globalThis & {
        storeCounts?: number[]
        zooms?: number[]
        nodeData?: string[]
      }

      target.storeCounts = []
      target.zooms = []
      target.nodeData = []
      controller?.observeStore(
        (state) => state.nodes.length,
        (count) => target.storeCounts?.push(count)
      )
      controller?.observeStore(
        (state) => state.viewport.zoom,
        (zoom) => target.zooms?.push(zoom),
        (previous, next) => Math.abs(previous - next) < 0.01
      )
      controller?.observeNodesData('a', (data) =>
        target.nodeData?.push(JSON.stringify(data))
      )
    })

    await page.evaluate(async () => {
      const controller = globalThis.wiringFixture?.controller

      await controller?.addNodes({
        id: 'd',
        label: 'd',
        position: { x: 700, y: 0 },
      })
      await controller?.updateNodeData('b', { touched: true })
      await controller?.updateNodeData('a', { value: 1 })
      await controller?.zoomTo(1.005)
      await controller?.zoomTo(2)
    })

    const observed = await page.evaluate(() => {
      // SAFETY: test-only observation arrays on the page global.
      const target = globalThis as typeof globalThis & {
        storeCounts?: number[]
        zooms?: number[]
        nodeData?: string[]
      }

      return {
        counts: target.storeCounts,
        zooms: target.zooms,
        nodeData: target.nodeData,
        state: globalThis.wiringFixture?.controller.getStoreState().viewport,
      }
    })

    expect(observed.counts).toEqual([5])
    expect(observed.zooms).toEqual([2])
    expect(observed.nodeData).toEqual([
      JSON.stringify([{ id: 'a', data: { value: 1 } }]),
    ])
    expect(observed.state?.zoom).toBe(2)
  })
})
