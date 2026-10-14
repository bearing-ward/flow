import type { FlowNode } from '@flow/core'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

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
import type {
  FlowDocumentInput,
  NodeInternalsRefreshResult,
} from '../src/mount-flow.ts'
import type { mountFlow as VanillaMountFlow } from '../src/public.ts'

const edgePaths = [
  'straight',
  'bezier',
  'simplebezier',
  'step',
  'smoothstep',
] as const

const reset = async (page: Page): Promise<void> => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
}

type MountFlow = typeof VanillaMountFlow

test('renderer contracts preserve identity, isolate canvases, and refresh dynamic handle geometry', async ({
  page,
}) => {
  await reset(page)

  await page.evaluate(async (paths) => {
    const modulePath = '/src/public.ts'
    const { mountFlow: browserMountFlow } = await import(modulePath)
    const mountFlow: MountFlow = browserMountFlow
    const host = document.querySelector<HTMLElement>('#app')

    if (host === null) {
      throw new Error('Missing host')
    }

    host.replaceChildren()
    const secondHost = document.createElement('div')
    secondHost.id = 'second-host'
    secondHost.style.transform = 'translateX(1000px)'
    document.body.append(secondHost)

    const lifecycle: string[] = []

    const graph: FlowDocumentInput = {
      nodes: [
        {
          id: 'source',
          label: 'Source',
          position: { x: 80, y: 100 },
          type: 'custom',
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'target',
          label: 'Target',
          position: { x: 360, y: 100 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: paths.map((path, index) => ({
        id: `path-${path}`,
        source: 'source',
        sourceHandle: 'out',
        target: 'target',
        targetHandle: 'in',
        path,
        label: `Label ${path}`,
        markerEnd: 'arrow' as const,
        interactionWidth: 28,
        data: { index },
      })),
    }

    const renderer =
      (name: string) => (node: FlowNode, content: HTMLElement) => {
        lifecycle.push(`mount:${name}`)
        const button = document.createElement('button')
        button.dataset.rendererButton = ''
        button.dataset.flowNoDrag = ''
        button.textContent = String(node.data?.['text'] ?? 'initial')
        button.addEventListener('click', () => {
          button.dataset.clicks = String(
            Number(button.dataset.clicks ?? '0') + 1
          )
        })
        content.append(button)

        return {
          update: (next: FlowNode) => {
            lifecycle.push(`update:${name}`)
            button.textContent = String(next.data?.['text'] ?? 'initial')
          },
          destroy: () => {
            lifecycle.push(`destroy:${name}`)
          },
        }
      }

    const options = {
      documentMode: 'uncontrolled' as const,
      nodeRenderers: {
        custom: renderer('custom'),
        alternate: renderer('alternate'),
      },
      viewport: {
        mode: 'uncontrolled' as const,
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
      },
    }

    const first = mountFlow(host, graph, options)
    const second = mountFlow(secondHost, graph, options)

    // SAFETY: This property is private to this browser test and initialized before later reads.
    const state = globalThis as typeof globalThis & {
      rendererHarness?: {
        first: typeof first
        second: typeof second
        lifecycle: string[]
      }
    }

    state.rendererHarness = { first, second, lifecycle }
  }, edgePaths)

  await expect(page.locator('#app [data-testid="flow-canvas"]')).toHaveCount(1)
  await expect(
    page.locator('#second-host [data-testid="flow-canvas"]')
  ).toHaveCount(1)
  await expect(page.locator('.flow-edge-group')).toHaveCount(10)

  await Promise.all(
    edgePaths.map(async (path) => {
      const hit = page.locator(
        `#app [data-edge-id="path-${path}"] .flow-edge-hit`
      )

      await expect(hit).toHaveAttribute('d', /^M/u)
      await expect(hit).toHaveAttribute('stroke-width', '28')

      const label = page.locator(
        `#app [data-testid="flow-edge-label"][data-edge-id="path-${path}"]`
      )

      await expect(label).toHaveText(`Label ${path}`)
      await expect(label).toHaveAttribute('x', /^\d/u)
      await expect(label).toHaveAttribute('y', /^\d/u)
      await expect(label).toHaveCSS('pointer-events', 'none')
      await expect(label).toHaveJSProperty('tagName', 'DIV')
      await expect(label.locator('xpath=..')).toHaveClass(/flow-edge-labels/u)
      await expect(label.locator('xpath=../..')).toHaveClass(/flow-viewport/u)
      await expect(
        page.locator(`#app [data-edge-id="path-${path}"] .flow-edge-path`)
      ).toHaveAttribute('marker-end', /^url\(#flow-marker-/u)
    })
  )

  const markerScopes = await page.evaluate(() => {
    const roots = ['#app', '#second-host']

    return roots.map((rootSelector) => {
      const root = document.querySelector(rootSelector)

      const references = [
        ...document.querySelectorAll(`${rootSelector} .flow-edge-path`),
      ].map((path) => path.getAttribute('marker-end'))

      const markerId = references[0]?.match(/^url\(#(?<markerId>.+)\)$/u)
        ?.groups?.markerId

      const marker =
        markerId === undefined ? null : document.querySelector(`#${markerId}`)

      return {
        references,
        markerOwnedByCanvas:
          marker?.closest('.flow-edges') === root?.querySelector('.flow-edges'),
      }
    })
  })

  expect(markerScopes.map((scope) => scope.references.length)).toEqual([5, 5])
  expect(markerScopes[0]?.references[0]).not.toBe(
    markerScopes[1]?.references[0]
  )
  expect(markerScopes.every((scope) => scope.markerOwnedByCanvas)).toBe(true)

  const labelStackOrder = await page
    .locator('#app .flow-edge-labels')
    .evaluate((overlay) => {
      const firstNode =
        overlay.parentElement?.querySelector('.flow-node') ?? null

      return {
        nodesPaintAfterLabels:
          firstNode !== null &&
          overlay.compareDocumentPosition(firstNode) ===
            Node.DOCUMENT_POSITION_FOLLOWING,
        overlayZIndex: getComputedStyle(overlay).zIndex,
        nodeZIndex:
          firstNode === null ? null : getComputedStyle(firstNode).zIndex,
      }
    })

  expect(labelStackOrder).toEqual({
    nodesPaintAfterLabels: true,
    overlayZIndex: '1',
    nodeZIndex: '1',
  })

  const source = page.locator('.flow-node[data-node-id="source"]').first()
  const button = source.locator('[data-renderer-button]')
  await button.evaluate((el) => {
    if (!(el instanceof HTMLButtonElement)) {
      throw new TypeError('Expected the custom renderer button')
    }

    el.focus()
  })
  await page.keyboard.press('Enter')
  await expect(button).toHaveAttribute('data-clicks', '1')
  await expect(button).toBeFocused()
  await button.evaluate((el) => {
    if (!(el instanceof HTMLElement)) {
      throw new TypeError('Expected the custom renderer HTML element')
    }

    el.dataset.identity = 'kept'
  })

  const initialPath = await page
    .locator('#app [data-edge-id="path-straight"] .flow-edge-hit')
    .getAttribute('d')

  const initialLabelY = await page
    .locator(
      '#app [data-testid="flow-edge-label"][data-edge-id="path-straight"]'
    )
    .getAttribute('y')

  await page
    .locator('#app .flow-handle[data-handle-id="out"]')
    .first()
    .evaluate((el) => {
      if (!(el instanceof HTMLElement)) {
        throw new TypeError('Expected the measured handle element')
      }

      el.style.transform = 'translateY(24px)'
    })
  await page.evaluate(async () => {
    // SAFETY: The browser test initializes this harness before requesting its public controller methods.
    const harness = (
      globalThis as typeof globalThis & {
        rendererHarness?: {
          first: {
            updateNodeInternals: (
              ids: readonly string[]
            ) => Promise<readonly NodeInternalsRefreshResult[]>
          }
        }
      }
    ).rendererHarness

    await harness?.first.updateNodeInternals(['source'])
  })
  await expect
    .poll(() =>
      page
        .locator('#app [data-edge-id="path-straight"] .flow-edge-hit')
        .getAttribute('d')
    )
    .not.toBe(initialPath)
  await expect
    .poll(() =>
      page
        .locator(
          '#app [data-testid="flow-edge-label"][data-edge-id="path-straight"]'
        )
        .getAttribute('y')
    )
    .not.toBe(initialLabelY)

  await page.evaluate(() => {
    // SAFETY: The browser test initializes this harness before reading it here.
    const harness = (
      globalThis as typeof globalThis & {
        rendererHarness?: {
          first: { update: (doc: FlowDocumentInput) => void }
          second: { getNodes: () => readonly { id: string; label: string }[] }
          lifecycle: string[]
        }
      }
    ).rendererHarness

    if (harness === undefined) {
      throw new Error('Missing renderer harness')
    }

    harness.first.update({
      nodes: [
        {
          id: 'source',
          label: 'Source',
          position: { x: 80, y: 100 },
          type: 'custom',
          data: { text: 'same renderer update' },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'target',
          label: 'Target',
          position: { x: 360, y: 100 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: [],
    })
  })
  await expect(button).toHaveText('same renderer update')
  await expect(button).toHaveAttribute('data-identity', 'kept')
  await page.evaluate(() => {
    // SAFETY: The browser test initializes this harness before reading it here.
    const harness = (
      globalThis as typeof globalThis & {
        rendererHarness?: {
          first: { update: (doc: FlowDocumentInput) => void }
        }
      }
    ).rendererHarness

    harness?.first.update({
      nodes: [
        {
          id: 'source',
          label: 'Updated',
          position: { x: 80, y: 100 },
          type: 'alternate',
          data: { text: 'updated' },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'target',
          label: 'Target',
          position: { x: 360, y: 100 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: [],
    })
  })
  await expect(
    page
      .locator('.flow-node[data-node-id="source"] [data-renderer-button]')
      .first()
  ).toHaveText('updated')
  await page.evaluate(() => {
    // SAFETY: The browser test initializes this harness before reading it here.
    const harness = (
      globalThis as typeof globalThis & {
        rendererHarness?: {
          first: { update: (doc: FlowDocumentInput) => void }
        }
      }
    ).rendererHarness

    harness?.first.update({
      nodes: [
        {
          id: 'source',
          label: 'Unknown fallback',
          position: { x: 80, y: 100 },
          type: 'missing',
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'target',
          label: 'Target',
          position: { x: 360, y: 100 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: [],
    })
  })
  await expect(
    page.locator('#app .flow-node[data-node-id="source"]')
  ).toContainText('Unknown fallback')
  await expect(
    page.locator(
      '#app .flow-node[data-node-id="source"] [data-renderer-button]'
    )
  ).toHaveCount(0)
  await expect(page.locator('#second-host .flow-edge-group')).toHaveCount(5)

  const lifecycle = await page.evaluate(() => {
    // SAFETY: The browser test initializes this harness before reading it here.
    const testGlobal = globalThis as typeof globalThis & {
      rendererHarness?: { lifecycle: string[] }
    }

    return testGlobal.rendererHarness?.lifecycle ?? []
  })

  expect(lifecycle.filter((event) => event === 'destroy:custom')).toHaveLength(
    1
  )
  expect(
    lifecycle.filter((event) => event === 'destroy:alternate')
  ).toHaveLength(1)
  expect(lifecycle.filter((event) => event === 'mount:alternate')).toHaveLength(
    1
  )
  await page.evaluate(() => {
    // SAFETY: The browser test initializes this harness before reading it here.
    const harness = (
      globalThis as typeof globalThis & {
        rendererHarness?: {
          first: { destroy: () => void }
          second: { destroy: () => void }
        }
      }
    ).rendererHarness

    harness?.first.destroy()
    harness?.second.destroy()
  })
})

test('real Vanilla output conforms to the shared renderer fixture', async ({
  page,
}) => {
  await reset(page)

  await page.evaluate(async (documentInput) => {
    const modulePath = '/src/public.ts'
    const { mountFlow: browserMountFlow } = await import(modulePath)
    const mountFlow: MountFlow = browserMountFlow
    const host = document.querySelector<HTMLElement>('#app')

    if (host === null) {
      throw new TypeError('Missing shared renderer contract host')
    }

    const controller = mountFlow(host, documentInput, {
      documentMode: 'uncontrolled',
      nodeRenderers: {
        'contract-node': (node, content) => {
          const root = content.parentElement

          if (root === null) {
            throw new TypeError('Missing host-owned renderer root')
          }

          root.style.width = `${String(node.data?.width)}px`
          root.style.height = `${String(node.data?.height)}px`
          const input = document.createElement('input')
          input.type = 'text'
          input.setAttribute('aria-label', `node input ${node.id}`)
          input.value = node.id
          const resize = document.createElement('button')
          resize.type = 'button'
          resize.textContent = 'Resize node'
          content.append(input, resize)

          return {
            update: (nextNode) => {
              input.value = nextNode.id
            },
            destroy: () => content.replaceChildren(),
          }
        },
      },
      edgeRenderers: {
        'contract-edge': {
          geometry: (_edge, endpoints) => ({
            pathData: `M${endpoints.source.x},${endpoints.source.y}L${endpoints.target.x},${endpoints.target.y}`,
            labelAnchor: {
              x: (endpoints.source.x + endpoints.target.x) / 2,
              y: (endpoints.source.y + endpoints.target.y) / 2,
            },
          }),
        },
      },
      viewport: {
        mode: 'uncontrolled',
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
      },
    })

    // SAFETY: The controller is created above and stored only for teardown in this browser test.
    const testGlobal = globalThis as typeof globalThis & {
      rendererFixtureController?: { destroy: () => void }
    }

    testGlobal.rendererFixtureController = controller
  }, rendererContractFixture.document)

  const readObserved = (): Promise<RendererContractObservedOutput> =>
    page.evaluate((documentInput) => {
      const nodeIds = [
        ...document.querySelectorAll<HTMLElement>('.flow-node[data-node-id]'),
      ].flatMap((node) =>
        node.dataset.nodeId === undefined ? [] : [node.dataset.nodeId]
      )

      const handles: RendererContractObservedHandle[] = [
        ...document.querySelectorAll<HTMLElement>(
          '.flow-handle[data-node-id][data-handle-id]'
        ),
      ].map((handle) => {
        const side = (['left', 'right', 'top', 'bottom'] as const).find(
          (candidate) => handle.classList.contains(`flow-handle-${candidate}`)
        )

        if (
          side === undefined ||
          handle.dataset.nodeId === undefined ||
          handle.dataset.handleId === undefined
        ) {
          throw new TypeError(
            'A rendered handle is missing its semantic identity'
          )
        }

        const bounds = handle.getBoundingClientRect()

        return {
          nodeId: handle.dataset.nodeId,
          handleId: handle.dataset.handleId,
          side,
          bounds: {
            left: bounds.left,
            top: bounds.top,
            right: bounds.right,
            bottom: bounds.bottom,
          },
        }
      })

      const markerKinds = new Map<string, string>()

      for (const marker of document.querySelectorAll<SVGMarkerElement>(
        '.flow-edges marker'
      )) {
        const kind = marker.dataset.markerType

        if (kind !== undefined) {
          markerKinds.set(marker.id, kind)
        }
      }

      const edges: RendererContractObservedEdge[] = documentInput.edges.map(
        (edge) => {
          const path = document.querySelector<SVGPathElement>(
            `.flow-edge-path[data-edge-id="${CSS.escape(edge.id)}"]`
          )

          if (path === null) {
            throw new TypeError(`Missing rendered edge path ${edge.id}`)
          }

          const matrix = path.getScreenCTM()

          if (matrix === null) {
            throw new TypeError(`Missing screen transform for edge ${edge.id}`)
          }

          const start = path.getPointAtLength(0).matrixTransform(matrix)

          const end = path
            .getPointAtLength(path.getTotalLength())
            .matrixTransform(matrix)

          return {
            id: edge.id,
            type: edge.type ?? 'default',
            path: edge.path ?? 'straight',
            label:
              document.querySelector<HTMLElement>(
                `.flow-edge-label[data-edge-id="${CSS.escape(edge.id)}"]`
              )?.textContent ?? null,
            markerStart:
              markerKinds.get(
                path
                  .getAttribute('marker-start')
                  ?.match(/^url\(#(?<markerId>[^)]+)\)$/u)?.groups?.markerId ??
                  ''
              ) ?? null,
            markerEnd:
              markerKinds.get(
                path
                  .getAttribute('marker-end')
                  ?.match(/^url\(#(?<markerId>[^)]+)\)$/u)?.groups?.markerId ??
                  ''
              ) ?? null,
            source: edge.source,
            sourceHandle: edge.sourceHandle ?? 'out',
            target: edge.target,
            targetHandle: edge.targetHandle ?? 'in',
            start: { x: start.x, y: start.y },
            end: { x: end.x, y: end.y },
          }
        }
      )

      return { nodeIds, handles, edges }
    }, rendererContractFixture.document)

  await expect
    .poll(() => page.locator('.flow-edge-path').count())
    .toBe(rendererContractFixture.document.edges.length)

  const observed = await readObserved()
  const normalized = normalizeRendererContractOutput(observed)

  const edges = normalized.edges.map(
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
    edges,
    builtInPaths: normalized.builtInPaths,
  }).toStrictEqual(expectedRendererContractSemantics)
  expect(normalized.allEdgesAttachToMeasuredHandles).toBe(true)
  await expect(
    page.locator('.flow-edge-path[data-edge-id="edge-default-path"]')
  ).toHaveAttribute('d', /^M [^A-Z]+L [^A-Z]+$/u)

  await expect(
    page.getByRole('textbox', { name: 'node input source' })
  ).toHaveValue('source')
  await expect(page.getByRole('button', { name: 'Resize node' })).toHaveCount(2)

  await page.evaluate(() => {
    // SAFETY: This controller was initialized by the shared fixture browser test above.
    const testGlobal = globalThis as typeof globalThis & {
      rendererFixtureController?: { destroy: () => void }
    }

    testGlobal.rendererFixtureController?.destroy()
  })
})
