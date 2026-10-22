import {
  createFlowGraph,
  decodeFlowDocument,
  selectFlowMiniMapProjection,
} from '@flow/core'
import type { MeasuredNode, NodeId } from '@flow/core'
import { expect, test } from '@playwright/test'
import { Effect } from 'effect'

test('Foldkit MiniMap renders per-instance projections and cleans up navigation listeners', async ({
  page,
}) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const uiModulePath = '/e2e/package-ui.ts'
    const { createFlowMiniMap } = await import(uiModulePath)

    const canvasA = document.createElement('div')
    const canvasB = document.createElement('div')
    Object.defineProperties(canvasA, {
      clientWidth: { value: 400 },
      clientHeight: { value: 300 },
    })
    Object.defineProperties(canvasB, {
      clientWidth: { value: 500 },
      clientHeight: { value: 250 },
    })
    document.body.append(canvasA, canvasB)
    const centersA: { x: number; y: number }[] = []
    const centersB: { x: number; y: number }[] = []

    const nodes = [
      {
        id: 'visible',
        label: 'Visible',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 60 },
      },
      {
        id: 'hidden',
        label: 'Hidden',
        hidden: true,
        position: { x: 160, y: 0 },
        size: { width: 80, height: 40 },
      },
      {
        id: 'far',
        label: 'Far',
        position: { x: 300, y: 120 },
        size: { width: 80, height: 50 },
      },
    ]

    const orderedNodes = nodes.map((node, documentIndex) => ({
      id: node.id,
      node,
      documentIndex,
      parentId: undefined,
      absolutePosition: node.position,
      dimensions: node.size,
      hidden: node.hidden ?? false,
    }))

    const graph = {
      document: { nodes, edges: [] },
      nodes: new Map(),
      children: new Map(),
      orderedNodes,
    }

    const hiddenGraph = {
      ...graph,
      orderedNodes: orderedNodes.map((entry) => ({ ...entry, hidden: true })),
    }

    const clientA = {
      setCenter: (point: { x: number; y: number }) => {
        centersA.push(point)

        return Promise.resolve({})
      },
    }

    const clientB = {
      setCenter: (point: { x: number; y: number }) => {
        centersB.push(point)

        return Promise.resolve({})
      },
    }

    const first = createFlowMiniMap(document, canvasA, clientA, graph, {
      x: 0,
      y: 0,
      zoom: 1,
    })

    const second = createFlowMiniMap(document, canvasB, clientB, graph, {
      x: -40,
      y: -20,
      zoom: 1.2,
    })

    const uniqueIds =
      first.element.dataset.flowMinimap !== second.element.dataset.flowMinimap

    const nodeIds = [
      ...first.element.querySelectorAll('[data-minimap-node]'),
    ].map((node) => node.dataset.minimapNode)

    first.element.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: 40, clientY: 40 })
    )
    first.element.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    )
    second.element.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true })
    )
    const isolated = centersA.length === 2 && centersB.length === 1
    first.dispose()
    first.element.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true })
    )
    const cleanup = centersA.length === 2 && !canvasA.contains(first.element)
    second.update(hiddenGraph, { x: 0, y: 0, zoom: 1 })

    const empty =
      second.element.getAttribute('role') === 'img' &&
      second.element.getAttribute('tabindex') === null &&
      second.element.querySelectorAll('[data-minimap-node]').length === 0

    second.dispose()
    canvasA.remove()
    canvasB.remove()

    return { uniqueIds, nodeIds, isolated, cleanup, empty }
  })

  expect(result.uniqueIds).toBe(true)
  expect(result.nodeIds).toEqual(['visible', 'far'])
  expect(result.isolated).toBe(true)
  expect(result.cleanup).toBe(true)
  expect(result.empty).toBe(true)
})

test('Foldkit MiniMap updates node geometry from accepted DOM measurements', async ({
  page,
}) => {
  await page.goto('/')

  const nodeRect = page.locator(
    '.flow-foldkit-minimap [data-minimap-node="validate"]'
  )

  const measurementStatus = page.locator(
    '.flow-state-tools output:not([data-measurement])'
  )

  await expect(nodeRect).toBeVisible()

  const initial = await nodeRect.evaluate((element) => ({
    width: Number(element.getAttribute('width')),
    height: Number(element.getAttribute('height')),
  }))

  await page
    .getByRole('button', { name: 'Toggle measured size and handle offset' })
    .click()
  await expect(measurementStatus).toContainText('Measurement measured')

  const measuredSizes = await page
    .locator('.flow-foldkit-canvas [data-node-id]')
    .evaluateAll((elements) =>
      Object.fromEntries(
        elements.map((element) => {
          const bounds = element.getBoundingClientRect()

          return [
            element.dataset.nodeId ?? 'unknown',
            { width: bounds.width, height: bounds.height },
          ]
        })
      )
    )

  const canvas = await page
    .locator('.flow-foldkit-canvas')
    .evaluate((element) => ({
      width: element.clientWidth,
      height: element.clientHeight,
    }))

  const document = Effect.runSync(
    decodeFlowDocument({
      nodes: [
        { id: 'source', label: 'Source', position: { x: 100, y: 120 } },
        { id: 'validate', label: 'Validate', position: { x: 420, y: 120 } },
        { id: 'target', label: 'Target', position: { x: 420, y: 300 } },
      ],
      edges: [],
    })
  )

  const measurements = new Map<NodeId, MeasuredNode>()

  for (const node of document.nodes) {
    const measured = measuredSizes[node.id]

    if (measured !== undefined) {
      measurements.set(node.id, { nodeId: node.id, ...measured })
    }
  }

  const projection = selectFlowMiniMapProjection({
    graph: createFlowGraph(document, measurements),
    viewport: { x: 0, y: 0, zoom: 1 },
    canvas,
    size: { width: 180, height: 120 },
  })

  if (projection === undefined) {
    throw new Error('Expected nonempty production graph projection')
  }

  const actual = await nodeRect.evaluate((element) => ({
    width: Number(element.getAttribute('width')),
    height: Number(element.getAttribute('height')),
  }))

  const validateMeasurement = measuredSizes.validate

  if (validateMeasurement === undefined) {
    throw new Error('Expected accepted DOM measurement for validate node')
  }

  const expected = {
    // Upstream: packages/react/src/additional-components/MiniMap/MiniMapNodes.tsx:94-115.
    width: validateMeasurement.width,
    height: validateMeasurement.height,
  }

  expect(initial).not.toStrictEqual(actual)
  expect(actual.width).toBeCloseTo(expected.width, 5)
  expect(actual.height).toBeCloseTo(expected.height, 5)
})
