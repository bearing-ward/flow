import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import type {
  FinalWiringFixture,
  FinalWiringOptions,
} from '../src/final-wiring-test.ts'

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

const node = (page: Page, id: string) =>
  page.locator(`.flow-vue-node[data-node-id="${id}"]`)

/** Run a reader against the mounted fixture inside the page. */
const fixture = async <Result>(
  page: Page,
  read: (api: FinalWiringFixture) => Result
): Promise<Awaited<Result>> =>
  // SAFETY: the reader runs in the page against the fixture it is typed for.
  (await page.evaluate(
    `(${read.toString()})(window.__flowVueFinal)`
  )) as Awaited<Result>

const mount = async (page: Page, options: FinalWiringOptions) => {
  await page.goto('/test.html')
  await page.evaluate(async (mountOptions) => {
    const { mountFinalWiringFixture } =
      await import('../src/final-wiring-test.ts')

    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing fixture root')
    }

    mountFinalWiringFixture(root, mountOptions)
  }, options)
}

/** Press, pass the 1px drag threshold, then travel by `delta` and release. */
const drag = async (page: Page, from: Point, delta: Point) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3, { steps: 2 })
  await page.mouse.move(from.x + delta.x, from.y + delta.y, { steps: 8 })
  await page.mouse.up()
}

const position = (page: Page, id: string) =>
  page.evaluate((nodeId) => {
    const found = window.__flowVueFinal
      ?.flow()
      .getNodes()
      .find((candidate) => candidate.id === nodeId)

    return found === undefined
      ? undefined
      : { ...found.position, ...found.size }
  }, id)

test.describe('Vue provider and composables', () => {
  test('FlowProvider lets a sibling read and edit the canvas with useFlow, useStore and useKeyPress', async ({
    page,
  }) => {
    await mount(page, { scene: 'provider' })

    await expect(page.getByTestId('node-count')).toHaveText('3')

    // The fitView prop fits once the nodes are measured, within fitViewOptions.
    await expect
      .poll(() => fixture(page, (api) => api.flow().getViewport().x))
      .toBeGreaterThan(50)
    expect(await fixture(page, (api) => api.flow().getZoom())).toBe(1)

    // FitViewOptions: React node list and zoom bounds.
    await fixture(page, (api) =>
      api.flow().fitView({ nodes: [{ id: 'c' }], minZoom: 0.5, maxZoom: 1.3 })
    )
    await expect
      .poll(() => fixture(page, (api) => api.flow().getZoom()))
      .toBeCloseTo(1.3)

    await page.getByRole('button', { name: 'Add node' }).click()
    await expect(page.getByTestId('node-count')).toHaveText('4')
    await expect(node(page, 'added-3')).toHaveCount(1)

    await page.getByRole('button', { name: 'Inspect' }).click()
    await expect(page.getByTestId('intersections')).toHaveText('b')
    await expect(page.getByTestId('bounds')).toHaveText('40,40,200,100')

    await expect(page.getByTestId('shift')).toHaveText('false')
    await page.keyboard.down('Shift')
    await expect(page.getByTestId('shift')).toHaveText('true')
    await page.keyboard.up('Shift')
    await expect(page.getByTestId('shift')).toHaveText('false')

    await page.keyboard.down('Control')
    await page.keyboard.down('k')
    await expect(page.getByTestId('combo')).toHaveText('true')
    await page.keyboard.up('k')
    await page.keyboard.up('Control')
    await expect(page.getByTestId('combo')).toHaveText('false')

    // The equality function keeps small zoom changes out of the selection.
    await fixture(page, (api) =>
      api.flow().setViewport({ x: 0, y: 0, zoom: 1.2 })
    )
    await expect
      .poll(() => fixture(page, (api) => api.flow().getZoom()))
      .toBeCloseTo(1.2)
    await expect(page.getByTestId('zoom-band')).toHaveText('1')
    await fixture(page, (api) =>
      api.flow().setViewport({ x: 0, y: 0, zoom: 1.6 })
    )
    await expect(page.getByTestId('zoom-band')).toHaveText('1.6')

    const object = await fixture(page, (api) => api.flow().toObject())
    expect(object.nodes).toHaveLength(4)
    expect(object.viewport.zoom).toBeCloseTo(1.6)

    const measured = await fixture(
      page,
      (api) => api.flow().getNode('a')?.measured
    )

    expect(measured).toEqual({ width: 120, height: 60 })

    // Provider siblings see measured sizes too.
    await expect(page.getByTestId('store-measured')).toHaveText('120x60')
    await page.getByRole('button', { name: 'Read measured' }).click()
    await expect(page.getByTestId('sibling-measured')).toHaveText(
      '120x60/120x60'
    )

    // A second canvas takes over while mounted; unmounting it falls back to
    // the first, which is still mounted.
    await page.getByRole('button', { name: 'Toggle second canvas' }).click()
    await expect(page.locator('.second-canvas')).toHaveCount(1)
    await expect(page.getByTestId('node-count')).toHaveText('1')
    await page.getByRole('button', { name: 'Toggle second canvas' }).click()
    await expect(page.locator('.second-canvas')).toHaveCount(0)
    await expect(page.getByTestId('node-count')).toHaveText('4')
  })
})

test.describe('Vue multi-part commits in every owner model', () => {
  for (const model of ['uncontrolled', 'controlled', 'split'] as const) {
    test(`${model}: a drag growing two parents with a mixed selection commits as one update`, async ({
      page,
    }) => {
      await mount(page, { scene: 'two-parents', model })

      const before = await fixture(page, (api) => api.proposals())

      await drag(page, await centreOf(node(page, 'c1')), { x: 200, y: 0 })

      await expect
        .poll(() => position(page, 'c1'))
        .toMatchObject({ x: 220, y: 50 })
      await expect
        .poll(() => position(page, 'c2'))
        .toMatchObject({ x: 220, y: 50 })
      await expect
        .poll(() => position(page, 'r'))
        .toMatchObject({ x: 600, y: 40 })
      await expect
        .poll(() => position(page, 'p1'))
        .toMatchObject({ x: 40, y: 40, width: 300, height: 150 })
      await expect
        .poll(() => position(page, 'p2'))
        .toMatchObject({ x: 40, y: 260, width: 300, height: 150 })

      if (model !== 'uncontrolled') {
        expect(await fixture(page, (api) => api.proposals())).toBe(before + 1)
      }
    })

    test(`${model}: an expandParent resize keeps the child size with the parent growth`, async ({
      page,
    }) => {
      await mount(page, { scene: 'resizer', model })

      await drag(
        page,
        await centreOf(
          node(page, 'child').locator(
            '[data-testid="flow-node-resize-control"][data-position="bottom-right"]'
          )
        ),
        { x: 150, y: 120 }
      )
      await expect
        .poll(() => position(page, 'child'))
        .toMatchObject({ x: 60, y: 60, width: 250, height: 180 })
      await expect
        .poll(() => position(page, 'parent'))
        .toMatchObject({ x: 560, y: 260, width: 310, height: 240 })
    })
  }
})

test.describe('Vue edge layers', () => {
  test('child edges and their labels stack with the nodes; auto mode and selection elevate them without losing focus', async ({
    page,
  }) => {
    await mount(page, { scene: 'layers' })

    const childLayer = page.locator(
      '.flow-vue-viewport svg.flow-vue-edges-elevated[data-z-index="1"]'
    )

    await expect(
      childLayer.locator('g[data-edge-id="child-edge"]')
    ).toHaveCount(1)
    await expect(
      page.locator(
        'svg.flow-vue-edges:not(.flow-vue-edges-elevated) g[data-edge-id="root-edge"]'
      )
    ).toHaveCount(1)

    // The child label sits in its edge's layer, above the opaque group.
    const childLabel = page.locator('[data-flow-edge-label="child-edge"]')
    await expect(
      page.locator(
        '.flow-vue-edge-labels-elevated[data-z-index="1"] [data-flow-edge-label="child-edge"]'
      )
    ).toHaveCount(1)
    const labelCentre = await centreOf(childLabel)

    // Labels ignore the pointer; make this one hit-testable to read stacking.
    await childLabel.evaluate((element) => {
      element.style.pointerEvents = 'auto'
    })

    const hit = await page.evaluate(
      ({ x, y }) =>
        document
          .elementFromPoint(x, y)
          ?.closest<HTMLElement>('[data-flow-edge-label]')?.dataset
          .flowEdgeLabel ?? null,
      labelCentre
    )

    expect(hit).toBe('child-edge')

    // elevateEdgesOnSelect moves a selected edge to a new layer; focus stays.
    const rootHit = page.locator('[data-flow-edge-hit="root-edge"]')
    await rootHit.focus()
    await fixture(page, (api) =>
      api.flow().updateEdge('root-edge', { selected: true })
    )
    await expect(
      page.locator(
        'svg.flow-vue-edges-elevated[data-z-index="1000"] g[data-edge-id="root-edge"]'
      )
    ).toHaveCount(1)
    await expect
      .poll(() =>
        page.evaluate(() =>
          document.activeElement instanceof SVGElement
            ? document.activeElement.dataset.flowEdgeHit
            : undefined
        )
      )
      .toBe('root-edge')

    // auto mode lifts the root group and everything inside it.
    await fixture(page, (api) => api.setZIndexMode('auto'))
    await expect(node(page, 'g')).toHaveCSS('z-index', '10')
    await expect(node(page, 'k1')).toHaveCSS('z-index', '11')
    await expect(
      page.locator(
        'svg.flow-vue-edges-elevated[data-z-index="11"] g[data-edge-id="child-edge"]'
      )
    ).toHaveCount(1)
    await expect(
      page.locator(
        '.flow-vue-edge-labels-elevated[data-z-index="11"] [data-flow-edge-label="child-edge"]'
      )
    ).toHaveCount(1)
  })
})

test('deleteKeyCode, selectionKeyCode, multiSelectionKeyCode and zoomOnPinch act as React', async ({
  page,
}) => {
  await mount(page, { scene: 'provider' })

  const nodeA = node(page, 'a')
  await nodeA.click()
  await page.keyboard.press('Backspace')
  await expect(nodeA).toHaveCount(0)

  // Meta or Control toggles a node into the selection.
  await node(page, 'b').click()
  await node(page, 'c').click({ modifiers: ['ControlOrMeta'] })
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__flowVueFinal
          ?.flow()
          .getNodes()
          .filter(({ selected }) => selected === true)
          .map(({ id }) => id)
      )
    )
    .toEqual(['b', 'c'])

  // A pinch (Control + wheel) zooms even with the canvas focused elsewhere.
  const zoom = await fixture(page, (api) => api.flow().getZoom())
  const pane = await boxOf(page.getByTestId('flow-canvas'))
  await page.mouse.move(pane.x + 20, pane.y + pane.height - 20)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, -100)
  await page.keyboard.up('Control')
  await expect
    .poll(() => fixture(page, (api) => api.flow().getZoom()))
    .toBeGreaterThan(zoom)
})

test.describe('Vue model and styling', () => {
  test('Base Style and Updating Nodes: node and edge style, className, labels and markers render', async ({
    page,
  }) => {
    await mount(page, { scene: 'presentation' })

    const styled = node(page, 'styled')
    await expect(styled).toHaveClass(/custom-node/u)
    await expect(styled).toHaveClass(/extra/u)
    await expect(styled).toHaveCSS('background-color', 'rgb(255, 0, 114)')
    await expect(styled).toHaveCSS('border-top-width', '3px')
    await expect(styled).toHaveCSS('color', 'rgb(255, 255, 255)')

    const handled = node(page, 'handled')
    await expect(
      handled.locator('[data-handle-id="target"].flow-vue-handle-top')
    ).toHaveCount(1)
    await expect(
      handled.locator('[data-handle-id="source"].flow-vue-handle-bottom')
    ).toHaveCount(1)

    const edge = page.locator('[data-edge-id="e-styled"]')
    await expect(edge).toHaveClass(/custom-edge/u)
    await expect(edge).toHaveClass(/animated/u)

    const path = edge.locator('.flow-vue-edge-path')
    await expect(path).toHaveCSS('stroke', 'rgb(255, 0, 114)')
    await expect(path).toHaveCSS('stroke-width', '3px')
    await expect(path).toHaveCSS('animation-name', 'flow-vue-dashdraw')

    const markerEnd = (await path.getAttribute('marker-end')) ?? ''
    const markerId = /url\(#(?<id>.+)\)/u.exec(markerEnd)?.groups?.['id'] ?? ''
    const marker = page.locator(`marker[id="${markerId}"]`)
    await expect(marker).toHaveAttribute('markerWidth', '20')
    await expect(marker).toHaveAttribute('data-marker-type', 'arrowclosed')
    await expect(marker.locator('polyline')).toHaveCSS(
      'fill',
      'rgb(255, 0, 114)'
    )

    const label = page.locator('[data-flow-edge-label="e-styled"]')
    await expect(label).toHaveCSS('padding', '4px 8px')
    await expect(label).toHaveCSS('border-top-left-radius', '6px')
    await expect(label.locator('.flow-vue-edge-label-text')).toHaveCSS(
      'color',
      'rgb(0, 65, 208)'
    )
    await expect(label.locator('.flow-vue-edge-label-text')).toHaveCSS(
      'font-weight',
      '700'
    )
    await expect(label.locator('.flow-vue-edge-label-bg')).toHaveCSS(
      'background-color',
      'rgb(255, 204, 0)'
    )

    // defaultEdgeOptions supply presentation fields an edge leaves unset.
    await expect(page.locator('[data-edge-id="e-plain"]')).toHaveClass(
      /from-defaults/u
    )
    await expect(
      page.locator('[data-edge-id="e-plain"] .flow-vue-edge-path')
    ).toHaveCSS('stroke-dasharray', '4px, 2px')
    await expect(edge).not.toHaveClass(/from-defaults/u)
    await expect(path).toHaveCSS('stroke-dasharray', '5px')

    const plainLabel = page.locator('[data-flow-edge-label="e-plain"]')
    await expect(plainLabel).toHaveText('no background')
    await expect(plainLabel).toHaveCSS('padding', '6px')
    await expect(plainLabel.locator('.flow-vue-edge-label-bg')).toHaveCount(0)

    // A marker without a colour on an edge without a stroke uses defaultMarkerColor.
    const plainMarker =
      (await page
        .locator('[data-edge-id="e-plain"] .flow-vue-edge-path')
        .getAttribute('marker-end')) ?? ''

    const plainMarkerId =
      /url\(#(?<id>.+)\)/u.exec(plainMarker)?.groups?.['id'] ?? ''

    await expect(
      page.locator(`marker[id="${plainMarkerId}"] polyline`)
    ).toHaveCSS('stroke', 'rgb(18, 52, 86)')

    // Updating Nodes: style and className edits re-render the wrapper.
    await fixture(page, (api) =>
      api.flow().updateNode('styled', {
        style: { backgroundColor: '#00ff00' },
        className: 'updated',
      })
    )
    await expect(styled).toHaveCSS('background-color', 'rgb(0, 255, 0)')
    await expect(styled).toHaveClass(/updated/u)
    await expect(styled).not.toHaveClass(/custom-node/u)
  })

  test('Dark Mode: colorMode light, dark and system switch the theme tokens', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await mount(page, { scene: 'presentation' })

    const canvas = page.getByTestId('flow-canvas')
    const handled = node(page, 'handled')

    const plainPath = page.locator(
      '[data-edge-id="e-plain"] .flow-vue-edge-path'
    )

    await expect(canvas).toHaveClass(/light/u)
    await expect(handled).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(plainPath).toHaveCSS('stroke', 'rgb(177, 177, 183)')

    await fixture(page, (api) => api.setColorMode('dark'))
    await expect(canvas).toHaveClass(/dark/u)
    await expect(handled).toHaveCSS('background-color', 'rgb(30, 30, 30)')
    await expect(handled).toHaveCSS('color', 'rgb(248, 248, 248)')
    await expect(plainPath).toHaveCSS('stroke', 'rgb(62, 62, 62)')
    await expect(page.getByRole('button', { name: 'Zoom Out' })).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)'
    )

    await fixture(page, (api) => api.setColorMode('system'))
    await expect(canvas).toHaveClass(/light/u)
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(canvas).toHaveClass(/dark/u)
    await page.emulateMedia({ colorScheme: 'light' })
    await expect(canvas).toHaveClass(/light/u)
  })

  test('zIndexMode stacks nodes and edges; panels, aria labels and dragHandle follow their options', async ({
    page,
  }) => {
    await mount(page, { scene: 'presentation' })

    await expect(node(page, 'below')).toHaveCSS('z-index', '5')
    await expect(node(page, 'handled')).toHaveCSS('z-index', '0')
    await node(page, 'handled').click()
    await expect(node(page, 'handled')).toHaveCSS('z-index', '1000')
    await fixture(page, (api) => api.setZIndexMode('manual'))
    await expect(node(page, 'handled')).toHaveCSS('z-index', '0')

    // ariaLabelConfig: translated controls and descriptions, explicit null title.
    await expect(page.getByRole('button', { name: 'Vergrößern' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Zoom Out' })).toBeVisible()

    const describedBy =
      (await node(page, 'styled').getAttribute('aria-describedby')) ?? ''

    await expect(page.locator(`[id="${describedBy}"]`)).toHaveText(
      'Knoten auswählen'
    )

    const edgeDescribedBy =
      (await page
        .locator('[data-flow-edge-hit="e-styled"]')
        .getAttribute('aria-describedby')) ?? ''

    await expect(page.locator(`[id="${edgeDescribedBy}"]`)).toHaveText(
      'Kante auswählen'
    )
    await expect(page.locator('.flow-vue-minimap title')).toHaveCount(0)

    // center-left and center-right placements are vertically centred.
    const canvasBox = await boxOf(page.getByTestId('flow-canvas'))
    const controls = page.locator('[data-flow-ui="controls"]')
    await expect(controls).toHaveClass(/flow-vue-controls-center-left/u)
    const controlsCentre = await centreOf(controls)
    expect(
      Math.abs(controlsCentre.y - (canvasBox.y + canvasBox.height / 2))
    ).toBeLessThan(2)
    expect(controlsCentre.x).toBeLessThan(canvasBox.x + canvasBox.width / 2)
    const panelCentre = await centreOf(page.getByTestId('center-right-panel'))
    expect(
      Math.abs(panelCentre.y - (canvasBox.y + canvasBox.height / 2))
    ).toBeLessThan(2)
    expect(panelCentre.x).toBeGreaterThan(canvasBox.x + canvasBox.width / 2)

    // dragHandle: the body does not start a drag; the handle does.
    const before = await position(page, 'grip')
    await drag(page, await centreOf(page.locator('.grip-body')), {
      x: 60,
      y: 40,
    })
    expect(await position(page, 'grip')).toEqual(before)
    await drag(page, await centreOf(page.locator('.grip-handle')), {
      x: 60,
      y: 40,
    })
    await expect
      .poll(async () => {
        const moved = await position(page, 'grip')

        return moved?.x
      })
      .toBeCloseTo((before?.x ?? 0) + 60, 0)
  })
})

test.describe('Vue snapGrid, extents and expandParent', () => {
  test('snapToGrid snaps the dragged node to snapGrid', async ({ page }) => {
    await mount(page, { scene: 'extents', snapToGrid: true })

    await drag(page, await centreOf(node(page, 'root')), { x: 40, y: 30 })
    await expect
      .poll(() => position(page, 'root'))
      .toMatchObject({ x: 150, y: 125 })
  })

  test('nodeExtent, parent extents, translateExtent and expandParent constrain drags and the viewport', async ({
    page,
  }) => {
    await mount(page, { scene: 'extents' })

    await drag(page, await centreOf(node(page, 'root')), { x: -300, y: -40 })
    await expect
      .poll(() => position(page, 'root'))
      .toMatchObject({ x: 0, y: 57 })

    await drag(page, await centreOf(node(page, 'clamped')), { x: 400, y: 0 })
    await expect
      .poll(() => position(page, 'clamped'))
      .toMatchObject({ x: 160, y: 40 })

    // expandParent grows the parent instead of clamping the child.
    await drag(page, await centreOf(node(page, 'grower')), { x: 150, y: 100 })
    await expect
      .poll(() => position(page, 'group'))
      // The grower is 80x44: the canvas node style keeps a 44px minimum height.
      .toMatchObject({ x: 300, y: 80, width: 360, height: 254 })
    await expect
      .poll(() => position(page, 'grower'))
      .toMatchObject({ x: 280, y: 210 })

    // Past the top-left the child stays at 0 and the parent grows outwards.
    await drag(page, await centreOf(node(page, 'grower')), {
      x: -350,
      y: -260,
    })
    await expect
      .poll(() => position(page, 'grower'))
      .toMatchObject({ x: 0, y: 0 })
    await expect
      .poll(() => position(page, 'group'))
      .toMatchObject({ x: 230, y: 30 })
    await expect
      .poll(() => position(page, 'clamped'))
      .toMatchObject({ x: 230, y: 90 })

    await fixture(page, (api) =>
      api.flow().setViewport({ x: 5000, y: 5000, zoom: 1 })
    )
    await expect
      .poll(() => fixture(page, (api) => api.flow().getViewport()))
      .toEqual({ x: 100, y: 100, zoom: 1 })
  })
})

test.describe('Vue MiniMap options', () => {
  test('MiniMap colours, classes, mask, position and custom nodes follow its options', async ({
    page,
  }) => {
    await mount(page, { scene: 'minimap' })

    const options = page.getByTestId('options-minimap')
    await expect(options).toHaveClass(/bottom/u)
    await expect(options).toHaveClass(/left/u)
    await expect(options).toHaveAccessibleName(/^Overview/u)

    const miniA = options.locator('[data-minimap-node="a"]')
    await expect(miniA).toHaveClass(/mini-a/u)
    await expect(miniA).toHaveCSS('fill', 'rgb(255, 0, 114)')
    await expect(miniA).toHaveCSS('stroke', 'rgb(34, 34, 34)')
    await expect(miniA).toHaveCSS('stroke-width', '3px')
    await expect(miniA).toHaveAttribute('rx', '7')
    await expect(options.locator('[data-minimap-node="b"]')).toHaveCSS(
      'fill',
      'rgb(0, 255, 0)'
    )

    const mask = options.getByTestId('flow-minimap-mask')
    await expect(mask).toHaveCSS('fill', 'rgba(10, 20, 30, 0.5)')
    await expect(mask).toHaveCSS('stroke', 'rgb(255, 0, 0)')
    await expect(options.locator('.flow-vue-minimap-background')).toHaveCSS(
      'fill',
      'rgb(238, 238, 238)'
    )

    await expect(
      page.getByTestId('slot-minimap').locator('.slot-minimap-node')
    ).toHaveCount(3)
    await expect(
      page
        .getByTestId('component-minimap')
        .locator('circle.custom-minimap-node')
    ).toHaveCount(3)
  })

  test('a pannable MiniMap pans on drag and a zoomable one zooms on wheel', async ({
    page,
  }) => {
    await mount(page, { scene: 'minimap' })

    const options = page.getByTestId('options-minimap')
    const centre = await centreOf(options)
    await page.mouse.move(centre.x, centre.y)
    await page.mouse.down()
    await page.mouse.move(centre.x + 20, centre.y + 10, { steps: 5 })
    await page.mouse.up()

    await expect
      .poll(() => fixture(page, (api) => api.flow().getViewport().x))
      .toBeLessThan(-20)

    const panned = await fixture(page, (api) => api.flow().getViewport())

    // The drag does not also recenter on release.
    await page.waitForTimeout(100)
    expect(await fixture(page, (api) => api.flow().getViewport())).toEqual(
      panned
    )

    await page.mouse.move(centre.x, centre.y)
    await page.mouse.wheel(0, -200)
    await expect
      .poll(() => fixture(page, (api) => api.flow().getZoom()))
      .toBeGreaterThan(1.1)
  })
})

const control = (page: Page, nodeId: string, at: string) =>
  node(page, nodeId).locator(
    `[data-testid="flow-node-resize-control"][data-position="${at}"]`
  )

test.describe('Vue NodeResizer and NodeResizeControl', () => {
  test('FlowNodeResizer resizes within min/max and reports ResizeParams', async ({
    page,
  }) => {
    await mount(page, { scene: 'resizer' })

    await expect(
      node(page, 'resizable').getByTestId('flow-node-resize-control')
    ).toHaveCount(8)
    // The node renders its own resizer, so the canvas switch adds none.
    await expect(
      node(page, 'resizable').getByTestId('flow-node-resize-handle')
    ).toHaveCount(0)

    await drag(
      page,
      await centreOf(control(page, 'resizable', 'bottom-right')),
      {
        x: 60,
        y: 40,
      }
    )
    await expect
      .poll(() => position(page, 'resizable'))
      .toMatchObject({ x: 60, y: 60, width: 220, height: 120 })

    const names = await fixture(page, (api) =>
      api.resizes().map(({ name }) => name)
    )

    expect(names[0]).toBe('start:resizable')
    expect(names).toContain('resize:resizable')
    expect(names.at(-1)).toBe('end:resizable')
    const end = await fixture(page, (api) => api.resizes().at(-1))
    expect(end).toMatchObject({ x: 60, y: 60, width: 220, height: 120 })

    await drag(
      page,
      await centreOf(control(page, 'resizable', 'bottom-right')),
      {
        x: 200,
        y: 200,
      }
    )
    await expect
      .poll(() => position(page, 'resizable'))
      .toMatchObject({ width: 260, height: 200 })

    await drag(page, await centreOf(control(page, 'resizable', 'top-left')), {
      x: 400,
      y: 400,
    })
    await expect
      .poll(() => position(page, 'resizable'))
      .toMatchObject({ x: 220, y: 210, width: 100, height: 50 })
  })

  test('keepAspectRatio, a single horizontal control, shouldResize and autoScale', async ({
    page,
  }) => {
    await mount(page, { scene: 'resizer' })

    await drag(page, await centreOf(control(page, 'ratio', 'bottom-right')), {
      x: 80,
      y: 0,
    })
    await expect
      .poll(() => position(page, 'ratio'))
      .toMatchObject({ width: 240, height: 120 })

    const single = control(page, 'control', 'right')
    await expect(single).toHaveCount(1)
    await expect(single.locator('.custom-control')).toHaveText('↔')
    await drag(page, await centreOf(single), { x: 50, y: 50 })
    await expect
      .poll(() => position(page, 'control'))
      .toMatchObject({ width: 190, height: 60 })

    await drag(page, await centreOf(control(page, 'vetoed', 'right')), {
      x: 80,
      y: 0,
    })
    const vetoed = await position(page, 'vetoed')
    expect(vetoed?.width).toBeGreaterThan(120)
    expect(vetoed?.width).toBeLessThan(150)

    await fixture(page, (api) =>
      api.flow().setViewport({ x: 0, y: 0, zoom: 0.5 })
    )
    await expect(control(page, 'ratio', 'bottom-right')).toHaveCSS('scale', '2')
  })

  test('nodesResizable still adds built-in controls to nodes without a resizer; expandParent grows the parent', async ({
    page,
  }) => {
    await mount(page, { scene: 'resizer' })

    await node(page, 'plain').click()
    await expect(
      node(page, 'plain').getByTestId('flow-node-resize-handle')
    ).toHaveCount(8)

    await drag(page, await centreOf(control(page, 'child', 'bottom-right')), {
      x: 150,
      y: 120,
    })
    await expect
      .poll(() => position(page, 'child'))
      .toMatchObject({ x: 60, y: 60, width: 250, height: 180 })
    await expect
      .poll(() => position(page, 'parent'))
      .toMatchObject({ x: 560, y: 260, width: 310, height: 240 })
  })
})

test('Labeled Group recipe renders a titled group whose children sit inside and move with it', async ({
  page,
}) => {
  await page.goto('/ui-recipes/labeled-group/')

  const group = node(page, 'group')
  await expect(group.locator('.flow-vue-labeled-group-label')).toHaveText(
    'Labeled Group'
  )
  await expect(page.getByRole('group', { name: 'Labeled Group' })).toBeVisible()

  const groupBox = await boxOf(group)
  const labelBox = await boxOf(group.locator('.flow-vue-labeled-group-label'))
  expect(Math.abs(labelBox.x - groupBox.x)).toBeLessThan(2)
  expect(Math.abs(labelBox.y - groupBox.y)).toBeLessThan(2)

  const childBoxes = await Promise.all(
    ['child-a', 'child-b'].map((id) => boxOf(node(page, id)))
  )

  for (const childBox of childBoxes) {
    expect(childBox.x).toBeGreaterThanOrEqual(groupBox.x)
    expect(childBox.y).toBeGreaterThanOrEqual(groupBox.y)
    expect(childBox.x + childBox.width).toBeLessThanOrEqual(
      groupBox.x + groupBox.width + 1
    )
    expect(childBox.y + childBox.height).toBeLessThanOrEqual(
      groupBox.y + groupBox.height + 1
    )
  }

  // Dragging the group carries its children.
  const childBefore = await boxOf(node(page, 'child-a'))
  await drag(
    page,
    { x: groupBox.x + groupBox.width - 20, y: groupBox.y + 20 },
    {
      x: 80,
      y: 50,
    }
  )
  await expect
    .poll(async () => {
      const moved = await boxOf(node(page, 'child-a'))

      return moved.x
    })
    .toBeCloseTo(childBefore.x + 80, 0)

  // A child cannot leave its group.
  await drag(page, await centreOf(node(page, 'child-b')), { x: 600, y: 400 })
  const movedGroup = await boxOf(group)
  const movedChild = await boxOf(node(page, 'child-b'))
  expect(movedChild.x + movedChild.width).toBeLessThanOrEqual(
    movedGroup.x + movedGroup.width + 1
  )
  expect(movedChild.y + movedChild.height).toBeLessThanOrEqual(
    movedGroup.y + movedGroup.height + 1
  )
})
