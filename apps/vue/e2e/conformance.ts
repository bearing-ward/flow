import type { Page } from '@playwright/test'

import type {
  ConformanceAction,
  ConformanceAdapter,
  ConformanceDocument,
  ConformanceSnapshot,
  MeasuredGeometryAdapter,
  PublicStateChange,
  PublicStateQuery,
  PublicStateRead,
} from '../../../packages/conformance/src/index.ts'

export const createVueConformanceAdapter = (
  page: Page
): ConformanceAdapter & MeasuredGeometryAdapter => {
  let measurementDocument: ConformanceDocument | undefined

  return {
    async mount(fixture) {
      await page.goto('/test.html')
      await page.evaluate(async (scenario) => {
        const harnessPath = '/src/test-harness.ts'
        await import(harnessPath)
        window.__flowVueTest?.mount(scenario)
      }, fixture)
    },
    async mountMeasurementDocument(document, renderOnlyVisible) {
      await page.goto('/test.html')
      await page.evaluate(async () => {
        const harnessPath = '/src/test-harness.ts'
        await import(harnessPath)
      })
      measurementDocument = document
      await page.evaluate(
        async ({ nextDocument, cull }) => {
          await window.__flowVueTest?.mountMeasurementDocument(
            nextDocument,
            cull
          )
        },
        { nextDocument: document, cull: renderOnlyVisible }
      )
      await page.waitForTimeout(50)
    },
    async updateMeasurementDocument(document) {
      measurementDocument = document
      await page.evaluate(
        (nextDocument) =>
          window.__flowVueTest?.updateMeasurementDocument(nextDocument),
        document
      )
    },
    internalNode(nodeId) {
      return page.evaluate(
        (id) => window.__flowVueTest?.internalNode(id) ?? null,
        nodeId
      )
    },
    nodesInitialized(includeHidden) {
      return page.evaluate(
        (include) => window.__flowVueTest?.nodesInitialized(include) ?? false,
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
            throw new Error('Expected measured Vue node element')
          }

          element.style.boxSizing = 'border-box'
          element.style.minWidth = '0'
          element.style.minHeight = '0'
          element.style.padding = '0'
          element.style.border = '0'
          element.style.width = `${nextSize.width}px`
          element.style.height = `${nextSize.height}px`
        }, size)

      const status = await page.evaluate(
        (id) => window.__flowVueTest?.refreshNode(id),
        nodeId
      )

      const internal = await this.internalNode(nodeId)

      return {
        status: status?.status ?? 'missing',
        width: internal?.width ?? null,
        height: internal?.height ?? null,
      }
    },
    async removeAndReadd(nodeId) {
      if (measurementDocument === undefined) {
        throw new Error('Missing active Vue measurement document')
      }

      const document = measurementDocument
      await this.updateMeasurementDocument({
        ...document,
        nodes: document.nodes.filter(({ id }) => id !== nodeId),
      })
      await this.updateMeasurementDocument(document)
    },
    async destroyMeasurementDocument() {
      await page.evaluate(() =>
        window.__flowVueTest?.destroyMeasurementDocument()
      )
      measurementDocument = undefined
    },
    async perform(action: ConformanceAction) {
      if (action.kind === 'update-document') {
        await page.evaluate(
          (next) => window.__flowVueTest?.updateDocument(next),
          action.document
        )

        return
      }

      if (action.kind === 'update-viewport') {
        await page.evaluate(
          (next) => window.__flowVueTest?.updateViewport(next),
          action.viewport
        )

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
          ...document.querySelectorAll<HTMLElement>(
            '.flow-vue-node[data-node-id]'
          ),
        ]

        const edges = [
          ...document.querySelectorAll<HTMLElement>(
            "[data-testid='flow-edge']"
          ),
        ]

        return {
          nodeIds: nodes.map((node) => node.dataset.nodeId ?? ''),
          edgeIds: edges.map((edge) => edge.dataset.edgeId ?? ''),
          positions: nodes.map((node) => ({
            id: node.dataset.nodeId ?? '',
            x: Number(node.style.left.replace('px', '')),
            y: Number(node.style.top.replace('px', '')),
          })),
          identityMarkers: nodes.flatMap((node) =>
            node.dataset.identity === undefined
              ? []
              : [node.dataset.nodeId ?? '']
          ),
        }
      })
    },
    async markIdentity(nodeId, marker) {
      await page
        .locator(`[data-node-id="${nodeId}"]`)
        .evaluate((element: HTMLElement, value) => {
          element.dataset.identity = value
        }, marker)
    },
    changeKinds() {
      return page.evaluate(() => window.__flowVueTest?.changeKinds() ?? [])
    },
    readState(query: PublicStateQuery): Promise<PublicStateRead> {
      return page.evaluate((selectedQuery) => {
        const state = window.__flowVueTest

        if (state === undefined) {
          throw new Error('Missing Vue conformance host')
        }

        return state.readState(selectedQuery)
      }, query)
    },
    acceptedStates(): Promise<readonly PublicStateChange[]> {
      return page.evaluate(() => window.__flowVueTest?.acceptedStates() ?? [])
    },
    destroy() {
      return page.evaluate(
        () =>
          window.__flowVueTest?.destroy() ?? {
            mountedElements: -1,
            changesAfterDestroy: -1,
            acceptedStatesAfterDestroy: -1,
          }
      )
    },
  }
}
