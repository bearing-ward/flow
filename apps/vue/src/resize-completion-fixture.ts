import { decodeFlowDocument } from '@flow/core'
import type {
  FlowDocument,
  FlowChange,
  FlowResizeParamsWithDirection,
  NodeChange,
} from '@flow/core'
import { FlowCanvas, FlowNodeResizer, useFlow } from '@flow/vue'
import type { FlowActions } from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h, shallowRef } from 'vue'

import type { ResizeCompletionFixture } from '../../shared-e2e/resize-completion-fixture.ts'

import '@flow/vue/style.css'
import './style.css'

export const mountResizeCompletion = (
  root: HTMLElement,
  mode: 'controlled' | 'uncontrolled',
  throwEnd = false
): void => {
  const initial = Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'r',
          type: 'resizable',
          label: 'Resize',
          position: { x: 100, y: 100 },
          size: { width: 150, height: 80 },
        },
      ],
      edges: [],
    })
  )

  const owned = shallowRef(initial)
  const changes: (readonly NodeChange[])[] = []
  let geometryChangeCount = 0
  let endCount = 0
  let callbackFailures = 0
  let flow: FlowActions | undefined

  const Probe = defineComponent({
    setup() {
      flow = useFlow()

      return () => null
    },
  })

  const Resizable = defineComponent({
    inheritAttrs: false,
    setup() {
      return () =>
        h(FlowNodeResizer, {
          shouldResize: (params: FlowResizeParamsWithDirection) =>
            params.width <= 180,
          onResizeEnd: () => {
            endCount += 1

            if (throwEnd) {
              throw new Error('Fixture resize end failure')
            }
          },
        })
    },
  })

  const app = createApp({
    render: () =>
      h(
        FlowCanvas,
        {
          ...(mode === 'controlled'
            ? {
                document: owned.value,
                documentMode: mode,
                'onUpdate:document': (next: FlowDocument) => {
                  owned.value = next
                },
              }
            : { defaultDocument: initial }),
          defaultViewport: { x: 0, y: 0, zoom: 1 },
          nodeTypes: { resizable: Resizable },
          onNodesChange: (next: readonly NodeChange[]) => changes.push(next),
          onChange: (change: FlowChange) => {
            if (
              change.kind === 'node-bounds' ||
              change.kind === 'edit-proposal'
            ) {
              geometryChangeCount += 1
            }
          },
        },
        { default: () => h(Probe) }
      ),
  })

  root.style.width = '800px'
  root.style.height = '500px'
  app.config.errorHandler = (error) => {
    if (
      !(error instanceof Error) ||
      error.message !== 'Fixture resize end failure'
    ) {
      throw error
    }

    callbackFailures += 1
  }

  app.mount(root)
  window.__resizeCompletion = {
    changes: () => changes,
    clear: () => {
      changes.length = 0
    },
    bounds: () => {
      const node = flow?.getNode('r')

      return node?.size === undefined
        ? null
        : { ...node.position, ...node.size }
    },
    callbackFailures: () => callbackFailures,
    geometryChangeCount: () => geometryChangeCount,
    endCount: () => endCount,
    remove: () => {
      flow?.setNodes([])
    },
    unmount: () => app.unmount(),
  } satisfies ResizeCompletionFixture
}
