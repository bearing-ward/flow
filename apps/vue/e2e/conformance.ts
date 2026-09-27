import type { Page } from '@playwright/test'

import type {
  ConformanceAction,
  ConformanceAdapter,
  ConformanceSnapshot,
  PublicStateChange,
  PublicStateQuery,
  PublicStateRead,
} from '../../../packages/conformance/src/index.ts'

export const createVueConformanceAdapter = (
  page: Page
): ConformanceAdapter => ({
  async mount(fixture) {
    await page.goto('/test.html')
    await page.evaluate(async (scenario) => {
      const harnessPath = '/src/test-harness.ts'
      await import(harnessPath)
      window.__flowVueTest?.mount(scenario)
    }, fixture)
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
        ...document.querySelectorAll<HTMLElement>("[data-testid='flow-edge']"),
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
          node.dataset.identity === undefined ? [] : [node.dataset.nodeId ?? '']
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
})
