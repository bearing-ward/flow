import type { FlowEdgeSchema, FlowNodeSchema } from '@flow/core'
import { expect, test } from '@playwright/test'

import {
  centreOf,
  dragBy,
  mountModelStyling,
  nodeLocator,
  readNode,
} from './model-styling-shared.ts'

type NodeInput = typeof FlowNodeSchema.Encoded

type EdgeInput = typeof FlowEdgeSchema.Encoded

const box = (
  id: string,
  x: number,
  y: number,
  extra: Partial<NodeInput> = {}
): NodeInput => ({
  id,
  label: id.toUpperCase(),
  position: { x, y },
  size: { width: 120, height: 50 },
  ...extra,
})

const linked = (extra: Partial<EdgeInput> = {}) => ({
  nodes: [
    box('a', 40, 60, { sourcePosition: 'right', targetPosition: 'left' }),
    box('b', 420, 260, { sourcePosition: 'right', targetPosition: 'left' }),
  ],
  edges: [{ id: 'e', source: 'a', target: 'b', label: 'Edge', ...extra }],
})

test('Updating Nodes: node style, className, default handles and dragHandle', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: {
      nodes: [
        box('styled', 40, 40, {
          style: { backgroundColor: 'rgb(255, 0, 0)', borderRadius: 12 },
          className: 'custom-node extra',
          sourcePosition: 'right',
          targetPosition: 'left',
        }),
        box('handle', 300, 200, {
          type: 'handle',
          dragHandle: '.custom-drag-handle',
        }),
      ],
      edges: [],
    },
  })

  const styled = nodeLocator(page, 'styled')
  await expect(styled).toHaveClass(/\bcustom-node\b.*\bextra\b/u)
  await expect(styled).toHaveCSS('background-color', 'rgb(255, 0, 0)')
  await expect(styled).toHaveCSS('border-radius', '12px')
  await expect(styled.locator('[data-handle-id="source"]')).toHaveAttribute(
    'data-handle-side',
    'right'
  )
  await expect(styled.locator('[data-handle-id="target"]')).toHaveAttribute(
    'data-handle-side',
    'left'
  )

  // React "Updating Nodes": edit label, style and hidden through updateNode.
  await page.evaluate(() =>
    window.__flowFoldkitModelStyling?.edit([
      {
        kind: 'update-node',
        nodeId: 'styled',
        patch: {
          label: 'Renamed',
          style: { backgroundColor: 'rgb(0, 128, 0)' },
          className: 'updated',
        },
      },
    ])
  )
  await expect(styled).toHaveCSS('background-color', 'rgb(0, 128, 0)')
  await expect(styled).toHaveClass(/\bupdated\b/u)
  await expect(styled).toContainText('Renamed')

  const handleNode = nodeLocator(page, 'handle')
  const before = await readNode(page, 'handle')
  await dragBy(page, handleNode.getByTestId('body'), 60, 40)
  expect(await readNode(page, 'handle').then((node) => node?.position)).toEqual(
    before?.position
  )

  await dragBy(page, handleNode.locator('.custom-drag-handle'), 60, 40)
  await expect
    .poll(() => readNode(page, 'handle').then((node) => node?.position))
    .toEqual({ x: 360, y: 240 })
})

test('Edge style, className, animation, label styling and configured markers', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: {
      nodes: linked().nodes,
      edges: [
        {
          id: 'styled',
          source: 'a',
          target: 'b',
          label: 'Styled',
          style: { stroke: 'rgb(0, 0, 255)', strokeWidth: 3 },
          className: 'custom-edge',
          animated: true,
          labelStyle: { fill: 'rgb(255, 0, 0)' },
          labelBgStyle: { fill: 'rgb(0, 0, 0)' },
          labelBgPadding: [8, 4],
          labelBgBorderRadius: 6,
          markerEnd: {
            type: 'arrowclosed',
            color: 'rgb(255, 0, 255)',
            width: 20,
            height: 20,
          },
        },
        { id: 'defaults', source: 'b', target: 'a' },
      ],
    },
    options: {
      defaultEdgeOptions: { animated: true, markerEnd: 'arrow' },
      defaultMarkerColor: 'rgb(18, 52, 86)',
    },
  })

  const styled = page.locator('.flow-foldkit-edge[data-edge-id="styled"]')
  const path = styled.locator('.flow-foldkit-edge-path')
  await expect(styled).toHaveClass(/\bcustom-edge\b/u)
  await expect(styled).toHaveClass(/\banimated\b/u)
  await expect(path).toHaveCSS('stroke', 'rgb(0, 0, 255)')
  await expect(path).toHaveCSS('stroke-width', '3px')
  await expect(path).toHaveCSS('animation-name', 'flow-foldkit-dashdraw')

  const label = page.locator('.flow-foldkit-edge-label[data-edge-id="styled"]')
  await expect(label).toHaveCSS('background-color', 'rgb(0, 0, 0)')
  await expect(label).toHaveCSS('padding', '4px 8px')
  await expect(label).toHaveCSS('border-radius', '6px')
  await expect(label.locator('.flow-foldkit-edge-label-text')).toHaveCSS(
    'color',
    'rgb(255, 0, 0)'
  )

  const marker = (edgeId: string) =>
    page.evaluate((id) => {
      const visible = document.querySelector(
        `.flow-foldkit-edge[data-edge-id="${id}"] .flow-foldkit-edge-path`
      )

      const markerId = /^url\(#(?<id>.+)\)$/u.exec(
        visible?.getAttribute('marker-end') ?? ''
      )?.groups?.['id']

      const element =
        markerId === undefined ? null : document.querySelector(`#${markerId}`)

      const symbol = element?.querySelector('polyline')

      return {
        width: element?.getAttribute('markerWidth') ?? null,
        stroke:
          symbol === null || symbol === undefined
            ? null
            : getComputedStyle(symbol).stroke,
        fill:
          symbol === null || symbol === undefined
            ? null
            : getComputedStyle(symbol).fill,
      }
    }, edgeId)

  expect(await marker('styled')).toEqual({
    width: '20',
    stroke: 'rgb(255, 0, 255)',
    fill: 'rgb(255, 0, 255)',
  })
  expect(await marker('defaults')).toEqual({
    width: '12.5',
    stroke: 'rgb(18, 52, 86)',
    fill: 'none',
  })
  await expect(
    page.locator('.flow-foldkit-edge[data-edge-id="defaults"]')
  ).toHaveClass(/\banimated\b/u)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(path).toHaveCSS('animation-name', 'none')
})

test('Dark Mode and Base Style: colorMode classes and theme variables', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: linked(),
    options: { colorMode: 'dark' },
  })

  const canvas = page.locator('.flow-foldkit-canvas')
  const node = nodeLocator(page, 'a')
  const path = page.locator('.flow-foldkit-edge-path').first()

  await expect(canvas).toHaveClass(/\bdark\b/u)
  await expect(node).toHaveCSS('background-color', 'rgb(30, 30, 30)')
  await expect(path).toHaveCSS('stroke', 'rgb(62, 62, 62)')

  await page.evaluate(() =>
    window.__flowFoldkitModelStyling?.setColorMode('light')
  )
  await expect(canvas).toHaveClass(/\blight\b/u)
  await expect(node).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(path).toHaveCSS('stroke', 'rgb(177, 177, 183)')

  // Base Style: a user `--flow-*` variable overrides the theme default.
  await canvas.evaluate((element) => {
    element.parentElement?.style.setProperty(
      '--flow-node-background-color',
      'rgb(1, 2, 3)'
    )
  })
  await expect(node).toHaveCSS('background-color', 'rgb(1, 2, 3)')

  await page.emulateMedia({ colorScheme: 'dark' })
  await page.evaluate(() =>
    window.__flowFoldkitModelStyling?.setColorMode('system')
  )
  await expect(canvas).toHaveClass(/\bdark\b/u)
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(canvas).toHaveClass(/\blight\b/u)
})

test('zIndexMode stacking elevates selections and keeps children above parents', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: {
      nodes: [
        box('parent', 40, 40, { size: { width: 300, height: 200 } }),
        box('child', 20, 40, { parentId: 'parent' }),
        box('picked', 420, 60, { selected: true }),
        box('other', 420, 260),
      ],
      edges: [
        { id: 'chosen', source: 'picked', target: 'other', selected: true },
      ],
    },
    options: { elevateEdgesOnSelect: true },
  })

  const z = async (selector: string) =>
    Number(
      await page
        .locator(selector)
        .evaluate((element) => getComputedStyle(element).zIndex)
    )

  expect(await z('.flow-foldkit-node[data-node-id="child"]')).toBeGreaterThan(
    await z('.flow-foldkit-node[data-node-id="parent"]')
  )
  expect(
    await z('.flow-foldkit-node[data-node-id="picked"]')
  ).toBeGreaterThanOrEqual(1000)
  expect(
    await z('.flow-foldkit-edge[data-edge-id="chosen"]')
  ).toBeGreaterThanOrEqual(1000)

  await mountModelStyling(page, {
    document: {
      nodes: [box('picked', 420, 60, { selected: true, zIndex: 3 })],
      edges: [],
    },
    options: { zIndexMode: 'manual' },
  })
  expect(await z('.flow-foldkit-node[data-node-id="picked"]')).toBe(3)
})

test('snapGrid, nodeExtent, translateExtent and FitViewOptions', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: {
      nodes: [
        box('a', 10, 10, { size: { width: 100, height: 50 } }),
        box('far', 2000, 1500, { hidden: true }),
      ],
      edges: [],
    },
    options: {
      nodeDragThreshold: 0,
      snapToGrid: true,
      snapGrid: [25, 25],
      nodeExtent: [
        [0, 0],
        [400, 300],
      ],
      panOnDrag: true,
      selectionOnDrag: false,
      translateExtent: [
        [0, 0],
        [1000, 800],
      ],
    },
  })

  const node = nodeLocator(page, 'a')
  await dragBy(page, node, 37, 12)
  await expect
    .poll(() => readNode(page, 'a').then((current) => current?.position))
    .toEqual({ x: 50, y: 25 })

  await dragBy(page, node, 900, 900)
  await expect
    .poll(() => readNode(page, 'a').then((current) => current?.position))
    .toEqual({ x: 300, y: 250 })

  const viewport = () =>
    page.evaluate(() => window.__flowFoldkitModelStyling?.viewport())

  const pane = page.locator('.flow-foldkit-canvas')
  const paneBox = await pane.boundingBox()

  if (paneBox === null) {
    throw new Error('Missing pane')
  }

  const panBy = async (dx: number) => {
    const x = paneBox.x + 700
    const y = paneBox.y + 450
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + dx, y, { steps: 6 })
    await page.mouse.up()
  }

  await panBy(150)
  expect(await viewport().then((current) => current?.x)).toBe(0)
  await panBy(-400)
  expect(await viewport().then((current) => current?.x)).toBe(-200)

  const fitted = await page.evaluate(() =>
    window.__flowFoldkitModelStyling?.fitView({
      nodes: [{ id: 'a' }],
      padding: 0,
      maxZoom: 1.5,
    })
  )

  expect(fitted?.zoom).toBe(1.5)

  const limited = await page.evaluate(() =>
    window.__flowFoldkitModelStyling?.fitView({ minZoom: 0.1, maxZoom: 0.5 })
  )

  expect(limited?.zoom).toBeLessThanOrEqual(0.5)

  const withHidden = await page.evaluate(() =>
    window.__flowFoldkitModelStyling?.fitView({
      includeHiddenNodes: true,
      minZoom: 0.05,
    })
  )

  expect(withHidden?.zoom).toBeLessThan(0.5)
})

test('ariaLabelConfig labels handles and describes nodes and edges', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: linked(),
    options: {
      ariaLabelConfig: {
        'handle.ariaLabel': 'Port',
        'node.a11yDescription.keyboardDisabled': 'Custom node help',
        'edge.a11yDescription.default': 'Custom edge help',
      },
    },
  })

  await expect(
    nodeLocator(page, 'a').locator('[data-handle-id="source"]')
  ).toHaveAttribute('aria-label', 'Port')

  const described = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((element) => {
        const id = element.getAttribute('aria-describedby') ?? ''

        return document.querySelector(`#${id}`)?.textContent ?? null
      })

  expect(await described('.flow-foldkit-node')).toBe('Custom node help')
  expect(await described('.flow-foldkit-edge-hit-target')).toBe(
    'Custom edge help'
  )
})

test('Contextual Zoom: node views receive the viewport zoom', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: { nodes: [box('z', 100, 100, { type: 'zoom' })], edges: [] },
  })

  await expect(page.getByTestId('zoom-detail')).toHaveText('Z')
  await page.evaluate(() =>
    window.__flowFoldkitModelStyling?.setViewport({ x: 0, y: 0, zoom: 0.5 })
  )
  await expect(page.getByTestId('zoom-placeholder')).toBeVisible()
  await expect(page.getByTestId('zoom-detail')).toHaveCount(0)
  await page.evaluate(() =>
    window.__flowFoldkitModelStyling?.setViewport({ x: 0, y: 0, zoom: 1.2 })
  )
  await expect(page.getByTestId('zoom-detail')).toBeVisible()
})

test('expandParent grows the parent while a child is dragged out', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: {
      nodes: [
        box('parent', 40, 40, { size: { width: 240, height: 140 } }),
        box('child', 20, 40, {
          parentId: 'parent',
          expandParent: true,
          size: { width: 100, height: 50 },
        }),
      ],
      edges: [],
    },
    options: { nodeDragThreshold: 0 },
  })

  const child = nodeLocator(page, 'child')
  const parent = nodeLocator(page, 'parent')
  const start = await centreOf(child)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 200, start.y, { steps: 8 })

  // The live preview already shows the grown parent.
  await expect
    .poll(() => parent.boundingBox().then((bounds) => bounds?.width ?? 0))
    .toBeGreaterThan(300)
  await page.mouse.up()

  await expect
    .poll(() => readNode(page, 'parent').then((node) => node?.size?.width))
    .toBe(320)
  expect(await readNode(page, 'child').then((node) => node?.position)).toEqual({
    x: 220,
    y: 40,
  })
})
