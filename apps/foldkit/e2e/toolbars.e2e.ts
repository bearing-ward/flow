import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'

interface ToolbarTestApi {
  readonly update: (
    viewport: { readonly x: number; readonly y: number; readonly zoom: number },
    patch?: {
      readonly selectedNodes?: readonly string[]
      readonly selectedEdges?: readonly string[]
      readonly hiddenNodes?: readonly string[]
      readonly hiddenEdges?: readonly string[]
      readonly removedNodes?: readonly string[]
    }
  ) => void
  readonly disposeAll: () => boolean
  readonly clicks: () => number
  readonly remountRejected: () => boolean
}

declare global {
  interface Window {
    __flowFoldkitToolbars: ToolbarTestApi | undefined
  }
}

const boxOf = async (locator: Locator) => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Expected a rendered element')
  }

  return box
}

test('Foldkit node and edge toolbars anchor fixed-size content and follow app-fed state', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('.flow-foldkit-canvas')).toHaveCount(1)

  await page.evaluate(async () => {
    const modulePath = '/e2e/toolbar-ui.ts'

    const {
      createFlowGraph,
      decodeFlowDocument,
      Effect,
      mountFlowEdgeToolbar,
      mountFlowNodeToolbar,
    } = await import(modulePath)

    const canvas = document.querySelector<HTMLElement>('.flow-foldkit-canvas')

    if (canvas === null) {
      throw new Error('Missing Foldkit canvas')
    }

    const content = (testId: string, label: string, width = 60) => {
      const element = canvas.ownerDocument.createElement('button')
      element.type = 'button'
      element.dataset.testid = testId
      element.textContent = label
      element.style.display = 'block'
      element.style.width = `${width}px`
      element.style.height = '24px'

      return element
    }

    const flexStyle = document.createElement('style')
    flexStyle.textContent = '.toolbar-test-flex { display: flex; }'
    document.head.append(flexStyle)

    const origin = document.createElement('div')
    origin.dataset.testid = 'toolbar-origin'
    document.body.append(origin)

    let clickCount = 0
    const nodeDefault = content('node-default', 'Node')
    nodeDefault.addEventListener('click', () => {
      clickCount += 1
    })
    origin.append(nodeDefault)

    const mounts = [
      mountFlowNodeToolbar(canvas, nodeDefault, { nodeId: 'n1' }),
      mountFlowNodeToolbar(canvas, content('node-forced', 'Forced'), {
        nodeId: 'n2',
        isVisible: true,
        position: 'right',
        align: 'end',
      }),
      // A caller display class must not reveal a hidden toolbar.
      mountFlowNodeToolbar(canvas, content('node-off', 'Off'), {
        nodeId: 'n1',
        isVisible: false,
        className: 'toolbar-test-flex',
      }),
      mountFlowNodeToolbar(canvas, content('node-missing', 'Missing'), {
        nodeId: 'absent',
        isVisible: true,
      }),
      mountFlowEdgeToolbar(canvas, content('edge-default', 'Edge'), {
        edgeId: 'e1',
        x: 300,
        y: 180,
      }),
      mountFlowEdgeToolbar(canvas, content('edge-missing', 'Missing'), {
        edgeId: 'absent',
        x: 10,
        y: 10,
        isVisible: true,
      }),
      mountFlowEdgeToolbar(canvas, content('edge-forced', 'Edge forced', 80), {
        edgeId: 'e2',
        x: 200,
        y: 260,
        isVisible: true,
        alignX: 'right',
        alignY: 'bottom',
      }),
    ]

    const base = {
      nodes: [
        {
          id: 'n1',
          label: 'One',
          position: { x: 100, y: 100 },
          size: { width: 120, height: 60 },
        },
        {
          id: 'n2',
          label: 'Two',
          zIndex: 3,
          position: { x: 400, y: 200 },
          size: { width: 120, height: 60 },
        },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', zIndex: 2 },
        { id: 'e2', source: 'n2', target: 'n1' },
      ],
    }

    window.__flowFoldkitToolbars = {
      update: (viewport, patch = {}) => {
        const selectedNodes = patch.selectedNodes ?? ['n1']
        const selectedEdges = patch.selectedEdges ?? ['e1']

        const document = Effect.runSync(
          decodeFlowDocument({
            nodes: base.nodes
              .filter(({ id }) => !(patch.removedNodes ?? []).includes(id))
              .map((node) => ({
                ...node,
                selected: selectedNodes.includes(node.id),
                hidden: (patch.hiddenNodes ?? []).includes(node.id),
              })),
            edges: base.edges
              .filter(
                ({ source, target }) =>
                  !(patch.removedNodes ?? []).some(
                    (id) => id === source || id === target
                  )
              )
              .map((edge) => ({
                ...edge,
                selected: selectedEdges.includes(edge.id),
                hidden: (patch.hiddenEdges ?? []).includes(edge.id),
              })),
          })
        )

        const graph = createFlowGraph(document)

        for (const mount of mounts) {
          mount.update(graph, viewport)
        }
      },
      disposeAll: () => {
        for (const mount of mounts) {
          mount.dispose()
        }

        return nodeDefault.parentElement === origin
      },
      clicks: () => clickCount,
      remountRejected: () => {
        try {
          mountFlowNodeToolbar(canvas, nodeDefault, { nodeId: 'n1' })

          return false
        } catch {
          return true
        }
      },
    }
  })

  const update = (
    viewport: { x: number; y: number; zoom: number },
    patch?: Parameters<ToolbarTestApi['update']>[1]
  ) =>
    page.evaluate(
      ([nextViewport, nextPatch]) =>
        window.__flowFoldkitToolbars?.update(nextViewport, nextPatch),
      [viewport, patch] as const
    )

  const layer = page.locator('.flow-foldkit-toolbar-layer')
  const nodeDefault = page.locator('[data-node-toolbar="n1"]').first()
  const nodeForced = page.locator('[data-node-toolbar="n2"]')
  const edgeDefault = page.locator('[data-edge-toolbar="e1"]')
  const edgeForced = page.locator('[data-edge-toolbar="e2"]')

  await update({ x: 0, y: 0, zoom: 1 })
  await expect(layer).toHaveCount(1)
  expect(
    await layer.evaluate((element) =>
      element.parentElement?.classList.contains('flow-foldkit-canvas')
    )
  ).toBe(true)
  await expect(page.getByTestId('node-default')).toBeVisible()
  await expect(page.getByTestId('node-forced')).toBeVisible()
  await expect(page.getByTestId('node-off')).toBeHidden()
  await expect(page.getByTestId('node-missing')).toBeHidden()
  await expect(page.getByTestId('edge-missing')).toBeHidden()
  await expect(page.getByTestId('edge-default')).toBeVisible()
  await expect(page.getByTestId('edge-forced')).toBeVisible()

  await expect(nodeDefault).toHaveClass(
    /flow-foldkit-nopan.*flow-foldkit-nodrag.*flow-foldkit-nowheel/u
  )

  await expect(nodeDefault).toHaveAttribute('data-flow-no-drag', 'true')
  await expect(nodeDefault).toHaveAttribute('data-flow-no-wheel', 'true')
  await expect(edgeDefault).toHaveCSS('z-index', '3')
  await expect(nodeDefault).toHaveCSS('z-index', '1')
  await expect(nodeForced).toHaveCSS('z-index', '4')
  expect(
    await page.evaluate(() => window.__flowFoldkitToolbars?.remountRejected())
  ).toBe(true)

  const measure = async (zoom: number, x: number, y: number) => {
    const origin = await boxOf(layer)
    const node = await boxOf(nodeDefault)
    const forced = await boxOf(nodeForced)
    const edge = await boxOf(edgeDefault)
    const edgeCorner = await boxOf(edgeForced)

    // Default node toolbar: bottom-center sits 10px above the node's top center.
    expect(node.x + node.width / 2 - origin.x).toBeCloseTo(x + 160 * zoom, 0)
    expect(node.y + node.height - origin.y).toBeCloseTo(y + 100 * zoom - 10, 0)
    // Right/end node toolbar: left edge 10px right of the node, bottom at its bottom.
    expect(forced.x - origin.x).toBeCloseTo(x + 520 * zoom + 10, 0)
    expect(forced.y + forced.height - origin.y).toBeCloseTo(y + 260 * zoom, 0)
    // Centered edge toolbar: center on the flow point.
    expect(edge.x + edge.width / 2 - origin.x).toBeCloseTo(x + 300 * zoom, 0)
    expect(edge.y + edge.height / 2 - origin.y).toBeCloseTo(y + 180 * zoom, 0)
    // Right/bottom edge toolbar: bottom-right corner on the flow point.
    expect(edgeCorner.x + edgeCorner.width - origin.x).toBeCloseTo(
      x + 200 * zoom,
      0
    )
    expect(edgeCorner.y + edgeCorner.height - origin.y).toBeCloseTo(
      y + 260 * zoom,
      0
    )

    return { node, edge }
  }

  const initial = await measure(1, 0, 0)
  await update({ x: -100, y: 20, zoom: 1.5 })
  const zoomed = await measure(1.5, -100, 20)
  expect(zoomed.node.width).toBeCloseTo(initial.node.width, 0)
  expect(zoomed.edge.height).toBeCloseTo(initial.edge.height, 0)

  await page.getByTestId('node-default').click()
  expect(
    await page.evaluate(() => window.__flowFoldkitToolbars?.clicks())
  ).toBe(1)

  await update({ x: 0, y: 0, zoom: 1 }, { selectedNodes: ['n1', 'n2'] })
  await expect(page.getByTestId('node-default')).toBeHidden()
  await update({ x: 0, y: 0, zoom: 1 }, { selectedNodes: [] })
  await expect(page.getByTestId('node-default')).toBeHidden()
  await update({ x: 0, y: 0, zoom: 1 }, { hiddenNodes: ['n2'] })
  await expect(page.getByTestId('node-default')).toBeVisible()
  await expect(page.getByTestId('node-forced')).toBeHidden()

  await update({ x: 0, y: 0, zoom: 1 }, { selectedEdges: [] })
  await expect(page.getByTestId('edge-default')).toBeHidden()
  await expect(page.getByTestId('edge-forced')).toBeVisible()
  await update({ x: 0, y: 0, zoom: 1 }, { hiddenEdges: ['e2'] })
  await expect(page.getByTestId('edge-forced')).toBeHidden()
  await update({ x: 0, y: 0, zoom: 1 }, { removedNodes: ['n1'] })
  await expect(page.getByTestId('node-default')).toBeHidden()

  expect(
    await page.evaluate(() => window.__flowFoldkitToolbars?.disposeAll())
  ).toBe(true)
  await expect(page.locator('.flow-foldkit-node-toolbar')).toHaveCount(0)
  await expect(page.locator('.flow-foldkit-edge-toolbar')).toHaveCount(0)
  await expect(layer).toHaveCount(0)
})
