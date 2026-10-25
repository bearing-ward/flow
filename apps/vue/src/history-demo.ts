import {
  applyFlowChangeToDocument,
  FlowDocumentSchema,
  NodeIdSchema,
  HandleIdSchema,
} from '@flow/core'
import type {
  FlowChange,
  FlowDocument,
  FlowTransactionContext,
} from '@flow/core'
import { FlowCanvas, FlowProvider, useFlow } from '@flow/vue'
import type { FlowActions, FlowEditor } from '@flow/vue'
import { Schema as S } from 'effect'
import { createApp, defineComponent, h, shallowRef } from 'vue'

import '@flow/vue/style.css'
import './history-demo.css'

type Proposal = Extract<FlowChange, { kind: 'edit-proposal' }>

export interface VueHistoryFixture {
  readonly flow: FlowActions
  readonly isolated: () => FlowActions | undefined
  readonly proposals: readonly Proposal[]
}

declare global {
  var vueHistoryFixture: VueHistoryFixture | undefined
}

const initialDocument = (): FlowDocument =>
  S.decodeUnknownSync(FlowDocumentSchema)({
    nodes: [
      {
        id: 'a',
        label: 'Alpha',
        position: { x: 100, y: 100 },
        size: { width: 150, height: 60 },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'b',
        label: 'Beta',
        position: { x: 400, y: 100 },
        size: { width: 150, height: 60 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
      {
        id: 'c',
        label: 'Gamma',
        position: { x: 400, y: 260 },
        size: { width: 150, height: 60 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
    edges: [
      {
        id: 'ab',
        source: 'a',
        sourceHandle: 'out',
        target: 'b',
        targetHandle: 'in',
        reconnectable: true,
      },
    ],
  })

const params = new URLSearchParams(location.search)

const split = params.has('split')

const controlled = params.has('controlled') || split

const capacity = params.get('capacity')

const proposals: Proposal[] = []

let isolated: FlowActions | undefined

const unmountDemo = shallowRef<() => void>()

const HistoryControls = defineComponent({
  setup() {
    const flow = useFlow()
    const mounted = shallowRef(true)
    const document = shallowRef(initialDocument())
    const context = shallowRef<FlowTransactionContext>()
    const accepting = shallowRef(true)
    const error = shallowRef('')
    const remoteProposal = shallowRef<FlowDocument>()
    let sequence = 0
    let canvasEditor: FlowEditor | undefined

    const button = <Result>(
      label: string,
      action: () => Result,
      disabled = false
    ) =>
      h(
        'button',
        {
          type: 'button',
          disabled,
          onClick: async () => {
            try {
              await action()
            } catch (error_) {
              error.value = String(error_)
            }
          },
        },
        label
      )

    const latest = () => proposals.at(-1)

    const accept = (echo = true): void => {
      const proposal = latest()

      if (proposal === undefined) {
        return
      }

      context.value = echo ? proposal.context : undefined
      document.value = proposal.document
    }

    globalThis.vueHistoryFixture = { flow, isolated: () => isolated, proposals }

    const canvasDocumentProps = (): Pick<
      InstanceType<typeof FlowCanvas>['$props'],
      'document' | 'documentMode' | 'nodes' | 'edges' | 'defaultDocument'
    > => {
      if (split) {
        return { nodes: document.value.nodes, edges: document.value.edges }
      }

      if (controlled) {
        return { document: document.value, documentMode: 'controlled' }
      }

      return { defaultDocument: initialDocument() }
    }

    return () =>
      h('main', [
        h('h1', 'Transaction history'),
        h('section', { id: 'history-controls' }, [
          button('Undo', flow.undo, !flow.history.value.canUndo),
          button('Redo', flow.redo, !flow.history.value.canRedo),
          button('Add node', () =>
            flow.addNodes({
              id: `new-${(sequence += 1)}`,
              label: 'Added',
              position: { x: 160, y: 300 },
            })
          ),
          button('Add edge', () =>
            flow.addEdges({
              id: `new-edge-${(sequence += 1)}`,
              source: 'a',
              target: 'c',
              sourceHandle: 'out',
              targetHandle: HandleIdSchema.make('in'),
            })
          ),
          button('Delete node', () => flow.deleteElements({ nodeIds: ['b'] })),
          button('Delete edge', () => flow.deleteElements({ edgeIds: ['ab'] })),
          button('Move node', () =>
            flow.updateNode('a', { position: { x: 180, y: 180 } })
          ),
          button('Move edge', () =>
            flow.updateEdge('ab', {
              target: NodeIdSchema.make('c'),
              targetHandle: HandleIdSchema.make('in'),
            })
          ),
          button('Propose remote document', () => {
            if (canvasEditor === undefined) {
              throw new Error('Canvas editor is unavailable')
            }

            const proposed = S.decodeUnknownSync(FlowDocumentSchema)({
              ...flow.getSnapshot().document,
              nodes: flow
                .getSnapshot()
                .document.nodes.map((node) =>
                  node.id === 'a'
                    ? { ...node, position: { x: 300, y: 220 } }
                    : node
                ),
            })

            remoteProposal.value = proposed
            canvasEditor.updateDocument(proposed, {
              transactionId: crypto.randomUUID(),
              origin: { kind: 'remote', actorId: 'remote-peer' },
            })
          }),
          button('Accept remote as local', () => {
            if (remoteProposal.value === undefined) {
              throw new Error('No remote document proposal')
            }

            context.value = {
              transactionId: crypto.randomUUID(),
              origin: { kind: 'local', actorId: 'demo-owner' },
            }
            document.value = remoteProposal.value
          }),
          button('Reject edit', () =>
            flow.applyEdit({
              operations: [
                {
                  kind: 'add-edges',
                  edges: [{ id: 'invalid', source: 'missing', target: 'b' }],
                },
              ],
            })
          ),
          button(
            accepting.value ? 'Pause acceptance' : 'Resume acceptance',
            () => {
              accepting.value = !accepting.value
            }
          ),
          button('Accept proposal', () => accept()),
          button('Accept without context', () => accept(false)),
          button('Reject proposal', () => {
            const proposal = latest()

            if (proposal?.context !== undefined) {
              flow.rejectHistory(proposal.context.transactionId)
            }
          }),
          button('Dispose queued replay', async () => {
            if (canvasEditor === undefined) {
              throw new Error('Canvas editor is unavailable')
            }

            let replay: Promise<void> | undefined

            canvasEditor.withEditMutation(() => {
              replay = flow.undo()
              unmountDemo.value?.()
            })
            await replay

            const result = globalThis.document.querySelector(
              '#queued-replay-result'
            )

            if (result !== null) {
              result.textContent = 'settled'
            }
          }),
          button('Dispose', () => {
            mounted.value = false
          }),
        ]),
        h('label', [
          'Native text ',
          h('input', { 'aria-label': 'Native text', value: '' }),
        ]),
        h('output', { id: 'history-error' }, error.value),
        h(
          'output',
          { id: 'history-status' },
          JSON.stringify(flow.history.value)
        ),
        h(
          'pre',
          { id: 'history-document' },
          JSON.stringify(flow.getSavedSession().document)
        ),
        h(
          'pre',
          { id: 'history-remote-proposal' },
          JSON.stringify(remoteProposal.value)
        ),
        mounted.value
          ? h(FlowCanvas, {
              ...canvasDocumentProps(),
              ...(context.value === undefined
                ? undefined
                : { documentContext: context.value }),
              onInit: (editor: FlowEditor) => {
                canvasEditor = editor
              },
              historyCapacity: capacity === null ? 100 : Number(capacity),
              autoPanOnNodeFocus: false,
              onChange: (change: FlowChange) => {
                if (change.kind === 'edit-proposal') {
                  proposals.push(change)
                }

                if (controlled && accepting.value) {
                  const next = applyFlowChangeToDocument(document.value, change)

                  if (next !== undefined) {
                    context.value =
                      change.kind === 'edit-proposal'
                        ? change.context
                        : undefined
                    document.value = next
                  }
                }
              },
            })
          : h('p', 'Canvas disposed'),
      ])
  },
})

const IsolatedCanvas = defineComponent({
  setup() {
    isolated = useFlow()

    return () =>
      h('section', { id: 'isolated' }, [
        h(
          'button',
          {
            onClick: () =>
              isolated?.updateNode('peer', { position: { x: 140, y: 30 } }),
          },
          'Move isolated'
        ),
        h(
          'output',
          { id: 'isolated-status' },
          JSON.stringify(isolated?.history.value)
        ),
        h(FlowCanvas, {
          defaultDocument: S.decodeUnknownSync(FlowDocumentSchema)({
            nodes: [
              {
                id: 'peer',
                label: 'Separate history',
                position: { x: 100, y: 30 },
              },
            ],
            edges: [],
          }),
        }),
      ])
  },
})

const app = createApp({
  render: () =>
    h('div', [
      h(FlowProvider, null, { default: () => h(HistoryControls) }),
      h(FlowProvider, null, { default: () => h(IsolatedCanvas) }),
    ]),
})

unmountDemo.value = () => app.unmount()

app.mount('#app')
