import { decodeFlowDocument } from '@flow/core'
import { FlowCanvas, useFlow } from '@flow/vue'
import type { FlowActions } from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h, shallowRef } from 'vue'

import '@flow/vue/style.css'

export interface ClosingCanvasOptions {
  readonly autoPanOnNodeDrag?: boolean
  readonly autoPanOnSelection?: boolean
  readonly autoPanOnNodeFocus?: boolean
  readonly autoPanSpeed?: number
  readonly disableKeyboardA11y?: boolean
  readonly paneClickDistance?: number
  readonly nodeClickDistance?: number
  readonly nodeDragThreshold?: number
  readonly nodesDraggable?: boolean
  readonly selectionOnDrag?: boolean
  readonly reconnectRadius?: number
  readonly deleteKeyCode?: string | null
  readonly interruptPan?: 'unmount' | 'replace'
}

declare global {
  interface Window {
    __flowVueClosing?: {
      readonly flow: () => FlowActions
      readonly events: () => readonly string[]
      readonly configure: (options: ClosingCanvasOptions) => void
      readonly unmount: () => void
    }
  }
}

export const mountClosingGapsFixture = (
  root: HTMLElement,
  initial: ClosingCanvasOptions
): void => {
  const document = Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'a',
          label: 'Alpha',
          position: { x: 80, y: 100 },
          size: { width: 120, height: 60 },
          selected: true,
          ariaLabel: 'Custom alpha',
          ariaDescription: 'Custom node description',
          ariaRole: 'article',
        },
        {
          id: 'b',
          label: 'Beta',
          position: { x: 350, y: 180 },
          size: { width: 120, height: 60 },
        },
        {
          id: 'offscreen',
          label: 'Offscreen',
          position: { x: 1300, y: 900 },
          size: { width: 120, height: 60 },
        },
      ].map((node) => ({
        ...node,
        style: { boxSizing: 'border-box', minWidth: 0, minHeight: 0 },
        handles: [
          { id: 'in', kind: 'target', side: 'left' },
          { id: 'out', kind: 'source', side: 'right' },
        ],
      })),
      edges: [
        {
          id: 'ab',
          source: 'a',
          sourceHandle: 'out',
          target: 'b',
          targetHandle: 'in',
          selected: true,
          ariaRole: 'link',
        },
      ],
    })
  )

  const options = shallowRef(initial)
  const events: string[] = []
  let flow: FlowActions | undefined

  const Probe = defineComponent({
    setup() {
      flow = useFlow()

      return () => null
    },
  })

  const app = createApp(
    defineComponent({
      setup() {
        return () =>
          h('div', [
            h(
              'button',
              { type: 'button', 'data-testid': 'outside-button' },
              'Outside canvas'
            ),
            h('input', { 'data-testid': 'outside-input' }),
            h(
              FlowCanvas,
              {
                defaultDocument: document,
                ...options.value,
                panOnDrag: false,
                style: { width: '800px', height: '520px', margin: 0 },
                autoPanOnConnect: false,
                connectionLineContainerStyle: { opacity: 0.4 },
                connectionLineStyle: { stroke: '#ff0072' },
                ariaLabelConfig: {
                  'node.a11yDescription.default': 'Selection only',
                  'node.a11yDescription.keyboardDisabled': 'Use arrows to move',
                  'node.a11yDescription.ariaLiveMessage': ({
                    direction,
                    x,
                    y,
                  }) => `${direction}:${x},${y}`,
                },
                onNodeClick: () => events.push('node-click'),
                onPaneClick: () => events.push('pane-click'),
                onNodeDragStop: () => events.push('drag-stop'),
                onMove: () => {
                  events.push('move')

                  if (options.value.interruptPan === 'unmount') {
                    app.unmount()
                  } else if (options.value.interruptPan === 'replace') {
                    const { interruptPan: _interruptPan, ...remaining } =
                      options.value

                    options.value = remaining
                    void flow?.applyEdit({
                      operations: [
                        { kind: 'set-edges', edges: [] },
                        { kind: 'set-nodes', nodes: [] },
                      ],
                    })
                  }
                },
              },
              { default: () => h(Probe) }
            ),
          ])
      },
    })
  )

  app.mount(root)
  window.__flowVueClosing = {
    flow: () => {
      if (flow === undefined) {
        throw new Error('Missing closing fixture flow')
      }

      return flow
    },
    events: () => [...events],
    configure: (next) => {
      options.value = next
    },
    unmount: () => app.unmount(),
  }
}
