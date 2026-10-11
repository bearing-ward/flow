import { expect, test } from '@playwright/test'

import {
  assertDynamicHandleRefresh,
  assertHandleMemberAcceptance,
} from '../../shared-e2e/handle-refresh-contract.ts'
import { assertSharedMeasurementContract } from '../../shared-e2e/measured-geometry-contract.ts'
import type { JavaScriptFlowController } from '../src/public.ts'
import { createVanillaConformanceAdapter } from './controller-conformance.ts'

test('Vanilla production APIs satisfy the shared measured-geometry cases', async ({
  page,
}) => {
  await assertSharedMeasurementContract(createVanillaConformanceAdapter(page))
})

test('vanilla exposes refreshed measured geometry outside document notifications', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { createFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow root')
    }

    window.__measuredGeometryController = await createFlow(
      root,
      {
        nodes: [
          { id: 'parent', label: 'Parent', position: { x: 30, y: 40 } },
          {
            id: 'child',
            label: 'Child',
            parentId: 'parent',
            position: { x: 12, y: 18 },
          },
        ],
        edges: [],
      },
      {
        documentMode: 'uncontrolled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 2 },
          limits: { minZoom: 0.25, maxZoom: 4 },
        },
      }
    )
  })

  await page.waitForFunction(() =>
    Boolean(window.__measuredGeometryController?.nodesInitialized())
  )

  const result = await page.evaluate(async () => {
    const controller = window.__measuredGeometryController
    const child = document.querySelector<HTMLElement>('[data-node-id="child"]')

    if (controller === undefined || child === null) {
      throw new Error('Missing measured node')
    }

    const accepted: string[] = []
    const stop = controller.subscribeState(({ cause }) => accepted.push(cause))
    const initial = controller.getInternalNode('child')
    const initialRect = child.getBoundingClientRect()
    child.style.width = '240px'
    const refresh = await controller.updateNodeInternals(['child', 'absent'])
    const refreshed = controller.getInternalNode('child')
    const refreshedRect = child.getBoundingClientRect()
    stop()

    return {
      accepted,
      initial,
      initialRect: {
        width: initialRect.width / 2,
        height: initialRect.height / 2,
      },
      refresh,
      refreshed,
      refreshedRect: {
        width: refreshedRect.width / 2,
        height: refreshedRect.height / 2,
      },
    }
  })

  expect(result.initial?.absolutePosition).toEqual({ x: 42, y: 58 })
  expect(result.initial?.measurementStatus).toBe('measured')
  expect(result.initial?.width).toBeCloseTo(result.initialRect.width)
  expect(result.initial?.height).toBeCloseTo(result.initialRect.height)
  expect(result.refresh).toEqual([
    { nodeId: 'child', status: 'requested' },
    { nodeId: 'absent', status: 'missing' },
  ])
  expect(result.refreshed?.width).toBeCloseTo(result.refreshedRect.width)
  expect(result.refreshed?.width).toBeGreaterThan(result.initial?.width ?? 0)
  expect(result.accepted).toEqual([])

  const disposed = await page.evaluate(() => {
    const controller = window.__measuredGeometryController

    if (controller === undefined) {
      throw new Error('Missing controller')
    }

    controller.destroy()

    return controller.updateNodeInternals(['child'])
  })

  expect(disposed).toEqual([{ nodeId: 'child', status: 'disposed' }])
})

test('vanilla measurements use graph units at multiple zooms and stay canvas-local', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { createFlow } = await import(modulePath)
    const firstRoot = document.querySelector<HTMLElement>('#app')

    if (firstRoot === null) {
      throw new Error('Missing first canvas root')
    }

    const secondRoot = document.createElement('div')
    secondRoot.style.position = 'fixed'
    secondRoot.style.left = '700px'
    secondRoot.style.top = '0'
    secondRoot.style.width = '600px'
    secondRoot.style.height = '400px'
    document.body.append(secondRoot)
    firstRoot.style.width = '600px'
    firstRoot.style.height = '400px'

    const graph = {
      edges: [],
      nodes: [{ id: 'shared', label: 'Shared', position: { x: 40, y: 30 } }],
    }

    const create = (root: HTMLElement, zoom: number) =>
      createFlow(root, graph, {
        documentMode: 'uncontrolled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom },
          limits: { minZoom: 0.25, maxZoom: 4 },
        },
      })

    window.__measuredGeometryControllers = [
      await create(firstRoot, 0.5),
      await create(secondRoot, 2),
    ]
  })

  await page.waitForFunction(() =>
    window.__measuredGeometryControllers?.every((controller) =>
      controller.nodesInitialized()
    )
  )

  const result = await page.evaluate(async () => {
    const [first, second] = window.__measuredGeometryControllers ?? []

    const nodes = [
      ...document.querySelectorAll<HTMLElement>('[data-node-id="shared"]'),
    ]

    if (first === undefined || second === undefined || nodes.length !== 2) {
      throw new Error('Expected two mounted production canvases')
    }

    const [firstNode] = nodes

    if (firstNode === undefined) {
      throw new Error('Missing first production node')
    }

    const savedBefore = [
      first.getSnapshot().document,
      second.getSnapshot().document,
    ]

    for (const node of nodes) {
      node.style.boxSizing = 'border-box'
      node.style.minWidth = '0'
      node.style.minHeight = '0'
      node.style.padding = '0'
      node.style.border = '0'
      node.style.width = '120px'
      node.style.height = '48px'
    }

    const [firstRefresh, secondRefresh] = await Promise.all([
      first.updateNodeInternals(['shared']),
      second.updateNodeInternals(['shared']),
    ])

    const graphMeasurements = [
      first.getInternalNode('shared')?.width,
      second.getInternalNode('shared')?.width,
    ]

    const zooms = [first.getViewport().zoom, second.getViewport().zoom]

    const cssMeasurements = nodes.map((node, index) => {
      const rect = node.getBoundingClientRect()

      return rect.width / (zooms[index] ?? 1)
    })

    firstNode.style.width = '180px'

    const isolatedRefresh = await first.updateNodeInternals(['shared'])

    const isolatedMeasurements = [
      first.getInternalNode('shared')?.width,
      second.getInternalNode('shared')?.width,
    ]

    const savedAfter = [
      first.getSnapshot().document,
      second.getSnapshot().document,
    ]

    const queued = second.updateNodeInternals(['shared'])
    second.destroy()
    const queuedResult = await queued
    first.destroy()

    return {
      firstRefresh,
      secondRefresh,
      graphMeasurements,
      cssMeasurements,
      zooms,
      isolatedRefresh,
      isolatedMeasurements,
      savedBefore,
      savedAfter,
      queuedResult,
    }
  })

  expect(result.zooms).toEqual([0.5, 2])
  expect(result.firstRefresh[0]?.status).toBe('requested')
  expect(result.secondRefresh[0]?.status).toBe('requested')
  expect(result.graphMeasurements).toEqual([120, 120])
  expect(result.cssMeasurements[0]).toBeCloseTo(120)
  expect(result.cssMeasurements[1]).toBeCloseTo(120)
  expect(result.isolatedRefresh[0]?.status).toBe('requested')
  expect(result.isolatedMeasurements).toEqual([180, 120])
  expect(result.savedAfter).toEqual(result.savedBefore)
  expect(result.queuedResult).toEqual([
    { nodeId: 'shared', status: 'disposed' },
  ])
})

declare global {
  interface Window {
    __measuredGeometryController?: JavaScriptFlowController
    __measuredGeometryControllers?: JavaScriptFlowController[]
  }
}

for (const zoom of [0.5, 2]) {
  for (const controlled of [false, true]) {
    test(`vanilla dynamic handle refresh at zoom ${zoom}, controlled ${
      controlled
    }`, async ({ page }) => {
      await assertDynamicHandleRefresh(page, 'vanilla', zoom, controlled, false)
    })
  }
}

test('vanilla actual public geometry and SVG endpoints match pinned equivalent handle layout', async ({
  page,
}) => {
  await assertDynamicHandleRefresh(page, 'vanilla', 1, false, true)
})

for (const zoom of [0.5, 2]) {
  test(`vanilla original 065 member mappings at zoom ${zoom}`, async ({
    page,
  }) => {
    await assertHandleMemberAcceptance(page, 'vanilla', zoom)
  })
}
