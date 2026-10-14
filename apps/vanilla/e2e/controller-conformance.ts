import type { FlowChange, FlowConnection, FlowStateChange } from '@flow/core'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

import type {
  ConformanceAction,
  ConformanceAdapter,
  ConformanceDocument,
  ConformanceFixture,
  ConformanceSnapshot,
  MeasuredGeometryAdapter,
  PublicStateChange,
  PublicStateQuery,
  PublicStateRead,
} from '../../../packages/conformance/src/index.ts'

const documentWith = (
  nodes: readonly {
    readonly id: string
    readonly x: number
    readonly y: number
    readonly label: string
  }[]
) => ({
  edges: [],
  nodes: nodes.map((node) => ({
    id: node.id,
    position: { x: node.x, y: node.y },
    label: node.label,
  })),
})

export const mountControllerScenario = async (
  page: Page,
  mode: 'controlled' | 'uncontrolled',
  viewportMode: 'controlled' | 'uncontrolled' = mode
): Promise<void> => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(
    async ({
      initial,
      mode: selectedMode,
      viewportMode: selectedViewportMode,
    }) => {
      const modulePath = '/src/public.ts'
      const { mountFlow } = await import(modulePath)
      const root = globalThis.document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing conformance host')
      }

      const controller = mountFlow(root, initial, {
        documentMode: selectedMode,
        viewport: {
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { maxZoom: 2, minZoom: 0.5 },
          mode: selectedViewportMode,
        },
      })

      globalThis.flowChanges = []
      controller.subscribe((change: FlowChange) =>
        globalThis.flowChanges?.push(change)
      )
      globalThis.flowController = controller
    },
    {
      initial: documentWith([
        { id: 'first', label: 'First', x: 40, y: 50 },
        { id: 'second', label: 'Second', x: 260, y: 90 },
      ]),
      mode,
      viewportMode,
    }
  )
}

export const updateScenario = async (
  page: Page,
  nodes: readonly {
    readonly id: string
    readonly x: number
    readonly y: number
    readonly label: string
  }[]
): Promise<void> => {
  await page.evaluate((next) => {
    const controller = globalThis.flowController

    if (controller === undefined) {
      throw new Error('Missing conformance controller')
    }

    controller.update(next)
  }, documentWith(nodes))
}

export const assertTwoNodeControllerConformance = async (
  page: Page
): Promise<void> => {
  await expect(page.getByTestId('flow-node')).toHaveCount(2)
  await expect(page.locator('[data-node-id="first"]')).toHaveAttribute(
    'data-measured-width',
    '150'
  )
  await expect(page.locator('[data-node-id="second"]')).toHaveAttribute(
    'data-measured-width',
    '150'
  )

  await page.locator('[data-node-id="first"]').evaluate((element) => {
    element.dataset.identity = 'preserved'
  })
  await updateScenario(page, [
    { id: 'third', label: 'Third', x: 420, y: 150 },
    { id: 'first', label: 'First updated', x: 70, y: 65 },
  ])

  await expect(page.getByTestId('flow-node')).toHaveCount(2)
  await expect(page.locator('[data-node-id="second"]')).toHaveCount(0)
  await expect(page.locator('[data-node-id="first"]')).toHaveAttribute(
    'data-identity',
    'preserved'
  )
  await expect(page.locator('[data-node-id="first"]')).toHaveText(
    'First updated'
  )
  await expect(page.locator('[data-node-id="first"]')).toHaveCSS(
    'transform',
    'matrix(1, 0, 0, 1, 70, 65)'
  )
  await expect(page.getByTestId('flow-node').nth(0)).toHaveAttribute(
    'data-node-id',
    'third'
  )
  await expect(page.getByTestId('flow-node').nth(1)).toHaveAttribute(
    'data-node-id',
    'first'
  )
}

export const createVanillaConformanceAdapter = (
  page: Page
): ConformanceAdapter & MeasuredGeometryAdapter => {
  let measurementDocument: ConformanceDocument | undefined

  return {
    async mount(fixture: ConformanceFixture): Promise<void> {
      await page.goto('/')
      await page.evaluate(() =>
        globalThis.dispatchEvent(new Event('beforeunload'))
      )
      await page.evaluate(async (scenario) => {
        const modulePath = '/src/public.ts'
        const { mountFlow } = await import(modulePath)
        const root = document.querySelector<HTMLElement>('#app')

        if (root === null) {
          throw new Error('Missing conformance host')
        }

        const allowedTargets = scenario.allowedConnectionTargets

        // SAFETY: The public schema decoder validates this raw document or options value before use in the test.
        const controller = mountFlow(root, scenario.document, {
          documentMode: scenario.documentMode,
          renderOnlyVisible: scenario.renderOnlyVisible,
          isValidConnection:
            allowedTargets === undefined
              ? undefined
              : (candidate: FlowConnection) =>
                  allowedTargets.includes(candidate.target),
          viewport: {
            initial: { x: 0, y: 0, zoom: 1 },
            limits: { maxZoom: 2, minZoom: 0.5 },
            mode: scenario.viewportMode,
          },
        })

        // SAFETY: This intersection adds only optional test-hook fields; reads are guarded or follow assignment in this test.
        const state = globalThis as typeof globalThis & {
          __conformanceChangeCount?: number
          __conformanceUnsubscribe?: () => void
          __conformanceAcceptedStates?: unknown[]
        }

        globalThis.flowChanges = []
        state.__conformanceAcceptedStates = []
        state.__conformanceChangeCount = 0
        state.__conformanceUnsubscribe = controller.subscribe(
          (change: FlowChange) => {
            globalThis.flowChanges?.push(change)
            state.__conformanceChangeCount =
              (state.__conformanceChangeCount ?? 0) + 1
          }
        )
        controller.subscribeState((change: FlowStateChange) => {
          state.__conformanceAcceptedStates?.push(change)
        })
        globalThis.flowController = controller
      }, fixture)
    },
    async mountMeasurementDocument(document, renderOnlyVisible) {
      measurementDocument = document
      await page.goto('/')
      await page.evaluate(() =>
        globalThis.dispatchEvent(new Event('beforeunload'))
      )
      await page.evaluate(
        async ({ nextDocument, cull }) => {
          const modulePath = '/src/public.ts'
          const { mountFlow } = await import(modulePath)
          const root = globalThis.document.querySelector<HTMLElement>('#app')

          if (root === null) {
            throw new Error('Missing measurement conformance host')
          }

          const controller = mountFlow(root, nextDocument, {
            documentMode: 'uncontrolled',
            renderOnlyVisible: cull,
            viewport: {
              initial: { x: 0, y: 0, zoom: 1 },
              limits: { maxZoom: 2, minZoom: 0.5 },
              mode: 'uncontrolled',
            },
          })

          globalThis.flowController = controller
        },
        { nextDocument: document, cull: renderOnlyVisible }
      )
      await page.waitForTimeout(50)
    },
    async updateMeasurementDocument(document) {
      measurementDocument = document
      await page.evaluate((nextDocument) => {
        const controller = globalThis.flowController

        if (controller === undefined) {
          throw new Error('Missing measurement conformance controller')
        }

        controller.update(nextDocument)
      }, document)
      await page.waitForTimeout(50)
    },
    internalNode(nodeId) {
      return page.evaluate((id) => {
        const node = globalThis.flowController?.getInternalNode(id)

        return node === undefined ? null : node
      }, nodeId)
    },
    nodesInitialized(includeHidden) {
      return page.evaluate(
        (include) =>
          globalThis.flowController?.nodesInitialized({
            includeHidden: include,
          }) ?? false,
        includeHidden
      )
    },
    async renderedNodeExists(nodeId) {
      return (await page.locator(`[data-node-id="${nodeId}"]`).count()) > 0
    },
    async resizeAndRefresh(nodeId, size) {
      await page
        .locator(`[data-node-id="${nodeId}"]`)
        .evaluate((element, nextSize) => {
          if (!(element instanceof HTMLElement)) {
            throw new Error('Expected measured node element')
          }

          element.style.boxSizing = 'border-box'
          element.style.minWidth = '0'
          element.style.minHeight = '0'
          element.style.padding = '0'
          element.style.border = '0'
          element.style.width = `${nextSize.width}px`
          element.style.height = `${nextSize.height}px`
        }, size)

      const results = await page.evaluate((id) => {
        const controller = globalThis.flowController

        if (controller === undefined) {
          throw new Error('Missing measurement conformance controller')
        }

        return controller.updateNodeInternals([id])
      }, nodeId)

      const internal = await this.internalNode(nodeId)

      return {
        status: results[0]?.status ?? 'missing',
        width: internal?.width ?? null,
        height: internal?.height ?? null,
      }
    },
    async removeAndReadd(nodeId) {
      const current = measurementDocument

      if (current === undefined) {
        throw new Error('Missing active measurement document')
      }

      await this.updateMeasurementDocument({
        ...current,
        nodes: current.nodes.filter(({ id }) => id !== nodeId),
      })
      await this.updateMeasurementDocument(current)
    },
    async destroyMeasurementDocument() {
      await page.evaluate(() => {
        globalThis.flowController?.destroy()
        globalThis.flowController = undefined
      })
      measurementDocument = undefined
    },
    async perform(action: ConformanceAction): Promise<void> {
      if (action.kind === 'update-document') {
        await page.evaluate((document) => {
          if (globalThis.flowController === undefined) {
            throw new Error('Missing conformance controller')
          }

          // SAFETY: The public schema decoder validates this raw document or options value before use in the test.
          globalThis.flowController.update(document)
        }, action.document)

        return
      }

      if (action.kind === 'update-viewport') {
        await page.evaluate((viewport) => {
          if (globalThis.flowController === undefined) {
            throw new Error('Missing conformance controller')
          }

          globalThis.flowController.updateViewport(viewport)
        }, action.viewport)

        return
      }

      if (action.kind === 'drag-node') {
        const node = page.locator(`[data-node-id="${action.nodeId}"]`)
        const box = await node.boundingBox()

        if (box === null) {
          throw new Error(`Missing node ${action.nodeId}`)
        }

        const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
        await page.mouse.move(start.x, start.y)
        await page.mouse.down()
        await page.mouse.move(start.x + action.dx, start.y + action.dy, {
          steps: 4,
        })

        if (action.cancel === true) {
          await page
            .getByTestId('flow-canvas')
            .evaluate((canvas) =>
              canvas.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
              )
            )
        }

        await page.mouse.up()

        return
      }

      const source = page.locator(
        `[data-node-id="${action.sourceNodeId}"] [data-handle-id="${action.sourceHandleId}"]`
      )

      const target = page.locator(
        `[data-node-id="${action.targetNodeId}"] [data-handle-id="${action.targetHandleId}"]`
      )

      const sourceBox = await source.boundingBox()
      const targetBox = await target.boundingBox()

      if (sourceBox === null || targetBox === null) {
        throw new Error('Missing connection handle')
      }

      await page.mouse.move(
        sourceBox.x + sourceBox.width / 2,
        sourceBox.y + sourceBox.height / 2
      )
      await page.mouse.down()
      await page.mouse.move(
        targetBox.x + targetBox.width / 2,
        targetBox.y + targetBox.height / 2,
        { steps: 5 }
      )
      await page.mouse.up()
    },
    snapshot(): Promise<ConformanceSnapshot> {
      return page.evaluate(() => {
        const nodes = [
          ...document.querySelectorAll<HTMLElement>('.flow-node[data-node-id]'),
        ]

        const edges = [
          ...document.querySelectorAll<HTMLElement>('[data-edge-id]'),
        ]

        return {
          nodeIds: nodes.map((node) => node.dataset.nodeId ?? ''),
          edgeIds: [...new Set(edges.map((edge) => edge.dataset.edgeId ?? ''))],
          positions: nodes.map((node) => {
            const matrix = new DOMMatrixReadOnly(
              getComputedStyle(node).transform
            )

            return {
              id: node.dataset.nodeId ?? '',
              x: matrix.m41,
              y: matrix.m42,
            }
          }),
          identityMarkers: nodes.flatMap((node) =>
            node.dataset.identity === 'preserved'
              ? [node.dataset.nodeId ?? '']
              : []
          ),
        }
      })
    },
    async markIdentity(nodeId: string, marker: string): Promise<void> {
      await page
        .locator(`[data-node-id="${nodeId}"]`)
        .evaluate((node, value) => {
          if (!(node instanceof HTMLElement)) {
            throw new Error('Expected an HTML flow node')
          }

          node.dataset.identity = value
        }, marker)
    },
    changeKinds(): Promise<readonly string[]> {
      return page.evaluate(() =>
        (globalThis.flowChanges ?? []).map((change) => change.kind)
      )
    },
    readState(query: PublicStateQuery): Promise<PublicStateRead> {
      return page.evaluate(({ nodeId, edgeId }) => {
        const controller = globalThis.flowController

        if (controller === undefined) {
          throw new Error('Missing conformance controller')
        }

        // `measured` is the transient DOM read model (Plan 115); the shared
        // fixtures compare the stored node, so the read drops it.
        const stored = (() => {
          const node =
            nodeId === undefined ? undefined : controller.getNode(nodeId)

          if (node === undefined) {
            return null
          }

          const { measured: _measured, ...rest } = node

          return rest
        })()

        return {
          snapshot: controller.getSnapshot(),
          node: stored,
          edge:
            edgeId === undefined ? null : (controller.getEdge(edgeId) ?? null),
        }
      }, query)
    },
    acceptedStates(): Promise<readonly PublicStateChange[]> {
      return page.evaluate(() => {
        // SAFETY: This intersection adds only a test observation populated during adapter mount.
        const state = globalThis as typeof globalThis & {
          __conformanceAcceptedStates?: PublicStateChange[]
        }

        return state.__conformanceAcceptedStates ?? []
      })
    },
    destroy(): Promise<{
      readonly mountedElements: number
      readonly changesAfterDestroy: number
      readonly acceptedStatesAfterDestroy: number
    }> {
      return page.evaluate(() => {
        // SAFETY: This intersection adds only optional test-hook fields; reads are guarded or follow assignment in this test.
        const state = globalThis as typeof globalThis & {
          __conformanceChangeCount?: number
          __conformanceAcceptedStates?: unknown[]
        }

        const root = document.querySelector<HTMLElement>('#app')

        const canvas = root?.querySelector<HTMLElement>(
          "[data-testid='flow-canvas']"
        )

        const before = state.__conformanceChangeCount ?? 0
        const acceptedBefore = state.__conformanceAcceptedStates?.length ?? 0
        globalThis.flowController?.destroy()
        canvas?.dispatchEvent(
          new PointerEvent('pointerdown', {
            bubbles: true,
            pointerId: 991,
            clientX: 10,
            clientY: 10,
          })
        )
        canvas?.dispatchEvent(
          new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 10 })
        )

        const changesAfterDestroy =
          (state.__conformanceChangeCount ?? 0) - before

        globalThis.__conformanceUnsubscribe?.()

        return {
          mountedElements:
            root?.querySelectorAll("[data-testid='flow-canvas']").length ?? 0,
          changesAfterDestroy,
          acceptedStatesAfterDestroy:
            (state.__conformanceAcceptedStates?.length ?? 0) - acceptedBefore,
        }
      })
    },
  }
}
