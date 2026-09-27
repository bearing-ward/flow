import {
  decodeFlowDocument,
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

    const envelope = Schema.Struct({
      version: Schema.Literal(1),
      savedDocument: SavedFlowDocumentSchema,
      viewport: ViewportSchema,
    })

    const changeNode = (
      update: (
        node: FlowDocument['nodes'][number]
      ) => FlowDocument['nodes'][number]
    ) => {
      const snapshot = flow.getSnapshot()
      flow.updateDocument(
        Effect.runSync(
          decodeFlowDocument({
            ...snapshot.document,
            nodes: snapshot.document.nodes.map((node) =>
              node.id === 'validate' ? update(node) : node
            ),
          })
        )
      )
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
                changeNode((node) => ({ ...node, label: label.value }))
                message.value = `Updated Validate to ${label.value}`
              },
            },
            'Update label'
          ),
          h(
            'button',
            {
              onClick: () => {
                const nextHidden = flow.getNode('validate')?.hidden !== true
                changeNode((node) => ({ ...node, hidden: nextHidden }))
                message.value = `Validate hidden=${String(nextHidden)}`
              },
            },
            'Toggle hidden'
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
              onClick: () => {
                changeNode((node) => ({
                  ...node,
                  label: 'Changed after save',
                  hidden: false,
                }))
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
