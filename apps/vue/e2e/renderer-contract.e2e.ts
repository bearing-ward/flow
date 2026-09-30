import { edgeLabelPosition } from '@flow/core'
import { expect, test } from '@playwright/test'

import {
  expectedRendererContractSemantics,
  normalizeRendererContractOutput,
  rendererContractFixture,
} from '../../shared-e2e/renderer-contract.ts'
import type {
  RendererContractObservedEdge,
  RendererContractObservedHandle,
  RendererContractObservedOutput,
} from '../../shared-e2e/renderer-contract.ts'

test('Vue FlowCanvas matches shared renderer fixture semantics and measured geometry', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.addScriptTag({
    type: 'module',
    content: `import { mountSharedRendererContractFixture } from '/src/renderer-contract.ts'; mountSharedRendererContractFixture(${JSON.stringify(rendererContractFixture.document)})`,
  })

  const observed = await page
    .locator('.flow-vue-canvas')
    .evaluate((canvas, fixtureEdges): RendererContractObservedOutput => {
      const nodeIds = [
        ...canvas.querySelectorAll<HTMLElement>('.flow-vue-node[data-node-id]'),
      ].map((node) => node.dataset.nodeId ?? '')

      const handles: RendererContractObservedHandle[] = [
        ...canvas.querySelectorAll<HTMLElement>('[data-handle-id]'),
      ].map((element) => {
        const node = element.closest<HTMLElement>('[data-node-id]')
        const sides = ['left', 'right', 'top', 'bottom'] as const

        const side = sides.find((candidate) =>
          element.classList.contains(`flow-vue-handle-${candidate}`)
        )

        if (node === null || side === undefined) {
          throw new Error('Fixture handle is missing its node or side')
        }

        const bounds = element.getBoundingClientRect()

        return {
          nodeId: node.dataset.nodeId ?? '',
          handleId: element.dataset.handleId ?? '',
          side,
          bounds: {
            left: bounds.left,
            top: bounds.top,
            right: bounds.right,
            bottom: bounds.bottom,
          },
        }
      })

      const edges: RendererContractObservedEdge[] = [
        ...canvas.querySelectorAll<SVGGElement>('[data-testid="flow-edge"]'),
      ].map((group) => {
        const id = group.dataset.edgeId

        const fixtureEdge = fixtureEdges.find((edge) => edge.id === id)

        const path = group.querySelector<SVGPathElement>(
          '[data-testid="flow-edge-path"], [data-testid="registered-edge-path"]'
        )

        if (id === undefined || fixtureEdge === undefined || path === null) {
          throw new Error('Fixture edge is missing its identity or path')
        }

        const transform = path.getScreenCTM()

        if (transform === null) {
          throw new Error(`Fixture edge ${id} has no screen transform`)
        }

        const start = path.getPointAtLength(0).matrixTransform(transform)

        const end = path
          .getPointAtLength(path.getTotalLength())
          .matrixTransform(transform)

        const labels = canvas.querySelectorAll<HTMLElement>(
          '[data-flow-edge-label]'
        )

        const label = [...labels].find(
          (element) => element.dataset.flowEdgeLabel === id
        )

        return {
          id,
          type: fixtureEdge.type ?? 'default',
          path: fixtureEdge.path ?? 'straight',
          label: label?.textContent ?? null,
          markerStart: ((reference: string | null) => {
            const match = /marker-(?<kind>arrowclosed|arrow)-/u.exec(
              reference ?? ''
            )

            return match?.groups?.kind ?? null
          })(path.getAttribute('marker-start')),
          markerEnd: ((reference: string | null) => {
            const match = /marker-(?<kind>arrowclosed|arrow)-/u.exec(
              reference ?? ''
            )

            return match?.groups?.kind ?? null
          })(path.getAttribute('marker-end')),
          source: fixtureEdge.source,
          sourceHandle: fixtureEdge.sourceHandle ?? 'default',
          target: fixtureEdge.target,
          targetHandle: fixtureEdge.targetHandle ?? 'default',
          start: { x: start.x, y: start.y },
          end: { x: end.x, y: end.y },
        }
      })

      return { nodeIds, handles, edges }
    }, rendererContractFixture.document.edges)

  const normalized = normalizeRendererContractOutput(observed)

  const semanticEdges = normalized.edges.map(
    ({ id, type, path, label, markerStart, markerEnd }) => ({
      id,
      type,
      path,
      label,
      markerStart,
      markerEnd,
    })
  )

  expect({
    nodeIds: normalized.nodeIds,
    edges: semanticEdges,
    builtInPaths: normalized.builtInPaths,
  }).toStrictEqual(expectedRendererContractSemantics)
  expect(normalized.allEdgesAttachToMeasuredHandles).toBe(true)

  const defaultPath = page.locator(
    '[data-edge-id="edge-default-path"] [data-testid="flow-edge-path"]'
  )

  await expect(defaultPath).toHaveAttribute('d', /^M.+L.+$/u)
  await expect(defaultPath).not.toHaveAttribute('d', /[CQSAHV]/u)
})

test('Vue FlowCanvas projects default edge fields below stored edge fields', async ({
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
  await page.addScriptTag({
    type: 'module',
    content: `import { mountSharedRendererContractFixture } from '/src/renderer-contract.ts'; mountSharedRendererContractFixture(${JSON.stringify(input)}, { label: 'Default label', stroke: '#abcdef' })`,
  })

  await expect(
    page.locator('[data-flow-edge-label="edge-straight"]')
  ).toHaveText('Default label')
  await expect(page.locator('[data-flow-edge-label="edge-bezier"]')).toHaveText(
    'Bezier'
  )
  await expect(
    page.locator(
      '[data-edge-id="edge-straight"] [data-testid="flow-edge-path"]'
    )
  ).toHaveAttribute('stroke', '#abcdef')
  await expect(
    page.locator('[data-edge-id="edge-bezier"] [data-testid="flow-edge-path"]')
  ).toHaveAttribute('stroke', '#123456')

  await page.evaluate(() =>
    window.__flowVueRendererDefaults?.({
      label: 'Updated default',
      stroke: '#fedcba',
    })
  )

  await expect(
    page.locator('[data-flow-edge-label="edge-straight"]')
  ).toHaveText('Updated default')
  await expect(
    page.locator(
      '[data-edge-id="edge-straight"] [data-testid="flow-edge-path"]'
    )
  ).toHaveAttribute('stroke', '#fedcba')
  await expect(page.locator('[data-flow-edge-label="edge-bezier"]')).toHaveText(
    'Bezier'
  )
  await expect(
    page.locator('[data-edge-id="edge-bezier"] [data-testid="flow-edge-path"]')
  ).toHaveAttribute('stroke', '#123456')
})

test('Vue edge labels follow path geometry, custom anchors, and visibility', async ({
  page,
}) => {
  const document = {
    ...rendererContractFixture.document,
    nodes: [
      ...rendererContractFixture.document.nodes,
      {
        id: 'hidden-target',
        label: 'Hidden target',
        type: 'contract-node',
        position: { x: 760, y: 100 },
        size: { width: 140, height: 76 },
        hidden: true,
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
    edges: [
      ...rendererContractFixture.document.edges.map((edge) => {
        if (edge.id === 'edge-custom') {
          return { ...edge, data: { labelAnchor: { x: 260, y: 240 } } }
        }

        if (edge.id === 'edge-step') {
          return { ...edge, hidden: true }
        }

        return edge
      }),
      {
        id: 'edge-hidden-endpoint',
        source: 'source',
        target: 'hidden-target',
        sourceHandle: 'out',
        targetHandle: 'in',
        label: 'Hidden endpoint label',
      },
    ],
  }

  await page.goto('/test.html')
  await page.addScriptTag({
    type: 'module',
    content: `import { mountSharedRendererContractFixture } from '/src/renderer-contract.ts'; mountSharedRendererContractFixture(${JSON.stringify(document)})`,
  })

  const canvas = page.locator('.flow-vue-canvas')

  const customAnchorLabel = canvas.locator(
    '[data-flow-edge-label="edge-custom"]'
  )

  await expect(customAnchorLabel).toHaveCSS('left', '260px')
  await expect(customAnchorLabel).toHaveCSS('top', '240px')
  await expect(
    canvas.locator('[data-flow-edge-label="edge-step"]')
  ).toHaveCount(0)
  await expect(
    canvas.locator('[data-flow-edge-label="edge-hidden-endpoint"]')
  ).toHaveCount(0)

  const bezierGeometry = await canvas
    .locator('[data-edge-id="edge-bezier"] [data-testid="flow-edge-path"]')
    .evaluate((path) => {
      if (!(path instanceof SVGPathElement)) {
        throw new Error('Expected a Bezier SVG path')
      }

      const start = path.getPointAtLength(0)
      const end = path.getPointAtLength(path.getTotalLength())

      const label = globalThis.document.querySelector<HTMLElement>(
        '[data-flow-edge-label="edge-bezier"]'
      )

      if (label === null) {
        throw new Error('Missing Bezier label')
      }

      return {
        source: { x: start.x, y: start.y },
        target: { x: end.x, y: end.y },
        label: {
          x: Number(label.style.left.replace('px', '')),
          y: Number(label.style.top.replace('px', '')),
        },
      }
    })

  const expectedBezierLabel = edgeLabelPosition(
    bezierGeometry.source,
    bezierGeometry.target,
    'bezier',
    'right',
    'left'
  )

  expect(bezierGeometry.label.x).toBeCloseTo(expectedBezierLabel.x)
  expect(bezierGeometry.label.y).toBeCloseTo(expectedBezierLabel.y)
})

test('Vue renderer registries preserve renderer and geometry contracts', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.addScriptTag({
    type: 'module',
    content:
      "import { mountRendererContract } from '/src/renderer-contract.ts'; mountRendererContract()",
  })

  const firstRegistry = page.locator('.flow-vue-canvas').nth(0)
  const legacyCanvas = page.locator('.flow-vue-canvas').nth(2)
  await expect(
    firstRegistry.locator('[data-testid="registry-node-v1"]')
  ).toBeVisible()
  await expect(
    firstRegistry.locator('[data-testid="legacy-node"]')
  ).toHaveCount(2)
  await expect(
    legacyCanvas.locator('[data-testid="legacy-edge-path"]')
  ).toHaveCount(6)

  const builtInPaths = page.locator('[data-testid="flow-edge-path"]')
  await expect(builtInPaths).toHaveCount(10)
  await expect(page.getByTestId('registered-edge-path')).toHaveCount(2)
  await expect(page.getByTestId('flow-edge-label')).toHaveCount(6)
  await expect(
    page.getByTestId('registered-edge-path').first()
  ).toHaveAttribute('d', /^M\d/u)

  const pathData = await builtInPaths.evaluateAll((paths) =>
    paths.map((path) => path.getAttribute('d'))
  )

  expect(pathData.every((path) => path !== null && path.length > 0)).toBe(true)
  expect(new Set(pathData).size).toBeGreaterThan(1)

  const markerState = await page
    .locator('.flow-vue-edges')
    .evaluateAll((svgs) =>
      svgs.map((svg) => ({
        markerId: svg.querySelector('marker')?.id,
        markerReference: svg
          .querySelector('[data-testid="flow-edge-path"]')
          ?.getAttribute('marker-end'),
      }))
    )

  expect(markerState).toHaveLength(3)
  expect(new Set(markerState.map(({ markerId }) => markerId)).size).toBe(3)
  expect(markerState[0]?.markerReference).toContain(markerState[0]?.markerId)
  await expect(
    page.locator('.flow-vue-edge-labels [data-testid="flow-edge-label"]')
  ).toHaveCount(6)
  await expect(page.locator('svg [data-testid="flow-edge-label"]')).toHaveCount(
    0
  )

  const hitTarget = firstRegistry.locator(
    '[data-testid="flow-edge"][data-edge-id="built-in-straight"] [data-testid="flow-edge-hit-target"]'
  )

  await expect(hitTarget).toHaveAttribute('role', 'button')

  const viewportTransform = await firstRegistry
    .locator('.flow-vue-viewport')
    .getAttribute('style')

  const hitPoint = await hitTarget.evaluate((path) => {
    if (!(path instanceof SVGPathElement)) {
      throw new Error('Expected an SVG path hit target')
    }

    const svg = path.ownerSVGElement
    const transform = svg?.getScreenCTM()

    if (svg === null || transform === null || transform === undefined) {
      throw new Error('Missing SVG hit-target transform')
    }

    const point = new DOMPoint(245, 122).matrixTransform(transform)

    return { x: point.x, y: point.y }
  })

  await page.mouse.click(hitPoint.x, hitPoint.y)
  await expect(page.getByTestId('edge-click-count')).toHaveText('1')
  await expect(firstRegistry.locator('.flow-vue-viewport')).toHaveAttribute(
    'style',
    viewportTransform ?? ''
  )
  await hitTarget.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('edge-click-count')).toHaveText('2')

  const cardVisual = firstRegistry.locator('[data-testid="registry-node-v1"]')
  const originalInstance = await cardVisual.getAttribute('data-instance-id')
  await page.getByTestId('update-node-data').click()
  await expect(cardVisual).toHaveAttribute('data-revision', '1')
  await expect(cardVisual).toHaveAttribute(
    'data-instance-id',
    originalInstance ?? ''
  )

  const node = firstRegistry.locator('[data-node-id="card"]')

  const initialPosition = await node.evaluate((element) => ({
    // SAFETY: the node locator targets a rendered HTML div owned by FlowCanvas.
    left: (element as HTMLElement).style.left,
    // SAFETY: the node locator targets a rendered HTML div owned by FlowCanvas.
    top: (element as HTMLElement).style.top,
  }))

  const button = firstRegistry.getByTestId('node-control')
  const buttonBounds = await button.boundingBox()

  if (buttonBounds === null) {
    throw new Error('Missing native node button')
  }

  await page.mouse.move(
    buttonBounds.x + buttonBounds.width / 2,
    buttonBounds.y + buttonBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    buttonBounds.x + buttonBounds.width / 2 + 24,
    buttonBounds.y + buttonBounds.height / 2 + 18
  )
  await page.mouse.up()
  expect(
    await node.evaluate((element) => ({
      // SAFETY: the node locator targets a rendered HTML div owned by FlowCanvas.
      left: (element as HTMLElement).style.left,
      // SAFETY: the node locator targets a rendered HTML div owned by FlowCanvas.
      top: (element as HTMLElement).style.top,
      // SAFETY: the node locator targets a rendered HTML div owned by FlowCanvas.
      transform: (element as HTMLElement).style.transform,
    }))
  ).toEqual({ ...initialPosition, transform: '' })
  await button.focus()
  await page.keyboard.press('Enter')
  await expect(button).toHaveText('Activated')

  const straightEdge = firstRegistry.locator(
    '[data-edge-id="built-in-straight"] [data-testid="flow-edge-path"]'
  )

  const registeredEdge = firstRegistry.getByTestId('registered-edge-path')
  const beforeHandlePath = await straightEdge.getAttribute('d')
  const beforeRegisteredPath = await registeredEdge.getAttribute('d')
  await page.getByTestId('change-handles').click()
  const sourceHandle = node.locator('[data-handle-id="out"]')
  await expect(sourceHandle).toHaveClass(/flow-vue-handle-bottom/u)
  await expect(node.locator('[data-handle-id="aux"]')).toBeVisible()
  await expect
    .poll(() => straightEdge.getAttribute('d'))
    .not.toBe(beforeHandlePath)
  await expect
    .poll(() => registeredEdge.getAttribute('d'))
    .not.toBe(beforeRegisteredPath)

  const readEndpoint = () =>
    page.evaluate(() => {
      const canvas = document.querySelector<HTMLElement>('.flow-vue-canvas')
      const viewport = document.querySelector<HTMLElement>('.flow-vue-viewport')

      const handle = document.querySelector<HTMLElement>(
        '.flow-vue-canvas [data-node-id="card"] [data-handle-id="out"]'
      )

      const path = document.querySelector<SVGPathElement>(
        '.flow-vue-canvas [data-edge-id="built-in-straight"] [data-testid="flow-edge-path"]'
      )

      if (
        canvas === null ||
        viewport === null ||
        handle === null ||
        path === null
      ) {
        throw new Error('Missing rendered node, handle, or edge path')
      }

      const transform = new DOMMatrixReadOnly(
        getComputedStyle(viewport).transform
      )

      const handleBounds = handle.getBoundingClientRect()

      const pathStart = /^M\s*(?<x>[\d.-]+)[,\s]+(?<y>[\d.-]+)/u.exec(
        path.getAttribute('d') ?? ''
      )

      if (pathStart === null) {
        throw new Error('Edge path has no move-to point')
      }

      return {
        handleX:
          (handleBounds.left +
            handleBounds.width / 2 -
            canvas.getBoundingClientRect().left -
            transform.e) /
          transform.a,
        handleWidth: handleBounds.width / transform.a,
        handleHeight: handleBounds.height / transform.a,
        handleY:
          (handleBounds.top +
            handleBounds.height / 2 -
            canvas.getBoundingClientRect().top -
            transform.f) /
          transform.a,
        pathX: Number(pathStart.groups?.x),
        pathY: Number(pathStart.groups?.y),
      }
    })

  let endpoint = await readEndpoint()
  await expect
    .poll(async () => {
      endpoint = await readEndpoint()

      return (
        Math.abs(endpoint.pathX - endpoint.handleX) < 2 &&
        Math.abs(
          endpoint.pathY - (endpoint.handleY + endpoint.handleHeight / 2)
        ) < 1.5
      )
    })
    .toBe(true)

  const v1BeforeReplace = await firstRegistry
    .getByTestId('registry-node-v1')
    .getAttribute('data-instance-id')

  await page.getByTestId('replace-node-renderer').click()
  const v2 = firstRegistry.getByTestId('registry-node-v2')
  await expect(v2).toBeVisible()
  await expect(firstRegistry.getByTestId('registry-node-v1')).toHaveCount(0)
  await expect(v2).not.toHaveAttribute(
    'data-instance-id',
    v1BeforeReplace ?? ''
  )
  const v2Instance = await v2.getAttribute('data-instance-id')

  const removedVisual = await v2.elementHandle()

  if (removedVisual === null) {
    throw new Error('Missing V2 node renderer')
  }

  await page.getByTestId('remove-card').click()
  await expect(firstRegistry.locator('[data-node-id="card"]')).toHaveCount(0)
  await expect
    .poll(() => removedVisual.evaluate((element) => element.isConnected))
    .toBe(false)
  await page.getByTestId('readd-card').click()
  const readded = firstRegistry.getByTestId('registry-node-v2')
  await expect(readded).toBeVisible()
  await expect(readded).not.toHaveAttribute(
    'data-instance-id',
    v2Instance ?? ''
  )
  await expect(
    firstRegistry.locator(
      '[data-testid="flow-edge"][data-edge-id="built-in-straight"]'
    )
  ).toHaveCount(1)
})

test('Vue playground exposes custom nodes, multiple handles, and every edge path', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Renderer contracts' }).click()

  const canvas = page.locator('.flow-vue-canvas')
  await expect(canvas.locator('.flow-vue-renderer-node')).toContainText(
    'Custom renderer'
  )
  await expect(
    canvas.locator('[data-node-id="renderer-card"] [data-handle-id]')
  ).toHaveCount(4)
  await expect(canvas.locator('[data-testid="flow-edge-path"]')).toHaveCount(6)
  await expect(canvas.locator('.flow-vue-renderer-custom-edge')).toHaveCount(1)
  await expect(
    canvas.locator('.flow-vue-edge-labels [data-testid="flow-edge-label"]')
  ).toHaveCount(6)
  await expect(
    canvas.locator('[data-testid="flow-edge-hit-target"]')
  ).toHaveCount(6)
})
