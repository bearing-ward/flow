import { fileURLToPath } from 'node:url'

import type * as CoreModule from '@flow/core'
import { expect as expectPage, test as playwrightTest } from '@playwright/test'
import type { Page } from '@playwright/test'
import type * as EffectModule from 'effect'

import type * as HostModule from '../src/public.ts'
import type * as TelemetryModule from '../src/telemetry.ts'
import {
  assertTwoNodeControllerConformance,
  mountControllerScenario,
  updateScenario,
} from './controller-conformance.ts'

const coreModulePath = `/@fs${fileURLToPath(
  new URL('../../../packages/core/src/public.ts', import.meta.url)
)}`

const mountConnectionScenario = async (
  page: Page,
  mode: 'controlled' | 'uncontrolled' = 'uncontrolled',
  initialEdge: boolean | 'bezier' = false
): Promise<void> => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(
    async ({ documentMode, withInitialEdge }) => {
      const modulePath = '/src/public.ts'
      const { mountFlow } = await import(modulePath)
      const root = globalThis.document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing connection host')
      }

      const controller = mountFlow(
        root,
        {
          edges: withInitialEdge
            ? [
                {
                  id: 'edge-1',
                  source: 'first',
                  target: 'second',
                  path: withInitialEdge === 'bezier' ? 'bezier' : undefined,
                },
              ]
            : [],
          nodes: [
            {
              id: 'first',
              label: 'First',
              position: { x: 100, y: 120 },
              handles: [
                { id: 'out', kind: 'source', side: 'right' },
                { id: 'in', kind: 'target', side: 'left' },
              ],
            },
            {
              id: 'second',
              label: 'Second',
              position: { x: 350, y: 120 },
              handles: [
                { id: 'out', kind: 'source', side: 'right' },
                { id: 'in', kind: 'target', side: 'left' },
              ],
            },
          ],
        },
        {
          documentMode,
          viewport: {
            initial: { x: 0, y: 0, zoom: 1 },
            limits: { maxZoom: 2, minZoom: 0.5 },
            mode: 'uncontrolled',
          },
        }
      )

      globalThis.flowChanges = []
      controller.subscribe((change: CoreModule.FlowChange) =>
        globalThis.flowChanges?.push(change)
      )
      globalThis.flowController = controller
    },
    { documentMode: mode, withInitialEdge: initialEdge }
  )
}

const dragBetweenHandles = async (
  page: Page,
  fromNode: string,
  fromHandle: string,
  toNode: string,
  toHandle: string
): Promise<void> => {
  const source = page.locator(
    `[data-node-id="${fromNode}"] [data-handle-id="${fromHandle}"]`
  )

  const target = page.locator(
    `[data-node-id="${toNode}"] [data-handle-id="${toHandle}"]`
  )

  const sourceBox = await source.boundingBox()

  const targetBox = await target.boundingBox()

  if (sourceBox === null || targetBox === null) {
    throw new Error('Connection handle has no bounds')
  }

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2
  )
  await page.mouse.down()
  // Cross the default one-pixel connection drag threshold.
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2 + 2,
    sourceBox.y + sourceBox.height / 2
  )
  await expectPage(page.getByTestId('flow-connection-preview')).toBeVisible()
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2
  )
  await page.mouse.up()
  await expectPage(page.getByTestId('flow-connection-preview')).toHaveCount(0)
}

const dragEdgeEndpoint = async (
  page: Page,
  endpoint: 'source' | 'target',
  nodeId: string,
  handleId: string
): Promise<void> => {
  const anchor = page.locator(
    `[data-testid="flow-edge-reconnect-anchor"][data-endpoint="${endpoint}"]`
  )

  const handle = page.locator(
    `article[data-node-id="${nodeId}"] [data-handle-id="${handleId}"]`
  )

  const anchorBox = await anchor.boundingBox()
  const handleBox = await handle.boundingBox()

  if (anchorBox === null || handleBox === null) {
    throw new Error('Reconnection endpoint has no bounds')
  }

  await page.mouse.move(
    anchorBox.x + anchorBox.width / 2,
    anchorBox.y + anchorBox.height / 2
  )
  await page.mouse.down()
  // Cross the default one-pixel connection drag threshold.
  await page.mouse.move(
    anchorBox.x + anchorBox.width / 2 + 2,
    anchorBox.y + anchorBox.height / 2
  )
  await expectPage(page.getByTestId('flow-connection-preview')).toBeVisible()
  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2
  )
  await page.mouse.up()
  await expectPage(page.getByTestId('flow-connection-preview')).toHaveCount(0)
}

const updateConnectionDocument = async (
  page: Page,
  options: {
    readonly label?: string
    readonly path?: 'straight' | 'bezier' | 'step' | 'smoothstep'
    readonly first?: { readonly x: number; readonly y: number }
    readonly second?: { readonly x: number; readonly y: number }
    readonly targetSide?: 'left' | 'top'
    readonly markerStart?: 'arrow' | 'arrowclosed'
    readonly markerEnd?: 'arrow' | 'arrowclosed'
    readonly stroke?: string
    readonly strokeWidth?: number
    readonly selected?: boolean
    readonly selectable?: boolean
    readonly focusable?: boolean
    readonly reconnectable?: boolean | 'source' | 'target'
    readonly deletable?: boolean
    readonly interactionWidth?: number
    readonly ariaLabel?: string
    readonly removed?: boolean
    readonly third?: boolean
  }
): Promise<void> => {
  await page.evaluate(
    ({
      label,
      path,
      first,
      second,
      targetSide,
      markerStart,
      markerEnd,
      stroke,
      strokeWidth,
      selected,
      selectable,
      focusable,
      reconnectable,
      deletable,
      interactionWidth,
      ariaLabel,
      removed,
      third,
    }) => {
      globalThis.flowController?.update({
        edges: removed
          ? []
          : [
              {
                id: 'edge-1',
                source: 'first',
                target: 'second',
                label,
                path,
                markerStart,
                markerEnd,
                stroke,
                strokeWidth,
                selected,
                selectable,
                focusable,
                reconnectable,
                deletable,
                interactionWidth,
                ariaLabel,
              },
            ],
        nodes: [
          {
            id: 'first',
            label: 'First',
            position: first ?? { x: 100, y: 120 },
            handles: [
              { id: 'out', kind: 'source', side: 'right' },
              { id: 'in', kind: 'target', side: 'left' },
            ],
          },
          {
            id: 'second',
            label: 'Second',
            position: second ?? { x: 350, y: 120 },
            handles: [
              { id: 'out', kind: 'source', side: 'right' },
              { id: 'in', kind: 'target', side: targetSide ?? 'left' },
            ],
          },
          ...(third
            ? [
                {
                  id: 'third',
                  label: 'Third',
                  position: { x: 550, y: 120 },
                  handles: [
                    {
                      id: 'out',
                      kind: 'source' as const,
                      side: 'right' as const,
                    },
                    {
                      id: 'in',
                      kind: 'target' as const,
                      side: 'left' as const,
                    },
                  ],
                },
              ]
            : []),
        ],
      })
    },
    options
  )
}

playwrightTest(
  'deletes a selected edge and its keyed decorations in uncontrolled mode',
  async ({ page }) => {
    await mountConnectionScenario(page, 'uncontrolled', true)
    await updateConnectionDocument(page, {
      label: 'Message',
      markerEnd: 'arrowclosed',
      selected: true,
    })
    const group = page.getByTestId('flow-edge-group')
    await group.focus()
    await page.keyboard.press('Delete')

    await expectPage(group).toHaveCount(0)
    await expectPage(page.getByTestId('flow-edge-label')).toHaveCount(0)
    await expectPage(page.locator('.flow-edges marker')).toHaveCount(0)
    await expectPage(page.getByTestId('flow-canvas')).toBeFocused()
    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges))
      .toEqual([{ kind: 'edge-remove', edgeId: 'edge-1' }])
  }
)

playwrightTest(
  'waits for controlled edge deletion acknowledgement and respects deletable false',
  async ({ page }) => {
    await mountConnectionScenario(page, 'controlled', true)
    await updateConnectionDocument(page, { selected: true, deletable: false })
    const group = page.getByTestId('flow-edge-group')
    await group.focus()
    await page.keyboard.press('Delete')
    await expectPage(group).toHaveCount(1)
    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges?.length))
      .toBe(0)

    await updateConnectionDocument(page, { selected: true, deletable: true })
    await group.focus()
    await page.keyboard.press('Backspace')
    await expectPage(group).toHaveCount(1)
    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges))
      .toEqual([{ kind: 'edge-remove', edgeId: 'edge-1' }])
    await updateConnectionDocument(page, { removed: true })
    await expectPage(group).toHaveCount(0)
    await expectPage(page.getByTestId('flow-canvas')).toBeFocused()
  }
)

playwrightTest(
  'honors edge selectability, focusability, hit width, and accessible name',
  async ({ page }) => {
    await mountConnectionScenario(page, 'uncontrolled', true)
    await updateConnectionDocument(page, {
      ariaLabel: 'Delivery route',
      focusable: false,
      interactionWidth: 42,
      selectable: false,
    })
    const group = page.getByTestId('flow-edge-group')
    const hit = page.getByTestId('flow-edge-hit')
    await expectPage(group).toHaveAttribute('role', 'img')
    await expectPage(group).toHaveAttribute('aria-roledescription', 'edge')
    await expectPage(group).toHaveAttribute('aria-label', 'Delivery route')
    await expectPage(group).toHaveAttribute('tabindex', '-1')
    await expectPage(group).not.toHaveAttribute('aria-pressed')
    await expectPage(hit).toHaveAttribute('stroke-width', '42')
    await expectPage(hit).toHaveCSS('stroke-width', '42px')

    await page
      .locator('article[data-node-id="first"] [data-handle-id="out"]')
      .focus()
    await page.keyboard.press('Shift+Tab')
    await expectPage(group).not.toBeFocused()

    const midpoint = await hit.evaluate((element: SVGPathElement) => {
      const matrix = element.getScreenCTM()

      if (matrix === null) {
        throw new Error('Edge has no screen geometry')
      }

      const point = element
        .getPointAtLength(element.getTotalLength() / 2)
        .matrixTransform(matrix)

      return { x: point.x, y: point.y }
    })

    await page.mouse.click(midpoint.x, midpoint.y + 18)
    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges?.length))
      .toBe(0)
    await updateConnectionDocument(page, {
      ariaLabel: 'Delivery route',
      interactionWidth: 42,
      selectable: true,
    })
    await expectPage(group).toHaveAttribute('role', 'button')
    await expectPage(group).toHaveAttribute('tabindex', '0')
    await expectPage(group).toHaveAttribute('aria-pressed', 'false')
    await page.mouse.click(midpoint.x, midpoint.y + 18)
    await expectPage(group).toHaveClass(/selected/u)
    await expectPage(group).toBeFocused()
  }
)

playwrightTest(
  'restricts reconnection to the configured endpoint',
  async ({ page }) => {
    await mountConnectionScenario(page, 'uncontrolled', true)
    await updateConnectionDocument(page, {
      reconnectable: 'source',
      selected: true,
      third: true,
    })

    const source = page.locator(
      '[data-testid="flow-edge-reconnect-anchor"][data-endpoint="source"]'
    )

    const target = page.locator(
      '[data-testid="flow-edge-reconnect-anchor"][data-endpoint="target"]'
    )

    await expectPage(source).toHaveCSS('opacity', '1')
    await expectPage(target).toHaveCSS('opacity', '0')
    await dragEdgeEndpoint(page, 'source', 'third', 'out')
    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges))
      .toMatchObject([
        {
          kind: 'edge-reconnect',
          edge: { id: 'edge-1', source: 'third', target: 'second' },
        },
      ])

    await updateConnectionDocument(page, {
      reconnectable: false,
      selected: true,
    })
    await expectPage(source).toHaveCSS('opacity', '0')
    await expectPage(target).toHaveCSS('opacity', '0')
  }
)

playwrightTest(
  'renders step and smooth-step routes through movement and viewport changes',
  async ({ page }) => {
    await mountConnectionScenario(page, 'uncontrolled', true)
    await updateConnectionDocument(page, {
      path: 'step',
      label: 'Route',
      second: { x: 350, y: 200 },
    })

    const path = page.getByTestId('flow-edge-path')
    const label = page.getByTestId('flow-edge-label')
    await expectPage(path).toHaveAttribute(
      'd',
      'M255 142L275 142L 300,142Q 300,142 300,142L 300,222Q 300,222 300,222L325 222L345 222'
    )
    await expectPage(label).toHaveAttribute('x', '300')
    await expectPage(label).toHaveAttribute('y', '182')
    await path.evaluate((element) => {
      element.dataset.identity = 'original'
    })

    await updateConnectionDocument(page, {
      path: 'smoothstep',
      label: 'Route',
      second: { x: 350, y: 200 },
    })
    await expectPage(path).toHaveAttribute(
      'd',
      'M255 142L275 142L 295,142Q 300,142 300,147L 300,217Q 300,222 305,222L325 222L345 222'
    )
    await expectPage(path).toHaveAttribute('data-identity', 'original')

    const node = page.locator('article[data-node-id="second"]')
    const box = await node.boundingBox()

    if (box === null) {
      throw new Error('Node has no bounds')
    }

    await page.mouse.move(box.x + 40, box.y + 20)
    await page.mouse.down()
    await page.mouse.move(box.x + 80, box.y + 40)
    await expectPage(label).toHaveAttribute('x', '320')
    await expectPage(label).toHaveAttribute('y', '192')
    await page.mouse.up()

    const pathData = await path.getAttribute('d')

    const before = await path.evaluate((element: SVGPathElement) => {
      const matrix = element.getScreenCTM()

      if (matrix === null) {
        throw new Error('Edge has no screen geometry')
      }

      return element.getPointAtLength(0).matrixTransform(matrix).x
    })

    await page.evaluate(() => {
      globalThis.flowController?.updateViewport({ x: 60, y: 30, zoom: 2 })
    })
    await expectPage(path).toHaveAttribute('d', pathData ?? '')
    await expectPage
      .poll(() =>
        path.evaluate((element: SVGPathElement) => {
          const matrix = element.getScreenCTM()

          if (matrix === null) {
            throw new Error('Edge has no screen geometry')
          }

          return element.getPointAtLength(0).matrixTransform(matrix).x
        })
      )
      .toBeCloseTo(before + 315, 1)
  }
)

playwrightTest(
  'cancels reconnection on pointer cancellation without changing the edge',
  async ({ page }) => {
    await mountConnectionScenario(page, 'uncontrolled', true)
    await updateConnectionDocument(page, { third: true, selected: true })

    const path = page.getByTestId('flow-edge-path')
    const original = await path.getAttribute('d')

    const anchor = page.locator(
      '[data-testid="flow-edge-reconnect-anchor"][data-endpoint="target"]'
    )

    const box = await anchor.boundingBox()

    if (box === null) {
      throw new Error('Target anchor has no bounds')
    }

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    // Cross the default one-pixel connection drag threshold.
    await page.mouse.move(box.x + box.width / 2 + 2, box.y + box.height / 2)
    await expectPage(page.getByTestId('flow-connection-preview')).toBeVisible()
    await page.evaluate(() => {
      const canvas = globalThis.document.querySelector('.flow-canvas')

      canvas?.dispatchEvent(
        new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 })
      )
    })
    await expectPage(page.getByTestId('flow-connection-preview')).toHaveCount(0)
    await page.mouse.up()
    await expectPage(path).toHaveAttribute('d', original ?? '')
    await expectPage
      .poll(() =>
        page.evaluate(
          () =>
            globalThis.flowChanges?.filter(
              (change) => change.kind === 'edge-reconnect'
            ).length
        )
      )
      .toBe(0)
  }
)

playwrightTest(
  'waits for controlled reconnection acknowledgement at a zoomed viewport',
  async ({ page }) => {
    await mountConnectionScenario(page, 'controlled', true)
    await updateConnectionDocument(page, { third: true, selected: true })
    await page.evaluate(() => {
      globalThis.flowController?.updateViewport({ x: 20, y: 10, zoom: 1.5 })
    })

    const path = page.getByTestId('flow-edge-path')
    const original = await path.getAttribute('d')
    await dragEdgeEndpoint(page, 'target', 'third', 'in')
    await expectPage
      .poll(() =>
        page.evaluate(() =>
          globalThis.flowChanges?.filter(
            (change) => change.kind === 'edge-reconnect'
          )
        )
      )
      .toHaveLength(1)
    await expectPage(path).toHaveAttribute('d', original ?? '')

    await page.evaluate(() => {
      const change = globalThis.flowChanges?.find(
        (item) => item.kind === 'edge-reconnect'
      )

      if (change?.kind !== 'edge-reconnect') {
        throw new Error('Missing reconnection change')
      }

      globalThis.flowController?.update({
        edges: [change.edge],
        nodes: [
          {
            id: 'first',
            label: 'First',
            position: { x: 100, y: 120 },
            handles: [
              { id: 'out', kind: 'source', side: 'right' },
              { id: 'in', kind: 'target', side: 'left' },
            ],
          },
          {
            id: 'second',
            label: 'Second',
            position: { x: 350, y: 120 },
            handles: [
              { id: 'out', kind: 'source', side: 'right' },
              { id: 'in', kind: 'target', side: 'left' },
            ],
          },
          {
            id: 'third',
            label: 'Third',
            position: { x: 550, y: 120 },
            handles: [
              { id: 'out', kind: 'source', side: 'right' },
              { id: 'in', kind: 'target', side: 'left' },
            ],
          },
        ],
      })
    })
    await expectPage.poll(() => path.getAttribute('d')).not.toBe(original)

    await dragEdgeEndpoint(page, 'target', 'third', 'in')
    await expectPage
      .poll(() =>
        page.evaluate(
          () =>
            globalThis.flowChanges?.filter(
              (change) => change.kind === 'edge-reconnect'
            ).length
        )
      )
      .toBe(1)
  }
)

playwrightTest(
  'reconnects both edge endpoints without replacing its path or metadata',
  async ({ page }) => {
    await mountConnectionScenario(page, 'uncontrolled', true)
    await updateConnectionDocument(page, {
      third: true,
      selected: true,
      path: 'bezier',
      label: 'Message',
      markerEnd: 'arrowclosed',
      stroke: '#ff0000',
    })

    const path = page.getByTestId('flow-edge-path')
    const originalPath = await path.getAttribute('d')
    await path.evaluate((element) => {
      element.dataset.identity = 'original'
    })

    await dragEdgeEndpoint(page, 'target', 'third', 'out')
    await expectPage
      .poll(() =>
        page.evaluate(
          () =>
            globalThis.flowChanges?.filter(
              (change) => change.kind === 'edge-reconnect'
            ).length
        )
      )
      .toBe(0)
    await expectPage(page.getByTestId('flow-edge-group')).toHaveClass(
      /selected/u
    )

    await dragEdgeEndpoint(page, 'target', 'third', 'in')
    await expectPage
      .poll(() =>
        page.evaluate(() =>
          globalThis.flowChanges?.filter(
            (change) => change.kind === 'edge-reconnect'
          )
        )
      )
      .toHaveLength(1)
    expectPage(await path.getAttribute('d')).not.toBe(originalPath)
    await expectPage(path).toHaveAttribute('data-identity', 'original')
    await expectPage(path).toHaveCSS('stroke', 'rgb(255, 0, 0)')
    await expectPage(path).toHaveAttribute(
      'marker-end',
      /url\(#flow-marker-\d+__color_3d__23_ff0000_26_type_3d_arrowclosed\)/u
    )
    await expectPage(page.getByTestId('flow-edge-label')).toHaveText('Message')

    await dragEdgeEndpoint(page, 'source', 'second', 'out')
    await expectPage
      .poll(() =>
        page.evaluate(() =>
          globalThis.flowChanges?.filter(
            (change) => change.kind === 'edge-reconnect'
          )
        )
      )
      .toHaveLength(2)

    const changes = await page.evaluate(() =>
      globalThis.flowChanges?.filter(
        (change) => change.kind === 'edge-reconnect'
      )
    )

    expectPage(changes?.[0]).toMatchObject({
      kind: 'edge-reconnect',
      edge: { id: 'edge-1', source: 'first', target: 'third' },
    })
    expectPage(changes?.[1]).toMatchObject({
      kind: 'edge-reconnect',
      edge: {
        id: 'edge-1',
        source: 'second',
        target: 'third',
        label: 'Message',
        markerEnd: 'arrowclosed',
      },
    })
    await expectPage(path).toHaveAttribute('data-identity', 'original')
  }
)

playwrightTest(
  'selects edges through the wider pointer target and clears on the pane',
  async ({ page }) => {
    await mountConnectionScenario(page, 'uncontrolled', true)
    const group = page.getByTestId('flow-edge-group')
    const hit = page.getByTestId('flow-edge-hit')
    await expectPage(hit).toHaveCount(1)

    const midpoint = await hit.evaluate((element: SVGPathElement) => {
      const matrix = element.getScreenCTM()

      if (matrix === null) {
        throw new Error('Edge has no screen geometry')
      }

      const point = element
        .getPointAtLength(element.getTotalLength() / 2)
        .matrixTransform(matrix)

      return { x: point.x, y: point.y }
    })

    await page.mouse.click(midpoint.x, midpoint.y + 8)
    await expectPage(group).toHaveClass(/selected/u)
    await expectPage(group).toHaveAttribute('aria-pressed', 'true')
    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges))
      .toEqual([{ kind: 'edge-selection', edgeId: 'edge-1', selected: true }])
    await expectPage
      .poll(() =>
        page
          .getByTestId('flow-edge-path')
          .evaluate((element) => getComputedStyle(element).filter)
      )
      .not.toBe('none')

    await page.mouse.click(20, 20)
    await expectPage(group).not.toHaveClass(/selected/u)
    await expectPage(group).toHaveAttribute('aria-pressed', 'false')
    await expectPage
      .poll(() =>
        page.evaluate(() =>
          globalThis.flowChanges?.filter(
            (change) => change.kind === 'edge-selection'
          )
        )
      )
      .toEqual([
        { kind: 'edge-selection', edgeId: 'edge-1', selected: true },
        { kind: 'edge-selection', edgeId: 'edge-1', selected: false },
      ])
  }
)

playwrightTest(
  'supports keyboard edge selection and controlled acknowledgement',
  async ({ page }) => {
    await mountConnectionScenario(page, 'controlled', true)
    const group = page.getByTestId('flow-edge-group')

    await group.focus()

    await expectPage(group).toBeFocused()
    await page.keyboard.press('Enter')
    await expectPage(group).not.toHaveClass(/selected/u)
    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges))
      .toEqual([{ kind: 'edge-selection', edgeId: 'edge-1', selected: true }])

    await updateConnectionDocument(page, { selected: true })
    await expectPage(group).toHaveClass(/selected/u)
    await expectPage(group).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('Escape')
    await expectPage(group).not.toBeFocused()
    await expectPage(group).toHaveClass(/selected/u)
    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges?.length))
      .toBe(2)

    await updateConnectionDocument(page, { selected: false })
    await expectPage(group).not.toHaveClass(/selected/u)
    await group.focus()
    await page.keyboard.press('Space')
    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges?.length))
      .toBe(3)
  }
)

playwrightTest(
  'keeps marker definitions isolated between two mounted flows',
  async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() =>
      globalThis.dispatchEvent(new Event('beforeunload'))
    )
    await page.evaluate(async () => {
      const modulePath = '/src/public.ts'
      const { mountFlow } = await import(modulePath)

      const graph = {
        edges: [
          {
            id: 'edge-1',
            source: 'first',
            target: 'second',
            markerEnd: 'arrowclosed',
          },
        ],
        nodes: [
          {
            id: 'first',
            label: 'First',
            position: { x: 100, y: 120 },
            handles: [{ id: 'out', kind: 'source', side: 'right' }],
          },
          {
            id: 'second',
            label: 'Second',
            position: { x: 350, y: 120 },
            handles: [{ id: 'in', kind: 'target', side: 'left' }],
          },
        ],
      }

      const options = {
        documentMode: 'uncontrolled',
        viewport: {
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { maxZoom: 2, minZoom: 0.5 },
          mode: 'uncontrolled',
        },
      }

      const firstRoot = globalThis.document.createElement('div')
      firstRoot.dataset.testid = 'marker-host-a'
      firstRoot.style.width = '500px'
      firstRoot.style.height = '250px'
      globalThis.document.body.append(firstRoot)
      const secondRoot = globalThis.document.createElement('div')
      secondRoot.dataset.testid = 'marker-host-b'
      secondRoot.style.width = '500px'
      secondRoot.style.height = '250px'
      globalThis.document.body.append(secondRoot)

      globalThis.flowController = mountFlow(firstRoot, graph, options)
      mountFlow(secondRoot, graph, options)
    })

    const first = page.getByTestId('marker-host-a')
    const second = page.getByTestId('marker-host-b')
    await expectPage(first.getByTestId('flow-edge-path')).toHaveCount(1)
    await expectPage(second.getByTestId('flow-edge-path')).toHaveCount(1)

    const firstMarker = await first
      .getByTestId('flow-edge-path')
      .getAttribute('marker-end')

    const secondMarker = await second
      .getByTestId('flow-edge-path')
      .getAttribute('marker-end')

    expectPage(firstMarker).toMatch(/^url\(#flow-marker-\d+__arrowclosed\)$/u)
    expectPage(secondMarker).toMatch(/^url\(#flow-marker-\d+__arrowclosed\)$/u)
    expectPage(firstMarker).not.toBe(secondMarker)

    await page.evaluate(() => globalThis.flowController?.destroy())
    await expectPage(first.locator('marker')).toHaveCount(0)
    await expectPage(second.locator('marker')).toHaveCount(1)
  }
)

playwrightTest(
  'renders scoped arrow markers and updates edge stroke without replacing the path',
  async ({ page }) => {
    await mountConnectionScenario(page, 'controlled', true)
    await updateConnectionDocument(page, {
      markerStart: 'arrowclosed',
      markerEnd: 'arrow',
      stroke: '#ff0000',
      strokeWidth: 3,
    })

    const path = page.getByTestId('flow-edge-path')
    await expectPage(path).toHaveAttribute(
      'marker-start',
      /url\(#flow-marker-\d+__color_3d__23_ff0000_26_type_3d_arrowclosed\)/u
    )
    await expectPage(path).toHaveAttribute(
      'marker-end',
      /url\(#flow-marker-\d+__color_3d__23_ff0000_26_type_3d_arrow\)/u
    )
    await expectPage(path).toHaveCSS('stroke', 'rgb(255, 0, 0)')
    await expectPage(path).toHaveCSS('stroke-width', '3px')
    await expectPage(page.locator('.flow-edges defs marker')).toHaveCount(2)
    await expectPage(
      page.locator(".flow-edges defs marker polyline[fill='#ff0000']")
    ).toHaveCount(1)

    await path.evaluate((element) => {
      element.dataset.identity = 'original'
    })
    await updateConnectionDocument(page, {
      markerStart: 'arrow',
      stroke: '#0000ff',
      strokeWidth: 4,
    })
    await expectPage(path).toHaveAttribute(
      'marker-start',
      /url\(#flow-marker-\d+__color_3d__23_0000ff_26_type_3d_arrow\)/u
    )
    await expectPage(path).not.toHaveAttribute('marker-end')
    await expectPage(path).toHaveCSS('stroke', 'rgb(0, 0, 255)')
    await expectPage(path).toHaveCSS('stroke-width', '4px')
    await expectPage(page.locator('.flow-edges defs marker')).toHaveCount(1)
    await expectPage(path).toHaveAttribute('data-identity', 'original')

    await updateConnectionDocument(page, {})
    await expectPage(path).not.toHaveAttribute('marker-start')
    await expectPage(page.locator('.flow-edges defs marker')).toHaveCount(0)
  }
)

playwrightTest(
  'keeps controlled edge labels anchored through drag, path updates, and viewport changes',
  async ({ page }) => {
    await mountConnectionScenario(page, 'controlled', true)
    await updateConnectionDocument(page, {
      label: 'Draft',
      path: 'straight',
    })

    const label = page.getByTestId('flow-edge-label')
    await expectPage(label).toHaveText('Draft')
    await expectPage(label).toHaveAttribute('x', '300')
    await expectPage(label).toHaveAttribute('y', '142')

    await label.evaluate((element) => {
      element.dataset.identity = 'original'
    })

    const node = page.locator('article[data-node-id="first"]')
    const box = await node.boundingBox()

    if (box === null) {
      throw new Error('Node has no bounds')
    }

    await page.mouse.move(box.x + 40, box.y + 20)
    await page.mouse.down()
    await page.mouse.move(box.x + 90, box.y + 50)
    await expectPage(label).toHaveAttribute('x', '325')
    await expectPage(label).toHaveAttribute('y', '157')
    await page.mouse.up()
    await expectPage(label).toHaveAttribute('x', '300')
    await expectPage(label).toHaveAttribute('y', '142')

    await updateConnectionDocument(page, {
      label: 'Approved',
      path: 'bezier',
      first: { x: 150, y: 150 },
      targetSide: 'top',
    })
    await expectPage(label).toHaveText('Approved')
    await expectPage(label).toHaveAttribute('x', '387.5')
    await expectPage(label).toHaveAttribute('data-identity', 'original')

    const localX = Number(await label.getAttribute('x'))

    const before = await label.evaluate((element) => {
      const bounds = element.getBoundingClientRect()

      return bounds.left + bounds.width / 2
    })

    await page.evaluate(() => {
      globalThis.flowController?.updateViewport({ x: 80, y: 40, zoom: 2 })
    })
    await expectPage(label).toHaveAttribute('x', '387.5')
    await expectPage
      .poll(() =>
        label.evaluate((element) => {
          const bounds = element.getBoundingClientRect()

          return bounds.left + bounds.width / 2
        })
      )
      .toBeCloseTo(before + localX + 80, 1)

    await updateConnectionDocument(page, {
      path: 'bezier',
      first: { x: 150, y: 150 },
      targetSide: 'top',
    })
    await expectPage(label).toHaveCount(0)
  }
)

playwrightTest(
  'renders Bezier edges through resize, drag, viewport, and path choice changes',
  async ({ page }) => {
    await mountConnectionScenario(page, 'uncontrolled', 'bezier')
    const path = page.getByTestId('flow-edge-path')
    await expectPage(path).toHaveAttribute(
      'd',
      'M255,142 C300,142 300,142 345,142'
    )

    await path.evaluate((element) => {
      element.dataset.identity = 'original'
    })
    await page.locator('article[data-node-id="first"]').evaluate((element) => {
      element.style.width = '200px'
    })
    await expectPage(path).toHaveAttribute(
      'd',
      'M305,142 C325,142 325,142 345,142'
    )

    const node = page.locator('article[data-node-id="second"]')
    const box = await node.boundingBox()

    if (box === null) {
      throw new Error('Node has no bounds')
    }

    await page.mouse.move(box.x + 40, box.y + 20)
    await page.mouse.down()
    await page.mouse.move(box.x + 90, box.y + 50)
    await expectPage(path).toHaveAttribute(
      'd',
      'M305,142 C350,142 350,172 395,172'
    )
    await page.mouse.up()
    await expectPage(path).toHaveAttribute(
      'd',
      'M305,142 C350,142 350,172 395,172'
    )

    const before = await path.evaluate((element: SVGPathElement) => {
      const matrix = element.getScreenCTM()

      if (matrix === null) {
        throw new Error('Edge has no screen geometry')
      }

      return element.getPointAtLength(0).matrixTransform(matrix).x
    })

    await page.evaluate(() => {
      globalThis.flowController?.updateViewport({ x: 80, y: 40, zoom: 2 })
    })
    await expectPage(path).toHaveAttribute(
      'd',
      'M305,142 C350,142 350,172 395,172'
    )
    await expectPage
      .poll(() =>
        path.evaluate((element: SVGPathElement) => {
          const matrix = element.getScreenCTM()

          if (matrix === null) {
            throw new Error('Edge has no screen geometry')
          }

          return element.getPointAtLength(0).matrixTransform(matrix).x
        })
      )
      .toBeCloseTo(before + 385, 1)

    await page.evaluate(() => {
      globalThis.flowController?.update({
        edges: [
          {
            id: 'edge-1',
            source: 'first',
            target: 'second',
            path: 'straight',
          },
        ],
        nodes: [
          {
            id: 'first',
            label: 'First',
            position: { x: 100, y: 120 },
            handles: [
              { id: 'out', kind: 'source', side: 'right' },
              { id: 'in', kind: 'target', side: 'left' },
            ],
          },
          {
            id: 'second',
            label: 'Second',
            position: { x: 400, y: 150 },
            handles: [
              { id: 'out', kind: 'source', side: 'right' },
              { id: 'in', kind: 'target', side: 'left' },
            ],
          },
        ],
      })
    })
    await expectPage(path).toHaveAttribute('d', 'M 305,142L 395,172')
    await expectPage(path).toHaveAttribute('data-identity', 'original')
  }
)

playwrightTest(
  'removes paths when an edge leaves the document or lacks measured handles',
  async ({ page }) => {
    await mountConnectionScenario(page, 'uncontrolled', true)
    await expectPage(page.getByTestId('flow-edge-path')).toHaveCount(1)
    await expectPage(page.locator('.flow-canvas')).toHaveScreenshot(
      'rendered-edge.png',
      { animations: 'disabled' }
    )

    await page.evaluate(() => {
      globalThis.flowController?.update({
        edges: [],
        nodes: [
          { id: 'first', label: 'First', position: { x: 100, y: 120 } },
          { id: 'second', label: 'Second', position: { x: 350, y: 120 } },
        ],
      })
    })
    await expectPage(page.getByTestId('flow-edge-path')).toHaveCount(0)

    await page.evaluate(() => {
      globalThis.flowController?.update({
        edges: [{ id: 'edge-1', source: 'first', target: 'second' }],
        nodes: [
          { id: 'first', label: 'First', position: { x: 100, y: 120 } },
          { id: 'second', label: 'Second', position: { x: 350, y: 120 } },
        ],
      })
    })
    await expectPage(page.getByTestId('flow-edge-path')).toHaveCount(0)
  }
)

playwrightTest(
  'renders keyed straight edges from measured handles through node and viewport changes',
  async ({ page }) => {
    await mountConnectionScenario(page, 'uncontrolled', true)
    const path = page.getByTestId('flow-edge-path')
    await expectPage(path).toHaveCount(1)
    await expectPage(path).toHaveAttribute('d', 'M 255,142L 345,142')

    await path.evaluate((element) => {
      element.dataset.identity = 'original'
    })
    await page.locator('article[data-node-id="first"]').evaluate((element) => {
      element.style.width = '240px'
    })
    await expectPage
      .poll(() => path.getAttribute('d'))
      .toBe('M 345,142L 345,142')
    await expectPage(path).toHaveAttribute('data-identity', 'original')

    const node = page.locator('article[data-node-id="second"]')
    const box = await node.boundingBox()

    if (box === null) {
      throw new Error('Node has no bounds')
    }

    await page.mouse.move(box.x + 40, box.y + 20)
    await page.mouse.down()
    await page.mouse.move(box.x + 90, box.y + 50)
    await expectPage
      .poll(() => path.getAttribute('d'))
      .toBe('M 345,142L 395,172')
    await page.mouse.up()
    await expectPage(path).toHaveAttribute('d', 'M 345,142L 395,172')

    const before = await path.evaluate((element: SVGPathElement) => {
      const point = element.ownerSVGElement?.createSVGPoint()
      const matrix = element.getScreenCTM()

      if (point === undefined || matrix === null) {
        throw new Error('Edge has no screen geometry')
      }

      point.x = element.getPointAtLength(0).x
      point.y = element.getPointAtLength(0).y

      return point.matrixTransform(matrix).x
    })

    await page.evaluate(() => {
      globalThis.flowController?.updateViewport({ x: 80, y: 40, zoom: 2 })
    })
    await expectPage(path).toHaveAttribute('d', 'M 345,142L 395,172')
    await expectPage
      .poll(() =>
        path.evaluate((element: SVGPathElement) => {
          const matrix = element.getScreenCTM()

          if (matrix === null) {
            throw new Error('Edge has no screen geometry')
          }

          return element.getPointAtLength(0).matrixTransform(matrix).x
        })
      )
      .toBeCloseTo(before + 425, 1)
    await expectPage(path).toHaveAttribute('data-identity', 'original')
  }
)

playwrightTest(
  'connects declared handles and emits one semantic edge change',
  async ({ page }) => {
    await mountConnectionScenario(page)
    await dragBetweenHandles(page, 'first', 'out', 'second', 'in')

    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges))
      .toEqual([
        {
          kind: 'edge-add',
          edge: {
            id: 'edge-1',
            source: 'first',
            sourceHandle: 'out',
            target: 'second',
            targetHandle: 'in',
          },
        },
      ])
    await expectPage(page.getByTestId('flow-edge-path')).toHaveCount(1)
    await expectPage(page.locator('.flow-canvas')).toHaveScreenshot(
      'connected-edge-output.png',
      { animations: 'disabled' }
    )

    await dragBetweenHandles(page, 'first', 'out', 'second', 'in')
    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges?.length))
      .toBe(1)
    await expectPage(page.getByTestId('flow-edge-path')).toHaveCount(1)
  }
)

playwrightTest(
  'rejects a source-to-source gesture without adding an edge',
  async ({ page }) => {
    await mountConnectionScenario(page)
    await dragBetweenHandles(page, 'first', 'out', 'second', 'out')
    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges?.length))
      .toBe(0)
    await expectPage(page.getByTestId('flow-edge-path')).toHaveCount(0)
    await expectPage(page.locator('.flow-canvas')).toHaveScreenshot(
      'rejected-connection-output.png',
      { animations: 'disabled' }
    )
  }
)

playwrightTest(
  'controlled connections wait for document acknowledgement',
  async ({ page }) => {
    await mountConnectionScenario(page, 'controlled')
    await dragBetweenHandles(page, 'first', 'out', 'second', 'in')
    await dragBetweenHandles(page, 'first', 'out', 'second', 'in')
    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges?.length))
      .toBe(2)
    await expectPage(page.getByTestId('flow-edge-path')).toHaveCount(0)

    await page.evaluate(() => {
      const change = globalThis.flowChanges?.[0]

      if (change?.kind !== 'edge-add') {
        throw new Error('Missing edge change')
      }

      globalThis.flowController?.update({
        edges: [change.edge],
        nodes: [
          {
            id: 'first',
            label: 'First',
            position: { x: 100, y: 120 },
            handles: [
              { id: 'out', kind: 'source', side: 'right' },
              { id: 'in', kind: 'target', side: 'left' },
            ],
          },
          {
            id: 'second',
            label: 'Second',
            position: { x: 350, y: 120 },
            handles: [
              { id: 'out', kind: 'source', side: 'right' },
              { id: 'in', kind: 'target', side: 'left' },
            ],
          },
        ],
      })
    })
    await expectPage(page.getByTestId('flow-edge-path')).toHaveCount(1)

    await dragBetweenHandles(page, 'first', 'out', 'second', 'in')
    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges?.length))
      .toBe(2)
  }
)

playwrightTest(
  'removing the source cancels an active connection',
  async ({ page }) => {
    await mountConnectionScenario(page)

    const source = page.locator('[data-node-id="first"] [data-handle-id="out"]')

    const box = await source.boundingBox()

    if (box === null) {
      throw new Error('Source handle has no bounds')
    }

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    // Cross the default one-pixel connection drag threshold.
    await page.mouse.move(box.x + box.width / 2 + 2, box.y + box.height / 2)
    await expectPage(page.getByTestId('flow-connection-preview')).toBeVisible()
    await page.evaluate(() => {
      globalThis.flowController?.update({
        edges: [],
        nodes: [
          {
            id: 'second',
            label: 'Second',
            position: { x: 350, y: 120 },
            handles: [{ id: 'in', kind: 'target', side: 'left' }],
          },
        ],
      })
    })
    await expectPage(page.getByTestId('flow-connection-preview')).toHaveCount(0)
    await page.mouse.up()
    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges?.length))
      .toBe(0)
  }
)

playwrightTest(
  'measures handle geometry through a translated and zoomed viewport',
  async ({ page }) => {
    await mountConnectionScenario(page)
    await page.evaluate(() => {
      globalThis.flowController?.updateViewport({ x: 80, y: 40, zoom: 2 })
    })

    const source = page.locator('[data-node-id="first"] [data-handle-id="out"]')

    const target = page.locator('[data-node-id="second"] [data-handle-id="in"]')

    const sourceBox = await source.boundingBox()

    const targetBox = await target.boundingBox()

    if (sourceBox === null || targetBox === null) {
      throw new Error('Connection handle has no bounds')
    }

    await page.mouse.move(
      sourceBox.x + sourceBox.width / 2,
      sourceBox.y + sourceBox.height / 2
    )
    await page.mouse.down()
    // Cross the default one-pixel connection drag threshold.
    await page.mouse.move(
      sourceBox.x + sourceBox.width / 2 + 2,
      sourceBox.y + sourceBox.height / 2
    )
    const line = page.getByTestId('flow-connection-preview').locator('line')
    expectPage(Number(await line.getAttribute('x1'))).toBeCloseTo(249, 1)
    expectPage(Number(await line.getAttribute('y1'))).toBeCloseTo(142, 1)

    await page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2
    )
    await page.mouse.up()
    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges?.length))
      .toBe(1)
  }
)

playwrightTest(
  'explains how to launch when the HTML file is opened directly',
  async ({ page }) => {
    const indexUrl = new URL('../index.html', import.meta.url)

    await page.goto(indexUrl.href)

    await expectPage(
      page.getByRole('heading', { name: 'Start the Flow development server' })
    ).toBeVisible()
    await expectPage(
      page.getByRole('link', { name: 'http://127.0.0.1:4173' })
    ).toHaveAttribute('href', 'http://127.0.0.1:4173')
  }
)

const mountSingleNodeScenario = async (page: Page): Promise<void> => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = globalThis.document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing single-node host')
    }

    const controller = mountFlow(
      root,
      {
        nodes: [
          { id: 'node-1', label: 'First node', position: { x: 120, y: 80 } },
        ],
        edges: [],
      },
      {
        documentMode: 'uncontrolled',
        viewport: {
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
          mode: 'uncontrolled',
        },
      }
    )

    controller.subscribe((change: CoreModule.FlowChange) => {
      root.dataset.lastChange = JSON.stringify(change)
    })
  })
}

playwrightTest(
  'renders the first decoded flow node on the canvas',
  async ({ page }) => {
    await mountSingleNodeScenario(page)

    const canvas = page.getByTestId('flow-canvas')
    const viewport = page.getByTestId('flow-viewport')
    const node = page.getByTestId('flow-node')

    await expectPage(canvas).toHaveAttribute('aria-label', 'Flow canvas')
    await expectPage(node).toHaveText('First node')
    await expectPage(viewport).toHaveCSS(
      'transform',
      'matrix(1, 0, 0, 1, 0, 0)'
    )
    await expectPage(node).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 120, 80)')
    await expectPage(node).toHaveAttribute('data-measured-width', '150')
    await expectPage(node).toHaveAttribute('data-measured-height', '44')
    await expectPage(node).toHaveScreenshot('single-node.png')
    await expectPage(page).toHaveScreenshot('single-node-canvas.png')

    await node.evaluate((element) => {
      element.style.width = '240px'
    })
    await expectPage(node).toHaveAttribute('data-measured-width', '240')
  }
)

playwrightTest(
  'drags a measured node and emits its final flow position',
  async ({ page }) => {
    await mountSingleNodeScenario(page)

    const node = page.getByTestId('flow-node')
    const box = await node.boundingBox()

    if (box === null) {
      throw new Error('Could not measure the rendered node')
    }

    await page.mouse.move(box.x + 20, box.y + 20)
    await page.mouse.down()
    await page.mouse.move(box.x + 120, box.y + 70)
    await page.mouse.up()

    await expectPage(node).toHaveCSS(
      'transform',
      'matrix(1, 0, 0, 1, 220, 130)'
    )
    await expectPage(page.locator('#app')).toHaveAttribute(
      'data-last-change',
      JSON.stringify({
        kind: 'node-position',
        nodeId: 'node-1',
        position: { x: 220, y: 130 },
      })
    )
  }
)

playwrightTest(
  'pans and cursor-zooms an uncontrolled viewport within its limits',
  async ({ page }) => {
    await page.goto('/')
    const viewport = page.getByTestId('flow-viewport')

    await page.mouse.move(700, 400)
    await page.mouse.down()
    await page.mouse.move(800, 450)
    await page.mouse.up()

    await expectPage(viewport).toHaveCSS(
      'transform',
      'matrix(1, 0, 0, 1, 100, 50)'
    )
    await expectPage(page.locator('#app')).toHaveAttribute(
      'data-last-change',
      JSON.stringify({ kind: 'viewport', viewport: { x: 100, y: 50, zoom: 1 } })
    )

    await page.mouse.move(400, 300)
    await page.mouse.wheel(0, -500)
    await expectPage(viewport).toHaveCSS(
      'transform',
      'matrix(2, 0, 0, 2, -200, -200)'
    )
    await expectPage(page.locator('#app')).toHaveAttribute(
      'data-last-change',
      JSON.stringify({
        kind: 'viewport',
        viewport: { x: -200, y: -200, zoom: 2 },
      })
    )

    await page.mouse.wheel(0, -500)
    await expectPage(viewport).toHaveCSS(
      'transform',
      'matrix(2, 0, 0, 2, -200, -200)'
    )
  }
)

playwrightTest(
  'keeps viewport and document ownership independent',
  async ({ page }) => {
    await mountControllerScenario(page, 'controlled', 'uncontrolled')
    const viewport = page.getByTestId('flow-viewport')

    await page.mouse.move(700, 400)
    await page.mouse.down()
    await page.mouse.move(750, 425)
    await page.mouse.up()

    await expectPage(viewport).toHaveCSS(
      'transform',
      'matrix(1, 0, 0, 1, 50, 25)'
    )
    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
      .toEqual({ kind: 'viewport', viewport: { x: 50, y: 25, zoom: 1 } })
  }
)

playwrightTest(
  'controlled viewport input waits for caller acknowledgement',
  async ({ page }) => {
    await mountControllerScenario(page, 'uncontrolled', 'controlled')
    const viewport = page.getByTestId('flow-viewport')

    await page.mouse.move(700, 400)
    await page.mouse.down()
    await page.mouse.move(760, 430)
    await page.mouse.up()

    await expectPage(viewport).toHaveCSS(
      'transform',
      'matrix(1, 0, 0, 1, 0, 0)'
    )
    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
      .toEqual({ kind: 'viewport', viewport: { x: 60, y: 30, zoom: 1 } })

    await page.evaluate(() => {
      const { flowController: controller } = globalThis

      controller?.updateViewport({ x: 60, y: 30, zoom: 1 })
    })
    await expectPage(viewport).toHaveCSS(
      'transform',
      'matrix(1, 0, 0, 1, 60, 30)'
    )
  }
)

playwrightTest(
  'converts node dragging through the current viewport',
  async ({ page }) => {
    await mountControllerScenario(page, 'uncontrolled')
    await page.evaluate(() => {
      const { flowController: controller } = globalThis

      controller?.updateViewport({ x: 100, y: 50, zoom: 2 })
    })

    const first = page.locator('[data-node-id="first"]')
    const box = await first.boundingBox()

    if (box === null) {
      throw new Error('Could not measure transformed node')
    }

    await page.mouse.move(box.x + 20, box.y + 20)
    await page.mouse.down()
    await page.mouse.move(box.x + 120, box.y + 70)
    await page.mouse.up()

    await expectPage(first).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 90, 75)')
    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
      .toEqual({
        kind: 'node-position',
        nodeId: 'first',
        position: { x: 90, y: 75 },
      })
  }
)

playwrightTest(
  'exports correlated OTLP JSON logs and traces when configured',
  async ({ page }) => {
    const payloads = new Map<string, unknown[]>()
    await page.route('**/otel/v1/*', async (route) => {
      const url = new URL(route.request().url())
      const existing = payloads.get(url.pathname) ?? []
      existing.push(route.request().postDataJSON())
      payloads.set(url.pathname, existing)
      await route.fulfill({
        body: '{}',
        contentType: 'application/json',
        status: 200,
      })
    })

    await page.goto('/')
    await page.evaluate(() =>
      globalThis.dispatchEvent(new Event('beforeunload'))
    )
    await page.evaluate(async (requestedCorePath) => {
      const telemetryPath = '/src/telemetry.ts'
      const hostPath = '/src/public.ts'

      const telemetryModule: typeof TelemetryModule = await import(
        telemetryPath
      )

      const hostModule: typeof HostModule = await import(hostPath)

      const coreModule: typeof CoreModule = await import(requestedCorePath)

      const { makeBrowserRuntime } = telemetryModule
      const { createFlowHost } = hostModule
      const { decodeFlowDocument } = coreModule

      const runtime = makeBrowserRuntime({
        VITE_OTEL_EXPORTER_OTLP_ENDPOINT: `${globalThis.location.origin}/otel`,
        VITE_OTEL_EXPORT_INTERVAL_MS: '10',
        VITE_OTEL_SERVICE_NAME: 'flow-browser-test',
        VITE_OTEL_SERVICE_VERSION: 'test',
      })

      const root = globalThis.document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing telemetry host')
      }

      const initialDocument = await runtime.runPromise(
        decodeFlowDocument({
          edges: [],
          nodes: [
            { id: 'otel-node', position: { x: 10, y: 20 }, label: 'OTEL' },
          ],
        })
      )

      const host = await runtime.runPromise(
        createFlowHost(root, initialDocument, {
          documentMode: 'uncontrolled',
          runEffect: runtime.runSync,
          runTelemetry: (effect) => {
            runtime.runFork(effect)
          },
          viewport: {
            initial: { x: 0, y: 0, zoom: 1 },
            limits: { maxZoom: 2, minZoom: 0.5 },
            mode: 'uncontrolled',
          },
        })
      )

      await runtime.runPromiseExit(
        decodeFlowDocument({
          edges: [],
          nodes: [
            { id: 'duplicate', position: { x: 0, y: 0 }, label: 'First' },
            { id: 'duplicate', position: { x: 1, y: 1 }, label: 'Second' },
          ],
        })
      )
      await host.destroyAsync()
      await runtime.dispose()
    }, coreModulePath)

    const tracePayloads = payloads.get('/otel/v1/traces') ?? []
    const logPayloads = payloads.get('/otel/v1/logs') ?? []
    expectPage(tracePayloads.length).toBeGreaterThan(0)
    expectPage(logPayloads.length).toBeGreaterThan(0)

    const serializedTraces = JSON.stringify(tracePayloads)
    const serializedLogs = JSON.stringify(logPayloads)
    expectPage(serializedTraces).toContain('flow.host.mount')
    expectPage(serializedTraces).toContain('flow.dom.reconcile')
    expectPage(serializedTraces).toContain('flow.document.integrity')
    expectPage(serializedLogs).toContain('Mounted flow host')
    expectPage(serializedLogs).toContain('Rejected flow document integrity')
    expectPage(serializedLogs).toContain('flow.document.issue')
    expectPage(serializedLogs).toContain('duplicate-node-id')
    expectPage(serializedLogs).toMatch(/"traceId":"[0-9a-f]{32}"/u)
    expectPage(serializedLogs).toMatch(/"spanId":"[0-9a-f]{16}"/u)
  }
)

playwrightTest(
  'destroys the browser resources when the host stops',
  async ({ page }) => {
    await page.goto('/')
    await expectPage(page.getByTestId('flow-canvas')).toBeVisible()

    await page.evaluate(() =>
      globalThis.dispatchEvent(new Event('beforeunload'))
    )

    await expectPage(page.getByTestId('flow-canvas')).toHaveCount(0)
  }
)

playwrightTest(
  'closes scoped listeners and resize observation exactly once',
  async ({ page }) => {
    await mountControllerScenario(page, 'uncontrolled')
    await page.evaluate(() => {
      const canvas = globalThis.document.querySelector<HTMLElement>(
        '[data-testid="flow-canvas"]'
      )

      const node = globalThis.document.querySelector<HTMLElement>(
        '[data-node-id="first"]'
      )

      if (canvas === null || node === null) {
        throw new Error('Missing scoped resource fixture')
      }

      globalThis.detachedCanvas = canvas
      globalThis.detachedNode = node
      globalThis.flowController?.destroy()
      globalThis.flowController?.destroy()
      node.dataset.measuredWidth = 'disconnected'
      node.style.width = '280px'
      canvas.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          clientX: 400,
          clientY: 300,
          deltaY: -500,
        })
      )
    })

    await page.waitForTimeout(50)
    expectPage(
      await page.evaluate(() => ({
        changes: globalThis.flowChanges,
        measuredWidth: globalThis.detachedNode?.dataset.measuredWidth,
      }))
    ).toEqual({ changes: [], measuredWidth: 'disconnected' })
    await expectPage(page.getByTestId('flow-canvas')).toHaveCount(0)
  }
)

playwrightTest(
  'interrupts the scoped Effect host and releases browser resources',
  async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() =>
      globalThis.dispatchEvent(new Event('beforeunload'))
    )

    const result = await page.evaluate(async (requestedCorePath) => {
      const effectPath = '/@id/effect'
      const hostPath = '/src/public.ts'
      const telemetryPath = '/src/telemetry.ts'
      const effectModule: typeof EffectModule = await import(effectPath)
      const coreModule: typeof CoreModule = await import(requestedCorePath)

      const hostModule: typeof HostModule = await import(hostPath)

      const telemetryModule: typeof TelemetryModule = await import(
        telemetryPath
      )

      const { Effect, Fiber } = effectModule
      const { decodeFlowDocument } = coreModule
      const { acquireFlowHost } = hostModule
      const { makeBrowserRuntime } = telemetryModule
      const runtime = makeBrowserRuntime({})
      const root = globalThis.document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing interruption host')
      }

      const changes: unknown[] = []

      const program = Effect.scoped(
        Effect.gen(function* program() {
          const initialDocument = yield* decodeFlowDocument({
            edges: [],
            nodes: [
              {
                id: 'scoped-node',
                position: { x: 20, y: 30 },
                label: 'Scoped',
              },
            ],
          })

          const host = yield* acquireFlowHost(root, initialDocument, {
            documentMode: 'uncontrolled',
            runEffect: runtime.runSync,
            viewport: {
              initial: { x: 0, y: 0, zoom: 1 },
              limits: { maxZoom: 2, minZoom: 0.5 },
              mode: 'uncontrolled',
            },
          })

          host.subscribe((change) => changes.push(change))
          yield* Effect.never
        })
      )

      const fiber = runtime.runFork(program)

      await runtime.runPromise(Effect.sleep('100 millis'))

      const canvas = root.querySelector<HTMLElement>(
        '[data-testid="flow-canvas"]'
      )

      const node = root.querySelector<HTMLElement>(
        '[data-node-id="scoped-node"]'
      )

      if (canvas === null || node === null) {
        throw new Error('Scoped host did not mount')
      }

      await runtime.runPromise(Fiber.interrupt(fiber))
      node.dataset.measuredWidth = 'interrupted'
      node.style.width = '290px'
      canvas.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          clientX: 300,
          clientY: 200,
          deltaY: -500,
        })
      )
      await runtime.runPromise(Effect.sleep('50 millis'))
      await runtime.dispose()

      return {
        changes,
        measuredWidth: node.dataset.measuredWidth,
        rootChildren: root.childElementCount,
      }
    }, coreModulePath)

    expectPage(result).toEqual({
      changes: [],
      measuredWidth: 'interrupted',
      rootChildren: 0,
    })
  }
)

playwrightTest(
  'reconciles controlled nodes by identifier and waits for caller acknowledgement',
  async ({ page }) => {
    await mountControllerScenario(page, 'controlled')
    await assertTwoNodeControllerConformance(page)

    const first = page.locator('[data-node-id="first"]')
    const box = await first.boundingBox()

    if (box === null) {
      throw new Error('Could not measure controlled node')
    }

    await page.mouse.move(box.x + 20, box.y + 20)
    await page.mouse.down()
    await page.mouse.move(box.x + 120, box.y + 70)
    await page.mouse.up()

    await expectPage(first).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 70, 65)')
    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
      .toEqual({
        kind: 'node-position',
        nodeId: 'first',
        position: { x: 170, y: 115 },
      })

    await updateScenario(page, [
      { id: 'third', label: 'Third', x: 420, y: 150 },
      { id: 'first', label: 'First updated', x: 170, y: 115 },
    ])
    await expectPage(first).toHaveCSS(
      'transform',
      'matrix(1, 0, 0, 1, 170, 115)'
    )

    await page.evaluate(() => {
      const { flowController: controller } = globalThis

      if (controller === undefined) {
        throw new Error('Missing conformance controller')
      }

      controller.destroy()
    })
    await expectPage(page.getByTestId('flow-canvas')).toHaveCount(0)
  }
)

playwrightTest(
  'applies uncontrolled commands and cancels a drag when its node is removed',
  async ({ page }) => {
    await mountControllerScenario(page, 'uncontrolled')
    await page.evaluate(() => {
      const { flowController: controller } = globalThis

      if (controller === undefined) {
        throw new Error('Missing conformance controller')
      }

      controller.dispatch({
        kind: 'set-node-position',
        nodeId: 'second',
        position: { x: 320, y: 140 },
      })
    })
    await expectPage(page.locator('[data-node-id="second"]')).toHaveCSS(
      'transform',
      'matrix(1, 0, 0, 1, 320, 140)'
    )

    const first = page.locator('[data-node-id="first"]')
    const box = await first.boundingBox()

    if (box === null) {
      throw new Error('Could not measure uncontrolled node')
    }

    await page.mouse.move(box.x + 20, box.y + 20)
    await page.mouse.down()
    await page.mouse.move(box.x + 50, box.y + 40)
    await updateScenario(page, [
      { id: 'second', label: 'Second', x: 320, y: 140 },
    ])
    await page.mouse.up()

    await expectPage(first).toHaveCount(0)
    await expectPage
      .poll(() => page.evaluate(() => globalThis.flowChanges))
      .toEqual([
        {
          kind: 'node-position',
          nodeId: 'second',
          position: { x: 320, y: 140 },
        },
      ])
  }
)

playwrightTest(
  'vanilla dev showcases paths, visibility, node selection, and viewport culling',
  async ({ page }) => {
    await page.goto('/')

    await expectPage(
      page.getByRole('heading', { name: 'Flow playground' })
    ).toBeVisible()
    await expectPage(page.locator('.flow-demo-description')).toContainText(
      'compare edge paths'
    )
    await expectPage(page.locator('.flow-demo-note')).toContainText(
      'Control or Command adds nodes'
    )
    await expectPage(
      page.getByRole('button', { name: 'Main graph' })
    ).toHaveAttribute('aria-current', 'true')
    await expectPage(
      page.locator('.flow-node[data-node-id="remote-a"]')
    ).toHaveCount(0)
    await expectPage(
      page.locator('[data-edge-id="simple"] .flow-edge-path')
    ).toHaveAttribute('d', / C/u)
    await expectPage(
      page.locator('[data-edge-id="hidden"] .flow-edge-path')
    ).toHaveCount(0)

    await page.locator('.flow-node[data-node-id="input"]').click()
    await expectPage(
      page.locator('.flow-node[data-node-id="input"]')
    ).toHaveClass(/selected/u)
    await page.keyboard.press('ArrowRight')
    await expectPage(
      page.locator('.flow-node[data-node-id="input"]')
    ).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 120, 500)')

    await page.getByRole('button', { name: 'Show hidden edge' }).click()
    await expectPage(page.locator('.flow-demo-description')).toContainText(
      'Step edge visible'
    )
    await expectPage(page.locator('.flow-demo-note')).toContainText(
      'Choose Hide step edge'
    )
    await expectPage(
      page.getByRole('button', { name: 'Hide step edge' })
    ).toHaveAttribute('aria-current', 'true')
    await expectPage(
      page.locator('[data-edge-id="hidden"] .flow-edge-path')
    ).toHaveCount(1)

    await page.getByRole('button', { name: 'Hide Validate node' }).click()
    await expectPage(page.locator('.flow-demo-description')).toContainText(
      'Validate hidden'
    )
    await expectPage(page.locator('.flow-demo-note')).toContainText(
      'Choose Show Validate node'
    )
    await expectPage(
      page.locator('.flow-node[data-node-id="validate"]')
    ).toHaveCount(0)
    await expectPage(
      page.locator('[data-edge-id="smooth"] .flow-edge-path')
    ).toHaveCount(0)
    await page.getByRole('button', { name: 'Show Validate node' }).click()
    await expectPage(page.locator('.flow-demo-note')).toContainText(
      'Drag Validate'
    )
    await expectPage(
      page.locator('.flow-node[data-node-id="validate"]')
    ).toHaveCount(1)

    await page.getByRole('button', { name: 'Distant graph' }).click()
    await expectPage(page.locator('.flow-demo-description')).toContainText(
      'Viewport culling removes the main graph'
    )
    await expectPage(page.locator('.flow-demo-note')).toContainText(
      'Only nodes near the viewport'
    )
    await expectPage(
      page.getByRole('button', { name: 'Distant graph' })
    ).toHaveAttribute('aria-pressed', 'true')
    await expectPage(
      page.locator('.flow-node[data-node-id="remote-a"]')
    ).toHaveCount(1)
    await expectPage(
      page.locator('.flow-node[data-node-id="input"]')
    ).toHaveCount(0)

    await page.getByRole('button', { name: 'Main graph' }).click()
    await expectPage(page.locator('.flow-demo-description')).toContainText(
      'compare edge paths'
    )
    await expectPage(page.locator('.flow-demo-note')).toContainText(
      'Control or Command adds nodes'
    )
    await expectPage(
      page.getByRole('button', { name: 'Main graph' })
    ).toHaveAttribute('aria-pressed', 'true')
    await expectPage(
      page.locator('.flow-node[data-node-id="input"]')
    ).toHaveCount(1)
    await expectPage(
      page.locator('.flow-node[data-node-id="remote-a"]')
    ).toHaveCount(0)
  }
)

playwrightTest(
  'selects and clears a focused node by keyboard',
  async ({ page }) => {
    await mountSingleNodeScenario(page)
    const node = page.getByTestId('flow-node')

    await expectPage(node).toHaveAttribute('data-measured-width', /\d+/u)

    await node.focus()
    await page.keyboard.press('Enter')
    await expectPage(node).toHaveClass(/selected/u)
    await expectPage(node).toHaveAttribute('aria-pressed', 'true')

    await node.focus()
    await page.keyboard.press('Escape')
    await expectPage(node).not.toHaveClass(/selected/u)
    await expectPage(node).toHaveAttribute('aria-pressed', 'false')
  }
)

playwrightTest(
  'Promise facade validates, reports changes, and cleans up once',
  async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() =>
      globalThis.dispatchEvent(new Event('beforeunload'))
    )

    const result = await page.evaluate(async () => {
      const modulePath = '/src/public.ts'
      const { createFlow } = await import(modulePath)
      const root = document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing async facade host')
      }

      root.replaceChildren()
      let facadeChanges = 0
      let directChanges = 0

      const controller = await createFlow(
        root,
        {
          nodes: [
            { id: 'async-node', label: 'Async', position: { x: 20, y: 30 } },
          ],
          edges: [],
        },
        {
          documentMode: 'controlled',
          viewport: {
            mode: 'uncontrolled',
            initial: { x: 0, y: 0, zoom: 1 },
            limits: { minZoom: 0.5, maxZoom: 2 },
          },
          onChange: () => {
            facadeChanges += 1
          },
        }
      )

      const unsubscribe = controller.subscribe(() => {
        directChanges += 1
      })

      const asyncNode = () => {
        const node = root.querySelector<HTMLElement>(
          "[data-node-id='async-node']"
        )

        if (node === null) {
          throw new Error('Missing async node')
        }

        return node
      }

      controller.dispatch({
        kind: 'set-node-position',
        nodeId: 'async-node',
        position: { x: 40, y: 50 },
      })

      const pendingPosition = new DOMMatrixReadOnly(
        getComputedStyle(asyncNode()).transform
      )

      controller.update({
        nodes: [
          { id: 'async-node', label: 'Async', position: { x: 40, y: 50 } },
        ],
        edges: [],
      })
      unsubscribe()
      controller.dispatch({
        kind: 'set-node-position',
        nodeId: 'async-node',
        position: { x: 60, y: 70 },
      })

      const acknowledgedPosition = new DOMMatrixReadOnly(
        getComputedStyle(asyncNode()).transform
      )

      let updateFailedSynchronously = false

      try {
        controller.update({
          nodes: [
            { id: 'invalid', label: 'One', position: { x: 0, y: 0 } },
            { id: 'invalid', label: 'Two', position: { x: 1, y: 1 } },
          ],
          edges: [],
        })
      } catch {
        updateFailedSynchronously = true
      }

      const beforeDestroy = { facadeChanges, directChanges }
      controller.destroy()
      controller.destroy()
      controller.dispatch({
        kind: 'set-node-position',
        nodeId: 'async-node',
        position: { x: 80, y: 90 },
      })

      return {
        beforeDestroy,
        afterDestroy: { facadeChanges, directChanges },
        controlledPositions: {
          pendingX: pendingPosition.m41,
          pendingY: pendingPosition.m42,
          acknowledgedX: acknowledgedPosition.m41,
          acknowledgedY: acknowledgedPosition.m42,
        },
        updateFailedSynchronously,
        canvasCount: root.querySelectorAll("[data-testid='flow-canvas']")
          .length,
      }
    })

    expectPage(result.beforeDestroy).toEqual({
      facadeChanges: 2,
      directChanges: 1,
    })
    expectPage(result.afterDestroy).toEqual(result.beforeDestroy)
    expectPage(result.controlledPositions).toEqual({
      pendingX: 20,
      pendingY: 30,
      acknowledgedX: 40,
      acknowledgedY: 50,
    })
    expectPage(result.updateFailedSynchronously).toBe(true)
    expectPage(result.canvasCount).toBe(0)

    const uncontrolledPosition = await page.evaluate(async () => {
      const modulePath = '/src/public.ts'
      const { createFlow } = await import(modulePath)
      const root = document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing async facade host')
      }

      const controller = await createFlow(
        root,
        {
          nodes: [
            {
              id: 'uncontrolled-node',
              label: 'Uncontrolled',
              position: { x: 5, y: 6 },
            },
          ],
          edges: [],
        },
        {
          documentMode: 'uncontrolled',
          viewport: {
            mode: 'uncontrolled',
            initial: { x: 0, y: 0, zoom: 1 },
            limits: { minZoom: 0.5, maxZoom: 2 },
          },
        }
      )

      controller.dispatch({
        kind: 'set-node-position',
        nodeId: 'uncontrolled-node',
        position: { x: 15, y: 16 },
      })

      const node = root.querySelector<HTMLElement>(
        "[data-node-id='uncontrolled-node']"
      )

      if (node === null) {
        throw new Error('Missing uncontrolled node')
      }

      const matrix = new DOMMatrixReadOnly(getComputedStyle(node).transform)
      controller.destroy()

      return { x: matrix.m41, y: matrix.m42 }
    })

    expectPage(uncontrolledPosition).toEqual({ x: 15, y: 16 })
  }
)

playwrightTest(
  'Promise facade rejects invalid documents and cleans renderer mount failures',
  async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() =>
      globalThis.dispatchEvent(new Event('beforeunload'))
    )

    const outcomes = await page.evaluate(async () => {
      const modulePath = '/src/public.ts'
      const { createFlow } = await import(modulePath)
      const root = document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing async facade host')
      }

      root.replaceChildren()

      const options = {
        documentMode: 'uncontrolled' as const,
        viewport: {
          mode: 'uncontrolled' as const,
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }

      const invalidRejected = await createFlow(
        root,
        {
          nodes: [
            { id: 'duplicate', label: 'One', position: { x: 0, y: 0 } },
            { id: 'duplicate', label: 'Two', position: { x: 10, y: 10 } },
          ],
          edges: [],
        },
        options
      ).then(
        () => false,
        () => true
      )

      const invalidCanvasCount = root.querySelectorAll(
        "[data-testid='flow-canvas']"
      ).length

      const rendererRejected = await createFlow(
        root,
        {
          nodes: [
            {
              id: 'renderer-error',
              label: 'Fail',
              type: 'throws',
              position: { x: 0, y: 0 },
            },
          ],
          edges: [],
        },
        {
          ...options,
          nodeRenderers: {
            throws: () => {
              throw new Error('renderer mount failed')
            },
          },
        }
      ).then(
        () => false,
        () => true
      )

      return {
        invalidRejected,
        invalidCanvasCount,
        rendererRejected,
        rendererCanvasCount: root.querySelectorAll(
          "[data-testid='flow-canvas']"
        ).length,
      }
    })

    expectPage(outcomes).toEqual({
      invalidRejected: true,
      invalidCanvasCount: 0,
      rendererRejected: true,
      rendererCanvasCount: 0,
    })
  }
)
