import {
  decodeFlowDocument,
  FlowEditErrorSchema,
  fitViewportToNodes,
  getIncomers,
  getOutgoers,
} from '@flow/core'
import type {
  FlowConnection,
  FlowChange,
  FlowDocument,
  FlowEdge,
  FlowNode,
  Viewport,
} from '@flow/core'
import { FlowCanvas, FlowTooltip, useFlow } from '@flow/vue'
import { Effect, Schema } from 'effect'
import { createApp, defineComponent, h, ref } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'
import './style.css'

const initial = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'input',
        type: 'gesture-input',
        label: 'Input · drag me',
        position: { x: 110, y: 120 },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'transform',
        label: 'Transform',
        position: { x: 390, y: 40 },
        size: { width: 210, height: 70 },
        handles: [
          { id: 'in', kind: 'target', side: 'left' },
          { id: 'out', kind: 'source', side: 'right' },
        ],
      },
      {
        id: 'validate',
        label: 'Validate',
        position: { x: 390, y: 230 },
        handles: [
          { id: 'in', kind: 'target', side: 'left' },
          { id: 'out', kind: 'source', side: 'right' },
        ],
      },
      {
        id: 'output',
        label: 'Output',
        position: { x: 710, y: 135 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
      {
        id: 'remote-a',
        label: 'Remote input',
        position: { x: 110, y: 120 },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'remote-b',
        label: 'Remote output',
        position: { x: 390, y: 120 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
    edges: [
      {
        id: 'straight',
        source: 'input',
        target: 'transform',
        path: 'straight',
        stroke: '#2563eb',
      },
      { id: 'bezier', source: 'input', target: 'validate', path: 'bezier' },
      {
        id: 'smooth',
        source: 'validate',
        target: 'output',
        path: 'smoothstep',
      },
      {
        id: 'hidden',
        source: 'transform',
        target: 'validate',
        path: 'step',
        hidden: true,
        stroke: '#ea580c',
      },
    ],
  })
)

const remote = Effect.runSync(
  decodeFlowDocument({
    nodes: initial.nodes.filter((node) => node.id.startsWith('remote-')),
    edges: [
      { id: 'remote', source: 'remote-a', target: 'remote-b', path: 'step' },
    ],
  })
)

const main = Effect.runSync(
  decodeFlowDocument({
    nodes: initial.nodes.filter((node) => !node.id.startsWith('remote-')),
    edges: initial.edges,
  })
)

const rendererScene = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'renderer-card',
        type: 'renderer-card',
        label: 'Custom renderer',
        position: { x: 100, y: 130 },
        size: { width: 230, height: 120 },
        handles: [
          { id: 'out-right', kind: 'source', side: 'right' },
          { id: 'out-bottom', kind: 'source', side: 'bottom' },
          { id: 'in-left', kind: 'target', side: 'left' },
          { id: 'in-top', kind: 'target', side: 'top' },
        ],
      },
      {
        id: 'renderer-result',
        label: 'Result',
        position: { x: 610, y: 185 },
        size: { width: 180, height: 80 },
        handles: [{ id: 'in-left', kind: 'target', side: 'left' }],
      },
    ],
    edges: [
      {
        id: 'renderer-straight',
        source: 'renderer-card',
        sourceHandle: 'out-right',
        target: 'renderer-result',
        targetHandle: 'in-left',
        path: 'straight',
        markerEnd: 'arrow',
        label: 'Straight',
      },
      ...(['bezier', 'simplebezier', 'step', 'smoothstep'] as const).map(
        (path) => ({
          id: `renderer-${path}`,
          source: 'renderer-card',
          sourceHandle: 'out-bottom',
          target: 'renderer-result',
          targetHandle: 'in-left',
          path,
          label: path,
        })
      ),
      {
        id: 'renderer-custom-edge',
        type: 'renderer-custom-edge',
        source: 'renderer-card',
        sourceHandle: 'out-right',
        target: 'renderer-result',
        targetHandle: 'in-left',
        path: 'bezier',
        markerEnd: 'arrowclosed',
        label: 'Registered custom edge',
      },
    ],
  })
)

const viewportScene = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'viewport-selected',
        label: 'Selected · 260 × 124',
        selected: true,
        size: { width: 260, height: 124 },
        position: { x: 90, y: 72 },
      },
      {
        id: 'viewport-peer',
        label: 'Peer · 190 × 88',
        size: { width: 190, height: 88 },
        position: { x: 570, y: 278 },
      },
    ],
    edges: [
      {
        id: 'viewport-link',
        source: 'viewport-selected',
        target: 'viewport-peer',
        path: 'bezier',
      },
    ],
  })
)

const RendererNode = defineComponent({
  // SAFETY: FlowCanvas renders schema-decoded FlowNode values.
  props: { node: { type: Object as PropType<FlowNode>, required: true } },
  setup(props) {
    return () =>
      h('section', { class: 'flow-vue-renderer-node' }, [
        h('strong', props.node.label),
        h('p', 'Typed node renderer with four directional handles.'),
      ])
  },
})

const RendererEdge = defineComponent({
  props: {
    // SAFETY: FlowCanvas renders schema-decoded FlowEdge values.
    edge: { type: Object as PropType<FlowEdge>, required: true },
    path: { type: String, required: true },
    markerStart: { type: String, default: undefined },
    markerEnd: { type: String, default: undefined },
  },
  setup(props) {
    return () =>
      h('path', {
        class: 'flow-vue-edge-path flow-vue-renderer-custom-edge',
        'data-testid': 'flow-edge-path',
        d: props.path,
        fill: 'none',
        stroke: props.edge.stroke ?? '#7c3aed',
        'stroke-width': props.edge.strokeWidth ?? 2,
        'marker-start': props.markerStart,
        'marker-end': props.markerEnd,
      })
  },
})

const TooltipNode = defineComponent({
  // SAFETY: FlowCanvas passes schema-decoded FlowNode values to registered node renderers.
  props: { node: { type: Object as PropType<FlowNode>, required: true } },
  setup(props) {
    return () =>
      h('section', { class: 'flow-vue-tooltip-node' }, [
        h('strong', props.node.label),
        h('p', 'Hover or focus the help button for a description.'),
        h(
          FlowTooltip,
          { text: 'This status is owned by the application.' },
          {
            default: () =>
              h(
                'button',
                {
                  type: 'button',
                  'aria-describedby':
                    'application-status-note application-status-note',
                },
                'Status help'
              ),
          }
        ),
        h(
          'span',
          {
            id: 'application-status-note',
            class: 'flow-vue-visually-hidden',
          },
          'Application status details.'
        ),
        h(
          FlowTooltip,
          { text: 'This region is part of the example graph.' },
          {
            default: () => h('button', { type: 'button' }, 'Region help'),
          }
        ),
      ])
  },
})

const TooltipRecipe = defineComponent({
  setup() {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'tooltip-example',
            type: 'tooltip-example',
            label: 'Application status',
            position: { x: 260, y: 170 },
            size: { width: 280, height: 150 },
          },
        ],
        edges: [],
      })
    )

    return () =>
      h('main', { class: 'flow-vue-tooltip-recipe' }, [
        h('header', [
          h('h1', 'Tooltip recipe'),
          h('p', 'A compact tooltip stays connected to its trigger.'),
        ]),
        h(FlowCanvas, {
          document,
          documentMode: 'uncontrolled',
          nodeTypes: { 'tooltip-example': TooltipNode },
        }),
      ])
  },
})

const GestureInputNode = defineComponent({
  // SAFETY: FlowCanvas only renders schema-decoded FlowNode values.
  props: { node: { type: Object as PropType<FlowNode>, required: true } },
  setup(props) {
    const flow = useFlow()

    return () =>
      h('div', { class: 'flow-vue-gesture-node' }, [
        h('span', { class: 'flow-vue-node-label' }, props.node.label),
        h(
          'span',
          {
            class: 'flow-vue-demo-drag-handle',
            'data-testid': 'demo-drag-handle',
            'data-flow-drag-handle': '',
            role: 'button',
            tabindex: 0,
            'aria-label': 'Move Input with arrow keys or drag this handle',
            onKeydown: (event: KeyboardEvent) => {
              let delta: { readonly x: number; readonly y: number } | undefined

              switch (event.key) {
                case 'ArrowLeft': {
                  delta = { x: -5, y: 0 }
                  break
                }

                case 'ArrowRight': {
                  delta = { x: 5, y: 0 }
                  break
                }

                case 'ArrowUp': {
                  delta = { x: 0, y: -5 }
                  break
                }

                case 'ArrowDown': {
                  delta = { x: 0, y: 5 }
                  break
                }

                default: {
                  return
                }
              }

              if (delta === undefined) {
                return
              }

              event.preventDefault()
              event.stopPropagation()

              const current = flow.getNode(props.node.id)

              if (current !== undefined) {
                void flow.updateNode(props.node.id, {
                  position: {
                    x: current.position.x + delta.x,
                    y: current.position.y + delta.y,
                  },
                })
              }
            },
          },
          'Move'
        ),
      ])
  },
})

const StateTools = defineComponent({
  setup() {
    const flow = useFlow()
    const label = ref('Validate')
    const message = ref('')
    const measurementMessage = ref('')
    const saved = ref<unknown>()

    const removeAddedNode = async (): Promise<void> => {
      const result = await flow.deleteElements({
        nodeIds: ['public-edit-node'],
      })

      message.value = `Removed ${result.deletedNodeIds.join(', ')}`
    }

    const addProtectedNode = async (): Promise<void> => {
      await flow.addNodes({
        id: 'protected-node',
        label: 'Protected',
        position: { x: 560, y: 300 },
        deletable: false,
      })
      message.value = 'Added protected node'
    }

    const tryProtectedDelete = async (): Promise<void> => {
      try {
        await flow.deleteElements({ nodeIds: ['protected-node'] })
        message.value = 'Protected delete unexpectedly succeeded'
      } catch (error) {
        message.value =
          Schema.decodeUnknownSync(FlowEditErrorSchema)(error)._tag
      }
    }

    const toggleMeasuredSize = async (): Promise<void> => {
      const current = flow.getNode('validate')
      const width = current?.size?.width === 260 ? 180 : 260
      await flow.updateNode('validate', { size: { width, height: 86 } })
    }

    const refreshMeasuredGeometry = async (): Promise<void> => {
      const results = await flow.updateNodeInternals(['validate'])
      const internal = flow.getInternalNode('validate')
      measurementMessage.value = JSON.stringify({
        results,
        width: internal?.width,
        height: internal?.height,
        status: internal?.measurementStatus,
      })
    }

    const reconnectMiddle = async (): Promise<void> => {
      const snapshot = flow.getSnapshot()

      const middle = snapshot.document.nodes.find(
        (node) => node.id === 'transform'
      )

      if (middle === undefined) {
        message.value = 'Middle node is already removed; reset to try again'

        return
      }

      const incoming = getIncomers(
        middle,
        snapshot.document.nodes,
        snapshot.document.edges
      )

      const outgoing = getOutgoers(
        middle,
        snapshot.document.nodes,
        snapshot.document.edges
      )

      const edges = incoming.flatMap((source) =>
        outgoing.map((target) => ({
          id: `reconnected-${source.id}-${target.id}`,
          source: source.id,
          target: target.id,
          path: 'bezier' as const,
        }))
      )

      await flow.applyEdit({
        operations: [
          { kind: 'delete-elements', nodeIds: [middle.id] },
          { kind: 'add-edges', edges },
        ],
      })
      message.value = `Removed ${middle.id}; connected ${incoming.map(({ id }) => id).join(', ')} to ${outgoing.map(({ id }) => id).join(', ')}`
    }

    return () =>
      h(
        'section',
        {
          class: 'flow-state-tools',
          onPointerdown: (event: PointerEvent) => event.stopPropagation(),
        },
        [
          h('h2', 'State and persistence'),
          h('button', { onClick: toggleMeasuredSize }, 'Toggle measured size'),
          h(
            'button',
            { onClick: refreshMeasuredGeometry },
            'Refresh node internals'
          ),
          h(
            'output',
            { 'data-testid': 'measurement-result' },
            measurementMessage.value
          ),
          h('label', [
            'Node label ',
            h('input', {
              'aria-label': 'Node label',
              value: label.value,
              onInput: (event: Event) => {
                label.value =
                  event.target instanceof HTMLInputElement
                    ? event.target.value
                    : label.value
              },
            }),
          ]),
          h(
            'button',
            {
              onClick: () => {
                void flow.updateNode('validate', { label: label.value })
                message.value = `Updated Validate to ${label.value}`
              },
            },
            'Update label'
          ),
          h(
            'button',
            {
              onClick: async () => {
                await flow.updateNodeData('public-edit-node', {
                  editedInPlayground: true,
                })
                message.value = `Updated public-edit-node data; ${JSON.stringify(flow.getNode('public-edit-node')?.data)}`
              },
            },
            'Update node data'
          ),
          h(
            'button',
            {
              onClick: () => {
                const nextHidden = flow.getNode('validate')?.hidden !== true
                void flow.updateNode('validate', { hidden: nextHidden })
                message.value = `Validate hidden=${String(nextHidden)}`
              },
            },
            'Toggle hidden'
          ),
          h(
            'button',
            {
              onClick: () => {
                void flow.updateEdgeData('straight', { edited: true })
                message.value = 'Updated straight edge data'
              },
            },
            'Update edge data'
          ),
          h(
            'button',
            {
              onClick: () => {
                void flow.addNodes({
                  id: 'public-edit-node',
                  label: 'Added node',
                  position: { x: 560, y: 300 },
                  data: { source: 'playground' },
                })
                message.value = 'Added public edit node'
              },
            },
            'Add graph node'
          ),
          h('button', { onClick: addProtectedNode }, 'Add protected node'),
          h('button', { onClick: tryProtectedDelete }, 'Try protected delete'),
          h(
            'button',
            {
              onClick: removeAddedNode,
            },
            'Remove added node'
          ),
          h(
            'button',
            { onClick: reconnectMiddle },
            'Delete middle and reconnect'
          ),
          h(
            'button',
            {
              onClick: () => {
                const snapshot = flow.getSnapshot()
                const node = flow.getNode('validate')
                message.value = JSON.stringify({
                  nodes: flow.nodes.value.length,
                  edges: flow.edges.value.length,
                  selected: node?.label,
                  isSelected: node?.selected === true,
                  hidden: node?.hidden === true,
                  nodeData: flow.getNode('public-edit-node')?.data,
                  protectedNode: flow.getNode('protected-node')?.id,
                  edgeData: snapshot.document.edges.find(
                    (edge) => edge.id === 'straight'
                  )?.data,
                  viewport: snapshot.viewport,
                  incomers:
                    node === undefined
                      ? []
                      : getIncomers(
                          node,
                          [...snapshot.document.nodes],
                          [...snapshot.document.edges]
                        ).map((item) => item.id),
                  outgoers:
                    node === undefined
                      ? []
                      : getOutgoers(
                          node,
                          [...snapshot.document.nodes],
                          [...snapshot.document.edges]
                        ).map((item) => item.id),
                })
              },
            },
            'Inspect graph'
          ),
          h(
            'button',
            {
              onClick: () => {
                saved.value = flow.getVersionedSavedSession()
                message.value = 'Snapshot saved for this session'
              },
            },
            'Save snapshot'
          ),
          h(
            'button',
            {
              onClick: async () => {
                await flow.applyEdit({
                  operations: [
                    {
                      kind: 'update-node',
                      nodeId: 'validate',
                      patch: { label: 'Changed after save', hidden: false },
                    },
                    {
                      kind: 'update-edge-data',
                      edgeId: 'straight',
                      data: { changedAfterSave: true },
                      replace: true,
                    },
                  ],
                })
                flow.updateViewport({ x: -80, y: 30, zoom: 0.9 })
                message.value = 'Changed label, visibility, and viewport'
              },
            },
            'Change graph and viewport'
          ),
          h(
            'button',
            {
              disabled: saved.value === undefined,
              onClick: async () => {
                if (saved.value === undefined) {
                  message.value = 'No snapshot saved'

                  return
                }

                const state = await flow.prepareVersionedRestore(saved.value)
                flow.updateDocument(state.document)
                flow.updateViewport(state.viewport)
                message.value =
                  'Restored document and viewport; selection is transient'
              },
            },
            'Restore snapshot'
          ),
          h(
            'button',
            {
              onClick: () => {
                flow.updateDocument(main)
                flow.updateViewport({ x: 0, y: 0, zoom: 1 })
                saved.value = undefined
                label.value = 'Validate'
                message.value = 'Reset to the original example'
              },
            },
            'Reset example'
          ),
          h(
            'small',
            'Saved in this page session only. Reloading discards the snapshot.'
          ),
          h('output', { 'aria-live': 'polite' }, message.value),
          h('nav', { 'aria-label': 'Template examples' }, [
            h(
              'a',
              { href: `${import.meta.env.BASE_URL}workflow/` },
              'Workflow and offline AI editor'
            ),
          ]),
        ]
      )
  },
})

const ViewportControls = defineComponent({
  setup() {
    const flow = useFlow()
    const status = ref('Ready')
    const marker = ref<{ readonly x: number; readonly y: number }>()

    const report = async (
      label: string,
      operation: Promise<{ readonly status: string }>
    ): Promise<void> => {
      status.value = `${label}: pending`

      const result = await operation
      status.value = `${label}: ${result.status}`
    }

    const setConversionMarker = (): void => {
      const canvas =
        globalThis.document.querySelector<HTMLElement>('.flow-vue-canvas')

      if (canvas === null) {
        return
      }

      const rect = canvas.getBoundingClientRect()
      const screen = flow.flowToScreenPosition({ x: 250, y: 160 })
      marker.value = { x: screen.x - rect.left, y: screen.y - rect.top }
      status.value = `Flow (250, 160) → screen (${Math.round(screen.x)}, ${Math.round(screen.y)})`
    }

    const cancelAnimation = (): void => {
      void flow.setViewport(flow.getViewport())
      status.value = 'Cancellation requested'
    }

    return () =>
      h('div', { class: 'flow-vue-viewport-overlay' }, [
        h(
          'section',
          {
            class: 'flow-vue-viewport-tools',
            onPointerdown: (event: PointerEvent) => event.stopPropagation(),
          },
          [
            h('h2', 'Viewport operations'),
            h(
              'button',
              {
                'data-testid': 'viewport-center',
                onClick: () =>
                  report('Center', flow.setCenter(250, 160, { duration: 250 })),
              },
              'Center'
            ),
            h(
              'button',
              {
                'data-testid': 'viewport-fit-selected',
                onClick: () =>
                  report(
                    'Fit selected',
                    flow.fitView({ nodes: 'selected', duration: 250 })
                  ),
              },
              'Fit selected'
            ),
            h(
              'button',
              {
                'data-testid': 'viewport-zoom-to',
                onClick: () =>
                  report(
                    'Zoom to 0.65',
                    flow.zoomTo(0.65, { duration: 500, easing: 'ease-in-out' })
                  ),
              },
              'Zoom to 0.65'
            ),
            h(
              'button',
              {
                'data-testid': 'viewport-marker',
                onClick: setConversionMarker,
              },
              'Mark flow point'
            ),
            h(
              'button',
              { 'data-testid': 'viewport-cancel', onClick: cancelAnimation },
              'Cancel animation'
            ),
            h(
              'output',
              {
                'data-testid': 'viewport-operation-status',
                'aria-live': 'polite',
              },
              status.value
            ),
            h(
              'output',
              { class: 'flow-vue-coordinate-marker-readout' },
              'Flow point: (250, 160)'
            ),
          ]
        ),
        marker.value === undefined
          ? null
          : h('span', {
              class: 'flow-vue-coordinate-marker',
              'data-testid': 'viewport-conversion-marker',
              style: {
                left: `${marker.value.x}px`,
                top: `${marker.value.y}px`,
              },
              'aria-label': 'Converted flow position marker',
            }),
      ])
  },
})

const Demo = defineComponent({
  setup() {
    const document = ref<FlowDocument>(main)
    const blocked = ref(false)
    const scene = ref<'main' | 'remote' | 'renderer' | 'viewport'>('main')
    const viewport = ref<Viewport>({ x: 0, y: 0, zoom: 1 })
    const viewportObservation = ref('idle')
    const resizeEnabled = ref(false)
    const dragHandleEnabled = ref(false)
    const touchReady = ref(false)
    const connectionEvents = ref<string[]>([])
    let connectionGestureActive = false

    const appendConnectionEvent = (event: string): void => {
      connectionEvents.value = [...connectionEvents.value, event].slice(-8)
    }

    const isValidConnection = (candidate: FlowConnection): boolean => {
      const accepted = !blocked.value || candidate.target !== 'output'

      if (!accepted) {
        appendConnectionEvent(
          `rejected:${candidate.source}→${candidate.target}`
        )
        connectionGestureActive = false
      }

      return accepted
    }

    const toggleResizeHandles = (): void => {
      resizeEnabled.value = !resizeEnabled.value
      document.value = {
        ...document.value,
        nodes: document.value.nodes.map((node) =>
          node.id === 'transform'
            ? { ...node, selected: resizeEnabled.value }
            : node
        ),
      }
    }

    const fitGraph = (): void => {
      const canvas =
        globalThis.document.querySelector<HTMLElement>('.flow-vue-canvas')

      if (canvas === null) {
        return
      }

      viewport.value = fitViewportToNodes({
        document: document.value,
        measurements: new Map(),
        currentViewport: viewport.value,
        paneWidth: canvas.clientWidth,
        paneHeight: canvas.clientHeight,
        limits: { minZoom: 0.4, maxZoom: 2 },
        padding: 0.12,
        fallbackDimensions: { width: 150, height: 70 },
      })
    }

    const toggleHiddenEdge = (): void => {
      document.value = {
        ...document.value,
        edges: document.value.edges.map((edge) =>
          edge.id === 'hidden'
            ? { ...edge, hidden: edge.hidden !== true }
            : edge
        ),
      }
    }

    const toggleValidate = (): void => {
      document.value = {
        ...document.value,
        nodes: document.value.nodes.map((node) =>
          node.id === 'validate'
            ? { ...node, hidden: node.hidden !== true }
            : node
        ),
      }
    }

    return () => {
      const canvasProps = {
        document: document.value,
        documentMode: 'controlled' as const,
        nodesResizable: true,
        viewport: viewport.value,
        viewportMode:
          scene.value === 'viewport'
            ? ('uncontrolled' as const)
            : ('controlled' as const),
        nodeTypes:
          scene.value === 'renderer'
            ? {
                'gesture-input': GestureInputNode,
                'renderer-card': RendererNode,
              }
            : { 'gesture-input': GestureInputNode },
        edgeTypes:
          scene.value === 'renderer'
            ? { 'renderer-custom-edge': RendererEdge }
            : {},
        'onUpdate:viewport': (next: Viewport) => {
          viewport.value = next
        },
        'onUpdate:document': (next: typeof document.value) => {
          document.value = next
        },
        onViewportStart: () => {
          viewportObservation.value = 'start'
        },
        onViewportChange: (next: Viewport) => {
          viewportObservation.value = `change:${next.zoom.toFixed(2)}`
        },
        onViewportEnd: (_next: Viewport, status: string) => {
          viewportObservation.value = `end:${status}`
        },
        isValidConnection,
        onConnectStart: () => {
          connectionGestureActive = true
          appendConnectionEvent('started')
        },
        onChange: (change: FlowChange) => {
          if (change.kind === 'edge-add') {
            appendConnectionEvent(
              `accepted:${change.edge.source}→${change.edge.target}`
            )
            connectionGestureActive = false
          }
        },
      }

      return h(
        'main',
        {
          class: {
            'flow-vue-touch-ready': touchReady.value,
            'flow-vue-drag-handle-enabled': dragHandleEnabled.value,
          },
          onPointerup: () => {
            if (connectionGestureActive) {
              connectionGestureActive = false
              appendConnectionEvent('ended-without-connection')
            }
          },
          onPointercancel: () => {
            if (connectionGestureActive) {
              connectionGestureActive = false
              appendConnectionEvent('cancelled')
            }
          },
          onKeydown: (event: KeyboardEvent) => {
            if (event.key === 'Escape' && connectionGestureActive) {
              connectionGestureActive = false
              appendConnectionEvent('cancelled')
            }
          },
        },
        [
          h('header', [
            h('h1', 'Flow Vue playground'),
            h(
              'p',
              'Vue owns rendering and lifetime; Flow core owns graph types and transitions.'
            ),
          ]),
          h('div', { class: 'flow-vue-actions' }, [
            h(
              'button',
              {
                'aria-pressed': scene.value === 'main',
                onClick: () => {
                  scene.value = 'main'
                  document.value = main
                  viewport.value = { x: 0, y: 0, zoom: 1 }
                },
              },
              'Main graph'
            ),
            h(
              'button',
              {
                'aria-pressed': scene.value === 'remote',
                onClick: () => {
                  scene.value = 'remote'
                  document.value = remote
                  viewport.value = { x: 0, y: 0, zoom: 1 }
                },
              },
              'Distant graph'
            ),
            h(
              'button',
              {
                'aria-pressed': scene.value === 'renderer',
                onClick: () => {
                  scene.value = 'renderer'
                  document.value = rendererScene
                  viewport.value = { x: 0, y: 0, zoom: 1 }
                },
              },
              'Renderer contracts'
            ),
            h(
              'button',
              {
                'aria-pressed': scene.value === 'viewport',
                onClick: () => {
                  scene.value = 'viewport'
                  document.value = viewportScene
                  viewport.value = { x: 0, y: 0, zoom: 1 }
                },
              },
              'Viewport operations'
            ),
            h(
              'button',
              {
                onClick: () => {
                  blocked.value = !blocked.value
                },
              },
              blocked.value ? 'Allow connections' : 'Block connections'
            ),
            h(
              'button',
              { onClick: toggleHiddenEdge },
              document.value.edges.some(
                (edge) => edge.id === 'hidden' && edge.hidden !== true
              )
                ? 'Hide step edge'
                : 'Show hidden edge'
            ),
            h(
              'button',
              { onClick: toggleValidate },
              document.value.nodes.some(
                (node) => node.id === 'validate' && node.hidden !== true
              )
                ? 'Hide Validate node'
                : 'Show Validate node'
            ),
            h('button', { onClick: fitGraph }, 'Fit graph'),
            h(
              'button',
              {
                onClick: () => {
                  document.value = Effect.runSync(
                    decodeFlowDocument({
                      ...document.value,
                      nodes: [
                        ...document.value.nodes,
                        {
                          id: `node-${document.value.nodes.length}`,
                          label: 'New node',
                          position: { x: 600, y: 120 },
                        },
                      ],
                    })
                  )
                },
              },
              'Add node'
            ),
            h(
              'button',
              {
                'data-testid': 'resize-control',
                'aria-pressed': resizeEnabled.value,
                onClick: toggleResizeHandles,
              },
              resizeEnabled.value
                ? 'Disable resize controls'
                : 'Enable resize controls'
            ),
            h(
              'button',
              {
                'data-testid': 'drag-handle-control',
                'aria-pressed': dragHandleEnabled.value,
                onClick: () => {
                  dragHandleEnabled.value = !dragHandleEnabled.value
                },
              },
              dragHandleEnabled.value ? 'Hide drag handle' : 'Show drag handle'
            ),
            h(
              'button',
              {
                'data-testid': 'touch-ready-control',
                'aria-pressed': touchReady.value,
                onClick: () => {
                  touchReady.value = !touchReady.value
                },
              },
              touchReady.value
                ? 'Disable touch-ready targets'
                : 'Enable touch-ready targets'
            ),
            h(
              'button',
              {
                onClick: () => {
                  connectionEvents.value = []
                },
              },
              'Clear connection events'
            ),
          ]),
          h(
            'section',
            {
              class: 'flow-vue-connection-events',
              'aria-label': 'Connection events',
            },
            [
              h('h2', 'Connection events'),
              h(
                'output',
                { 'data-testid': 'connection-events', 'aria-live': 'polite' },
                connectionEvents.value.join(' → ') || 'No connection events yet'
              ),
            ]
          ),
          h(
            'output',
            { 'data-testid': 'viewport-observation', 'aria-live': 'polite' },
            viewportObservation.value
          ),
          h(FlowCanvas, canvasProps, {
            default: () =>
              scene.value === 'viewport' ? h(ViewportControls) : h(StateTools),
          }),
        ]
      )
    }
  },
})

const app =
  globalThis.location.pathname ===
    `${import.meta.env.BASE_URL}ui-recipes/tooltip` ||
  globalThis.location.pathname ===
    `${import.meta.env.BASE_URL}ui-recipes/tooltip/`
    ? TooltipRecipe
    : Demo

createApp(app).mount('#app')
