import {
  decodeFlowDocument,
  FlowEditErrorSchema,
  decodeSavedFlowDocument,
  fitViewportToNodes,
  getIncomers,
  getOutgoers,
  SavedFlowDocumentSchema,
  ViewportSchema,
} from '@flow/core'
import type { FlowDocument, Viewport } from '@flow/core'
import { FlowCanvas, useFlow } from '@flow/vue'
import { Effect, Schema } from 'effect'
import { createApp, defineComponent, h, ref } from 'vue'

import '@flow/vue/style.css'
import './style.css'

const initial = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'input',
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

const StateTools = defineComponent({
  setup() {
    const flow = useFlow()
    const label = ref('Validate')
    const message = ref('')
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

    const envelope = Schema.Struct({
      version: Schema.Literal(1),
      savedDocument: SavedFlowDocumentSchema,
      viewport: ViewportSchema,
    })

    return () =>
      h(
        'section',
        {
          class: 'flow-state-tools',
          onPointerdown: (event: PointerEvent) => event.stopPropagation(),
        },
        [
          h('h2', 'State and persistence'),
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
                const snapshot = flow.getSnapshot()
                saved.value = Schema.encodeSync(envelope)({
                  version: 1,
                  savedDocument: {
                    version: 1,
                    document: Effect.runSync(
                      decodeFlowDocument(snapshot.document)
                    ),
                  },
                  viewport: snapshot.viewport,
                })
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
              onClick: () => {
                if (saved.value === undefined) {
                  message.value = 'No snapshot saved'

                  return
                }

                const state = Schema.decodeUnknownSync(envelope)(saved.value)

                const document = Effect.runSync(
                  decodeSavedFlowDocument(state.savedDocument)
                )

                flow.updateDocument(document)
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
        ]
      )
  },
})

const Demo = defineComponent({
  setup() {
    const document = ref<FlowDocument>(main)
    const blocked = ref(false)
    const scene = ref<'main' | 'remote'>('main')
    const viewport = ref<Viewport>({ x: 0, y: 0, zoom: 1 })

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

    return () =>
      h('main', [
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
        ]),
        h(
          FlowCanvas,
          {
            document: document.value,
            documentMode: 'controlled',
            viewport: viewport.value,
            viewportMode: 'controlled',
            'onUpdate:viewport': (next: Viewport) => {
              viewport.value = next
            },
            'onUpdate:document': (next) => {
              document.value = next
            },
            isValidConnection: (target: string) =>
              !blocked.value || target !== 'output',
          },
          { default: () => h(StateTools) }
        ),
      ])
  },
})

createApp(Demo).mount('#app')
