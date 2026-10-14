import type { FlowDocumentSchema } from '@flow/core'
import { expect, test } from '@playwright/test'

import {
  expectedRendererContractSemantics,
  normalizeRendererContractOutput,
  rendererContractFixture,
} from '../../shared-e2e/renderer-contract.ts'
import type { RendererContractObservedOutput } from '../../shared-e2e/renderer-contract.ts'

declare global {
  interface Window {
    __rendererNode: Element | undefined
    __rendererEdge: Element | undefined
  }
}

test('Foldkit typed renderer registries preserve geometry, identity, handles and isolation', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startRendererContract()
  })

  const canvases = page.locator('.flow-foldkit-canvas')
  await expect(canvases).toHaveCount(2)
  await expect(page.locator('.custom-node-view')).toHaveCount(2)
  await expect(
    page.locator('.flow-foldkit-node[data-node-id="renderer-fallback"]')
  ).toHaveText(['Fallback node', 'Fallback node'])
  await expect(page.locator('.flow-foldkit-edge')).toHaveCount(10)
  await expect(page.locator('.flow-foldkit-edge-labels')).toHaveCount(2)

  const input = page.locator('.custom-node-input').first()
  await input.fill('Native input works')
  await expect(input).toHaveValue('Native input works')

  const noDrag = page.locator('.custom-node-no-drag').first()

  const customNode = page
    .locator('.flow-foldkit-node[data-node-id="renderer-custom"]')
    .first()

  /* eslint-disable no-await-in-loop -- Exercise each host-owned input target serially on one node. */
  for (const target of [input, noDrag]) {
    const bounds = await target.boundingBox()

    if (bounds === null) {
      throw new Error('Missing nested input/no-drag geometry')
    }

    const eventOwnership = await target.evaluate((element) => {
      const key = element.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'ArrowRight',
        })
      )

      const wheel = element.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: 80,
        })
      )

      return { keyNotPrevented: key, wheelNotPrevented: wheel }
    })

    expect(eventOwnership).toEqual({
      keyNotPrevented: true,
      wheelNotPrevented: true,
    })

    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      bounds.x + bounds.width + 40,
      bounds.y + bounds.height / 2
    )
    await page.mouse.up()
    await expect(customNode).toHaveAttribute('style', /top: 70px/u)
    await expect(customNode).toHaveAttribute('style', /left: 50px/u)
  }
  /* eslint-enable no-await-in-loop */

  await page.locator('.custom-node-action').first().click()
  await expect(input).toHaveValue('Native input works')
  await expect(
    page.locator('.flow-foldkit-node[data-node-id="renderer-custom"]').first()
  ).toHaveAttribute('style', /top: 160px/u)

  const initial = await page.evaluate(() => {
    const customEdge = document.querySelector<SVGElement>(
      '.flow-foldkit-edge[data-edge-id="renderer-custom-edge"]'
    )

    const customPath =
      customEdge?.querySelector<SVGPathElement>('.custom-edge-view')

    const edgePaths = [...document.querySelectorAll('.flow-foldkit-edge-path')]

    const markers = [
      ...document.querySelectorAll('.flow-foldkit-edge marker'),
    ].map(({ id }) => id)

    const labels = [
      ...document.querySelectorAll<HTMLElement>('.flow-foldkit-edge-label'),
    ].map((label) => label.textContent)

    const canvas = document.querySelector<HTMLElement>('.flow-foldkit-canvas')

    const key = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })

    canvas?.dispatchEvent(key)

    return {
      d: edgePaths.map((path) => path.getAttribute('d')),
      paths: edgePaths.length,
      markers,
      labels,
      keyPrevented: key.defaultPrevented,
      hitTargets: document.querySelectorAll('.flow-foldkit-edge-hit-target')
        .length,
      customData:
        customEdge?.querySelector<SVGPathElement>('.custom-edge-view')?.dataset
          .rendererLabel,
      customPath: customPath?.getAttribute('d'),
      labelOwnership: [
        ...document.querySelectorAll<HTMLElement>('.flow-foldkit-edge-label'),
      ].map((label) => ({
        owner: label.dataset.labelOwner,
        parent: label.parentElement?.className,
      })),
      hitTarget: document
        .querySelector('.flow-foldkit-edge-hit-target')
        ?.getAttribute('role'),
    }
  })

  expect(initial.paths).toBe(8)
  expect(initial.d.every((path) => path !== null && path.startsWith('M'))).toBe(
    true
  )
  expect(initial.markers).toHaveLength(2)
  expect(new Set(initial.markers).size).toBe(2)
  expect(initial.labels).toContain('Custom label')
  expect(initial.hitTargets).toBe(10)
  expect(initial.customData).toBe('Custom label')
  expect(
    await page
      .locator('.custom-node-view')
      .first()
      .getAttribute('data-revision')
  ).toBe('1')
  expect(initial.labelOwnership).toContainEqual({
    owner: 'host-overlay',
    parent: 'flow-foldkit-edge-labels',
  })
  expect(initial.hitTarget).toBe('button')
  expect(initial.keyPrevented).toBe(false)

  const update = await page.evaluate(() => {
    const documentInput = {
      nodes: [
        {
          id: 'renderer-custom',
          label: 'Updated custom node',
          type: 'custom-node',
          position: { x: 90, y: 120 },
          data: { revision: 2 },
          handles: [
            { id: 'out', kind: 'source', side: 'right' },
            { id: 'dynamic', kind: 'source', side: 'top' },
          ],
        },
        {
          id: 'renderer-fallback',
          label: 'Fallback node',
          type: 'unknown-node',
          position: { x: 360, y: 70 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: [
        {
          id: 'renderer-custom-edge',
          source: 'renderer-custom',
          target: 'renderer-fallback',
          type: 'custom-edge',
          path: 'smoothstep',
          sourceHandle: 'dynamic',
          targetHandle: 'in',
          label: 'Updated custom label',
          markerEnd: 'arrowclosed',
        },
        ...(['straight', 'bezier', 'step', 'simplebezier'] as const).map(
          (path, index) => ({
            id: `renderer-${path}`,
            source: 'renderer-custom',
            target: 'renderer-fallback',
            path,
            zIndex: index,
          })
        ),
      ],
    } satisfies typeof FlowDocumentSchema.Encoded

    window.__rendererNode ??=
      document.querySelector(
        '.flow-foldkit-node[data-node-id="renderer-custom"]'
      ) ?? undefined
    window.__rendererEdge ??=
      document.querySelector(
        '.flow-foldkit-edge[data-edge-id="renderer-custom-edge"]'
      ) ?? undefined
    window.__flowFoldkitTest?.replaceRendererDocument(documentInput)

    return {
      sameNode:
        document.querySelector(
          '.flow-foldkit-node[data-node-id="renderer-custom"]'
        ) === window.__rendererNode,
      sameEdge:
        document.querySelector(
          '.flow-foldkit-edge[data-edge-id="renderer-custom-edge"]'
        ) === window.__rendererEdge,
    }
  })

  expect(update.sameNode).toBe(true)
  expect(update.sameEdge).toBe(true)
  await expect(page.locator('.custom-node-view').first()).toHaveAttribute(
    'data-revision',
    '2'
  )
  await expect(page.locator('.custom-node-view').last()).toHaveAttribute(
    'data-revision',
    '2'
  )

  const updatedPath = await page
    .locator('.custom-edge-view')
    .first()
    .getAttribute('d')

  expect(updatedPath).not.toBe(initial.customPath)
  await expect(
    page.locator('.flow-foldkit-node[data-node-id="renderer-custom"]')
  ).toContainText(['Updated custom node', 'Updated custom node'])
  await expect(
    page.locator('.flow-foldkit-handle[data-handle-id="dynamic"]')
  ).toHaveCount(2)

  const topHandleIsAboveNode = await page.evaluate(() => {
    const node = document.querySelector(
      '.flow-foldkit-node[data-node-id="renderer-custom"]'
    )

    const handle = node?.querySelector('.flow-foldkit-handle-top')

    return (
      node !== null &&
      handle !== null &&
      handle !== undefined &&
      handle.getBoundingClientRect().top < node.getBoundingClientRect().top
    )
  })

  expect(topHandleIsAboveNode).toBe(true)
  await expect(
    page.locator(
      '.custom-edge-view[data-renderer-label="Updated custom label"]'
    )
  ).toHaveCount(2)
  await expect(
    page.locator('.flow-foldkit-node[data-node-id="renderer-fallback"]')
  ).toHaveText(['Fallback node', 'Fallback node'])

  const hit = await page.evaluate(() => {
    const path = document.querySelector<SVGPathElement>(
      '.flow-foldkit-edge-hit-target'
    )

    const midpoint = path?.getPointAtLength((path.getTotalLength() || 1) * 0.25)
    const matrix = path?.getScreenCTM()

    if (
      path === null ||
      midpoint === undefined ||
      matrix === null ||
      matrix === undefined
    ) {
      return null
    }

    const screen = new DOMPoint(midpoint.x, midpoint.y).matrixTransform(matrix)
    const target = document.elementFromPoint(screen.x, screen.y)

    return {
      x: screen.x,
      y: screen.y,
      hitTarget:
        target?.classList.contains('flow-foldkit-edge-hit-target') === true,
      edgeId:
        target?.closest<SVGElement>('.flow-foldkit-edge')?.dataset.edgeId ??
        null,
    }
  })

  expect(hit?.hitTarget).toBe(true)

  if (hit === null || hit.edgeId === null) {
    throw new Error('SVG hit target is not clickable')
  }

  await page.mouse.click(hit.x, hit.y)
  await expect(
    page.locator(`.flow-foldkit-edge[data-edge-id="${hit.edgeId}"]`).first()
  ).toHaveAttribute('data-selected', 'true')
  await expect(
    page.locator(`.flow-foldkit-edge[data-edge-id="${hit.edgeId}"]`).last()
  ).toHaveAttribute('data-selected', 'false')

  const replacedTypes = {
    nodes: [
      {
        id: 'renderer-custom',
        label: 'Replacement fallback node',
        type: 'replacement-node',
        position: { x: 90, y: 120 },
        handles: [
          { id: 'out', kind: 'source', side: 'right' },
          { id: 'dynamic', kind: 'source', side: 'top' },
        ],
      },
      {
        id: 'renderer-fallback',
        label: 'Fallback node',
        type: 'unknown-node',
        position: { x: 360, y: 70 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
    edges: [
      {
        id: 'renderer-custom-edge',
        source: 'renderer-custom',
        target: 'renderer-fallback',
        type: 'replacement-edge',
        path: 'smoothstep',
        label: 'Replacement fallback label',
        markerEnd: 'arrowclosed',
      },
      ...(['straight', 'bezier', 'step', 'simplebezier'] as const).map(
        (path, index) => ({
          id: `renderer-${path}`,
          source: 'renderer-custom',
          target: 'renderer-fallback',
          path,
          zIndex: index,
        })
      ),
    ],
  } satisfies typeof FlowDocumentSchema.Encoded

  await page.evaluate(
    (documentInput) =>
      window.__flowFoldkitTest?.replaceRendererDocument(documentInput),
    replacedTypes
  )
  await expect(page.locator('.custom-node-view')).toHaveCount(0)
  await expect(page.locator('.custom-edge-view')).toHaveCount(0)
  await expect(
    page.locator('.flow-foldkit-node[data-node-id="renderer-custom"]')
  ).toHaveText(['Replacement fallback node', 'Replacement fallback node'])
  await expect(
    page.locator(
      '.flow-foldkit-edge[data-edge-id="renderer-custom-edge"] .flow-foldkit-edge-path'
    )
  ).toHaveCount(2)

  const readdedTypes = {
    ...replacedTypes,
    nodes: replacedTypes.nodes.map((node) =>
      node.id === 'renderer-custom' ? { ...node, type: 'custom-node' } : node
    ),
    edges: replacedTypes.edges.map((edge) =>
      edge.id === 'renderer-custom-edge'
        ? { ...edge, type: 'custom-edge' }
        : edge
    ),
  } satisfies typeof FlowDocumentSchema.Encoded

  await page.evaluate(
    (documentInput) =>
      window.__flowFoldkitTest?.replaceRendererDocument(documentInput),
    readdedTypes
  )
  await expect(page.locator('.custom-node-view')).toHaveCount(2)
  await expect(page.locator('.custom-edge-view')).toHaveCount(2)

  const disposedCanvasCount = await page.evaluate(() =>
    window.__flowFoldkitTest?.disposeRendererContract()
  )

  expect(disposedCanvasCount).toBe(0)
  expect(
    await page.evaluate(() => window.__flowFoldkitTest?.rendererContractState())
  ).toMatchObject({
    disposedPrograms: 2,
  })
})

test('Foldkit active gesture stays inside its host when two programs are mounted', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startRendererContract()
    window.__flowFoldkitTest?.clearRendererInteractionEvents()
  })

  const firstNode = page
    .locator('.flow-foldkit-node[data-node-id="renderer-custom"]')
    .nth(0)

  const firstLabel = firstNode.locator('.custom-node-label')

  const firstBefore = await firstNode.getAttribute('style')

  const secondNode = page
    .locator('.flow-foldkit-node[data-node-id="renderer-custom"]')
    .nth(1)

  const secondBefore = await secondNode.getAttribute('style')

  const secondViewportBefore = await page
    .locator('.flow-foldkit-viewport')
    .nth(1)
    .getAttribute('style')

  const renderCountsBefore = await page.evaluate(
    () => window.__flowFoldkitTest?.rendererCallCounts() ?? []
  )

  const labelBounds = await firstLabel.boundingBox()

  if (labelBounds === null) {
    throw new Error('Missing first host node label bounds')
  }

  await page.mouse.move(
    labelBounds.x + labelBounds.width / 2,
    labelBounds.y + labelBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    labelBounds.x + labelBounds.width / 2 + 60,
    labelBounds.y + labelBounds.height / 2 + 30
  )
  await page.mouse.up()

  await expect.poll(() => firstNode.getAttribute('style')).not.toBe(firstBefore)

  const firstEvents = await page.evaluate(
    () => window.__flowFoldkitTest?.rendererInteractionEvents(0) ?? []
  )

  const secondEvents = await page.evaluate(
    () => window.__flowFoldkitTest?.rendererInteractionEvents(1) ?? []
  )

  const firstChanges = await page.evaluate(
    () => window.__flowFoldkitTest?.rendererChanges(0) ?? []
  )

  const secondChanges = await page.evaluate(
    () => window.__flowFoldkitTest?.rendererChanges(1) ?? []
  )

  const secondAfter = await secondNode.getAttribute('style')

  const secondViewportAfter = await page
    .locator('.flow-foldkit-viewport')
    .nth(1)
    .getAttribute('style')

  const renderCountsAfter = await page.evaluate(
    () => window.__flowFoldkitTest?.rendererCallCounts() ?? []
  )

  expect(firstEvents.map(({ name }) => name)).toContain('onNodeDragStart')
  expect(firstEvents.map(({ name }) => name)).toContain('onNodeDragStop')
  expect(firstChanges.map(({ kind }) => kind)).toContain('node-position')
  expect(secondEvents).toEqual([])
  expect(secondChanges).toEqual([])
  expect(secondAfter).toBe(secondBefore)
  expect(secondViewportAfter).toBe(secondViewportBefore)
  expect(renderCountsAfter[0]).toBeGreaterThan(renderCountsBefore[0] ?? 0)
  expect(renderCountsAfter[1]).toBe(renderCountsBefore[1])

  await page.evaluate(() => window.__flowFoldkitTest?.disposeRendererContract())
})

test('Foldkit SVG edge hit targets activate with Enter and Space', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startRendererContract()
  })

  const edges = page.locator('.flow-foldkit-edge')
  const hitTargets = page.locator('.flow-foldkit-edge-hit-target')
  await expect(edges).toHaveCount(10)

  const firstEdgeId = await hitTargets
    .nth(0)
    .evaluate(
      (target) =>
        target.closest<SVGElement>('.flow-foldkit-edge')?.dataset.edgeId
    )

  await hitTargets.nth(0).press('Enter')
  await expect(
    page.locator(`.flow-foldkit-edge[data-edge-id="${firstEdgeId}"]`).first()
  ).toHaveAttribute('data-selected', 'true')

  const secondEdgeId = await hitTargets
    .nth(1)
    .evaluate(
      (target) =>
        target.closest<SVGElement>('.flow-foldkit-edge')?.dataset.edgeId
    )

  await hitTargets.nth(1).focus()
  await expect(hitTargets.nth(1)).toBeFocused()
  await page.keyboard.press('Space')
  await expect(
    page.locator(`.flow-foldkit-edge[data-edge-id="${secondEdgeId}"]`).first()
  ).toHaveAttribute('data-selected', 'true')
})

test('Foldkit runtime output matches the shared renderer contract fixture', async ({
  page,
}) => {
  await page.goto('/test.html')

  const internalHeights = await page.evaluate(async (documentInput) => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)

    return window.__flowFoldkitTest?.startRendererFixture(documentInput)
  }, rendererContractFixture.document)

  await expect(page.locator('.flow-foldkit-node')).toHaveCount(2)
  await expect(page.locator('.flow-foldkit-edge')).toHaveCount(8)

  const observed = await page.evaluate((): RendererContractObservedOutput => {
    const handles = [
      ...document.querySelectorAll<HTMLElement>('.flow-foldkit-handle'),
    ].map((handle) => {
      const node = handle.closest<HTMLElement>('.flow-foldkit-node')
      const bounds = handle.getBoundingClientRect()
      let side: 'left' | 'right' | 'top' | 'bottom'

      if (handle.classList.contains('flow-foldkit-handle-left')) {
        side = 'left'
      } else if (handle.classList.contains('flow-foldkit-handle-right')) {
        side = 'right'
      } else if (handle.classList.contains('flow-foldkit-handle-top')) {
        side = 'top'
      } else {
        side = 'bottom'
      }

      return {
        nodeId: node?.dataset.nodeId ?? '',
        handleId: handle.dataset.handleId ?? '',
        side,
        bounds: {
          left: bounds.left,
          top: bounds.top,
          right: bounds.right,
          bottom: bounds.bottom,
        },
      }
    })

    const edges = [
      ...document.querySelectorAll<SVGSVGElement>('.flow-foldkit-edge'),
    ].map((edge): RendererContractObservedOutput['edges'][number] => {
      const path = edge.querySelector<SVGPathElement>(
        '.flow-foldkit-edge-hit-target'
      )

      if (path === null) {
        throw new Error(
          `Foldkit edge ${edge.dataset.edgeId ?? ''} has no hit path`
        )
      }

      const label = document.querySelector<HTMLElement>(
        `.flow-foldkit-edge-label[data-edge-id="${edge.dataset.edgeId ?? ''}"]`
      )

      const endpoints = [0, path.getTotalLength()].map((distance) => {
        const point = path.getPointAtLength(distance)
        const matrix = path.getScreenCTM()

        if (matrix === null) {
          throw new Error('Foldkit edge path has no screen transform')
        }

        const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix)

        return { x: screen.x, y: screen.y }
      })

      return {
        id: edge.dataset.edgeId ?? '',
        type: edge.dataset.edgeType ?? 'default',
        path: edge.dataset.edgePathKind ?? 'straight',
        label: label?.textContent ?? null,
        markerStart: edge.dataset.markerStartKind || null,
        markerEnd: edge.dataset.markerEndKind || null,
        source: edge.dataset.sourceId ?? '',
        sourceHandle: edge.dataset.sourceHandle ?? '',
        target: edge.dataset.targetId ?? '',
        targetHandle: edge.dataset.targetHandle ?? '',
        start: endpoints[0] ?? { x: 0, y: 0 },
        end: endpoints[1] ?? { x: 0, y: 0 },
      }
    })

    return {
      nodeIds: [
        ...document.querySelectorAll<HTMLElement>('.flow-foldkit-node'),
      ].map((node) => node.dataset.nodeId ?? ''),
      handles,
      edges,
    }
  })

  const normalized = normalizeRendererContractOutput(observed)

  const renderedNodeHeights = await page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll<HTMLElement>('.flow-foldkit-node')].map(
        (node) => [
          node.dataset.nodeId ?? '',
          node.getBoundingClientRect().height,
        ]
      )
    )
  )

  expect({
    nodeIds: normalized.nodeIds,
    edges: normalized.edges.map(
      ({ id, type, path, label, markerStart, markerEnd }) => ({
        id,
        type,
        path,
        label,
        markerStart,
        markerEnd,
      })
    ),
    builtInPaths: normalized.builtInPaths,
  }).toStrictEqual(expectedRendererContractSemantics)
  expect(internalHeights).toStrictEqual(renderedNodeHeights)
  expect(normalized.allEdgesAttachToMeasuredHandles).toBe(true)

  const customMarkerPaint = await page
    .locator('.flow-foldkit-edge[data-edge-id="edge-custom"] marker polyline')
    .evaluateAll((paths) =>
      paths.map((path) => ({
        fill: path.getAttribute('fill'),
        stroke: path.getAttribute('stroke'),
      }))
    )

  expect(customMarkerPaint).toStrictEqual([
    { fill: 'none', stroke: '#d946ef' },
    { fill: '#d946ef', stroke: '#d946ef' },
  ])

  const defaultPath = await page
    .locator(
      '.flow-foldkit-edge[data-edge-id="edge-default-path"] .flow-foldkit-edge-hit-target'
    )
    .getAttribute('d')

  expect(defaultPath).toMatch(/^M[^L]*L[^L]*$/u)
})

test('Foldkit Runtime projects default edge fields below stored edge fields', async ({
  page,
}) => {
  const input = {
    ...rendererContractFixture.document,
    edges: rendererContractFixture.document.edges.map((edge) => {
      if (edge.id === 'edge-straight') {
        const edgeWithoutLabel = { ...edge }
        Reflect.deleteProperty(edgeWithoutLabel, 'label')

        return edgeWithoutLabel
      }

      if (edge.id === 'edge-bezier') {
        return { ...edge, stroke: '#123456' }
      }

      return edge
    }),
  }

  await page.goto('/test.html')
  await page.evaluate(
    async ({ documentInput }) => {
      const harnessPath = '/e2e/test-harness.ts'
      await import(harnessPath)
      await window.__flowFoldkitTest?.startRendererFixture(documentInput, {
        label: 'Default label',
        stroke: '#abcdef',
      })
    },
    { documentInput: input }
  )

  await expect(
    page.locator('.flow-foldkit-edge-label[data-edge-id="edge-straight"]')
  ).toHaveText('Default label')
  await expect(
    page.locator('.flow-foldkit-edge-label[data-edge-id="edge-bezier"]')
  ).toHaveText('Bezier')
  await expect(
    page.locator(
      '.flow-foldkit-edge[data-edge-id="edge-straight"] .flow-foldkit-edge-path'
    )
  ).toHaveAttribute('stroke', '#abcdef')
  await expect(
    page.locator(
      '.flow-foldkit-edge[data-edge-id="edge-bezier"] .flow-foldkit-edge-path'
    )
  ).toHaveAttribute('stroke', '#123456')
})

test('Custom Node recipe updates displayed status and accepted data in place', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startRendererContract()
  })

  const nodes = page.locator(
    '.flow-foldkit-node[data-node-id="renderer-custom"]'
  )

  const initialPosition = await nodes
    .first()
    .evaluate((element) => `${element.style.left} ${element.style.top}`)

  const firstCard = page.locator('.custom-node-view').first()
  const originalCard = await firstCard.evaluate((element) => element)

  await expect(firstCard.locator('.custom-node-label')).toHaveText(
    'Custom node'
  )
  await expect(firstCard.locator('.custom-node-status')).toHaveText('waiting')
  await expect(firstCard.locator('.custom-node-detail')).toHaveText(
    'Build is queued'
  )
  await firstCard.locator('.custom-node-status-control').click()

  await expect(firstCard.locator('.custom-node-status')).toHaveText('ready')
  await expect(firstCard.locator('.custom-node-status')).toHaveAttribute(
    'data-status',
    'ready'
  )
  await expect(firstCard.locator('.custom-node-detail')).toHaveText(
    'All checks passed'
  )
  await expect(page.locator('.custom-node-status').last()).toHaveText('waiting')
  // Selecting the node may raise its z-index; its position must not change.
  expect(
    await nodes
      .first()
      .evaluate((element) => `${element.style.left} ${element.style.top}`)
  ).toBe(initialPosition)
  expect(await firstCard.evaluate((element) => element)).toBe(originalCard)
})
