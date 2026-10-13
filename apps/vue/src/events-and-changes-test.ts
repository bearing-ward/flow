import { decodeFlowDocument, FlowEdgeSchema, FlowNodeSchema } from '@flow/core'
import type {
  EdgeChange,
  FlowEdge,
  FlowEditTransactionInput,
  FlowNode,
  NodeChange,
  Viewport,
} from '@flow/core'
import {
  FlowCanvas,
  FlowControls,
  useConnection,
  useEdgesState,
  useFlow,
  useNodesState,
} from '@flow/vue'
import type {
  FlowConnectionEndDetails,
  FlowConnectionState,
  FlowErrorReport,
  FlowFinalConnectionState,
  FlowInteractivity,
} from '@flow/vue'
import { Effect, Schema as S } from 'effect'
import { createApp, defineComponent, h, reactive, watch } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'

export type DropMode = 'none' | 'add-node' | 'temporary'

export interface EventRecord {
  readonly name: string
  readonly id?: string | undefined
  readonly eventType?: string | undefined
  readonly status?: string | undefined
  readonly reason?: string | undefined
  readonly connectionState?: FlowFinalConnectionState | undefined
  readonly clientPosition?:
    | { readonly x: number; readonly y: number }
    | undefined
}

export interface VueEventsFixture {
  readonly nodes: () => readonly FlowNode[]
  readonly edges: () => readonly FlowEdge[]
  readonly viewport: () => Viewport
  readonly nodeChanges: () => readonly NodeChange[]
  readonly edgeChanges: () => readonly EdgeChange[]
  readonly events: () => readonly EventRecord[]
  readonly errors: () => readonly FlowErrorReport[]
  readonly connectionStates: () => readonly {
    readonly inProgress: boolean
    readonly fromNode: string | null
    readonly fromHandle: string | null
    readonly toNode: string | null
    readonly isValid: boolean | null
  }[]
  readonly interactivity: () => FlowInteractivity
  readonly interactiveCalls: () => readonly boolean[]
  readonly buttonClicks: () => number
  readonly setProp: (name: keyof FlowInteractivity, value: boolean) => void
  readonly setInteractivity: (next: Partial<FlowInteractivity>) => void
  readonly setDropMode: (mode: DropMode) => void
  readonly deleteElements: (input: {
    readonly nodeIds?: readonly string[]
    readonly edgeIds?: readonly string[]
  }) => Promise<void>
  readonly failingDelete: (nodeId: string) => Promise<string>
  readonly failingEdit: (
    transaction: FlowEditTransactionInput
  ) => Promise<string>
  readonly failingStateListener: () => void
}

declare global {
  interface Window {
    __flowVueEvents?: VueEventsFixture
  }
}

const decodeNode = S.decodeUnknownSync(FlowNodeSchema)

const decodeEdge = S.decodeUnknownSync(FlowEdgeSchema)

/** The handle that accepts at most one connection (Connection Limit). */
const limitedHandle = { nodeId: 'l', handleId: 'in', max: 1 } as const

const initialDocument = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'a',
          label: 'Alpha',
          position: { x: 60, y: 60 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'b',
          label: 'Beta',
          position: { x: 420, y: 40 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
        {
          id: 'l',
          label: 'Limit',
          position: { x: 420, y: 220 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
        {
          id: 's',
          label: 'Second',
          position: { x: 60, y: 260 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'f',
          label: 'Fixed',
          type: 'button',
          draggable: false,
          position: { x: 620, y: 360 },
        },
      ],
      edges: [],
    })
  )

export const mountVueEventsFixture = (root: HTMLElement): void => {
  const document = initialDocument()
  const [nodes, setNodes, onNodesChange] = useNodesState(document.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(document.edges)

  const state = reactive<{
    switches: { -readonly [Name in keyof FlowInteractivity]: boolean }
    dropMode: DropMode
  }>({
    switches: {
      nodesDraggable: true,
      nodesConnectable: true,
      elementsSelectable: true,
    },
    dropMode: 'none',
  })

  const nodeChanges: NodeChange[] = []
  const edgeChanges: EdgeChange[] = []
  const events: EventRecord[] = []
  const errors: FlowErrorReport[] = []
  const interactiveCalls: boolean[] = []

  const connectionStates: ReturnType<
    VueEventsFixture['connectionStates']
  >[number][] = []

  let buttonClicks = 0
  let temporaryCount = 0
  let actions: ReturnType<typeof useFlow> | undefined

  const flow = () => {
    if (actions === undefined) {
      throw new Error('Vue events fixture actions are unavailable')
    }

    return actions
  }

  // Connection Limit: once the limited handle has its connections, the app
  // marks it not connectable through ordinary node data.
  const applyConnectionLimit = (): void => {
    const count = edges.value.filter(
      (edge) =>
        edge.target === limitedHandle.nodeId &&
        edge.targetHandle === limitedHandle.handleId
    ).length

    setNodes((current) =>
      current.map((node) =>
        node.id === limitedHandle.nodeId
          ? {
              ...node,
              handles: (node.handles ?? []).map((handle) => {
                if (handle.id !== limitedHandle.handleId) {
                  return handle
                }

                const { connectable: _previous, ...rest } = handle

                // A handle flag wins over nodesConnectable, so only set it
                // when the limit is reached.
                return count < limitedHandle.max
                  ? rest
                  : { ...rest, connectable: false }
              }),
            }
          : node
      )
    )
  }

  const ButtonNode = defineComponent({
    props: {
      // SAFETY: FlowCanvas passes decoded FlowNode values to node renderers.
      node: { type: Object as PropType<FlowNode>, required: true },
    },
    setup(props) {
      return () =>
        h('span', [
          props.node.label,
          h(
            'button',
            {
              type: 'button',
              'data-testid': 'node-button',
              onClick: () => {
                buttonClicks += 1
              },
            },
            'Press'
          ),
        ])
    },
  })

  const TemporaryNode = defineComponent({
    props: {
      // SAFETY: FlowCanvas passes decoded FlowNode values to node renderers.
      node: { type: Object as PropType<FlowNode>, required: true },
    },
    setup(props) {
      const edgeId = () => `edge-${props.node.id}`

      return () =>
        h('span', { 'data-temporary-node': props.node.id }, [
          'Temporary',
          h(
            'button',
            {
              type: 'button',
              'data-testid': 'temporary-accept',
              onClick: () => {
                // Accept: the temporary edge becomes a real edge to Beta.
                const temporary = edges.value.find(({ id }) => id === edgeId())

                if (temporary === undefined) {
                  return
                }

                setEdges((current) => [
                  ...current.filter(({ id }) => id !== edgeId()),
                  decodeEdge({
                    id: `accepted-${props.node.id}`,
                    source: temporary.source,
                    sourceHandle: temporary.sourceHandle,
                    target: 'b',
                    targetHandle: 'in',
                  }),
                ])
                setNodes((current) =>
                  current.filter(({ id }) => id !== props.node.id)
                )
              },
            },
            'Accept'
          ),
          h(
            'button',
            {
              type: 'button',
              'data-testid': 'temporary-cancel',
              onClick: () => {
                void flow().deleteElements({ nodeIds: [props.node.id] })
              },
            },
            'Cancel'
          ),
        ])
    },
  })

  const onConnectEnd = (
    payload: { readonly status: string; readonly reason: string },
    details?: FlowConnectionEndDetails
  ): void => {
    events.push({
      name: 'connectEnd',
      status: payload.status,
      reason: payload.reason,
      eventType: details?.event?.type,
      connectionState: details?.connectionState,
      clientPosition: details?.clientPosition,
    })

    const connection = details?.connectionState

    if (
      state.dropMode === 'none' ||
      details?.clientPosition === undefined ||
      connection === undefined ||
      connection.fromNode === null ||
      connection.fromHandle === null ||
      connection.isValid === true ||
      connection.toHandle !== null
    ) {
      return
    }

    // Add Node On Edge Drop and Temporary Edges.
    temporaryCount += 1
    const temporary = state.dropMode === 'temporary'
    const id = `${temporary ? 'temp' : 'added'}-${temporaryCount}`
    const position = flow().screenToFlowPosition(details.clientPosition)

    const addedNode = {
      id,
      label: temporary ? 'Temporary' : `Added ${temporaryCount}`,
      position,
      handles: [{ id: 'in', kind: 'target', side: 'left' }],
    }

    const addedEdge = {
      id: `edge-${id}`,
      source: connection.fromNode.id,
      sourceHandle: connection.fromHandle.id,
      target: id,
      targetHandle: 'in',
    }

    setNodes((current) => [
      ...current,
      decodeNode(
        temporary
          ? { ...addedNode, type: 'temporary', data: { temporary: true } }
          : addedNode
      ),
    ])
    setEdges((current) => [
      ...current,
      decodeEdge(
        temporary
          ? { ...addedEdge, data: { temporary: true }, stroke: '#f59e0b' }
          : addedEdge
      ),
    ])
  }

  const Probe = defineComponent({
    setup() {
      actions = useFlow()
      const connection = useConnection()

      watch(connection, (current: FlowConnectionState) => {
        connectionStates.push({
          inProgress: current.inProgress,
          fromNode: current.fromNode?.id ?? null,
          fromHandle: current.fromHandle?.id ?? null,
          toNode: current.toNode?.id ?? null,
          isValid: current.isValid,
        })
      })

      return () => null
    },
  })

  const record =
    (name: string) =>
    (element: { readonly id: string }, event?: Event): void => {
      events.push({ name, id: element.id, eventType: event?.type })
    }

  const app = createApp(
    defineComponent({
      setup() {
        return () =>
          h(
            FlowCanvas,
            {
              nodes: nodes.value,
              edges: edges.value,
              documentMode: 'controlled',
              nodesDraggable: state.switches.nodesDraggable,
              nodesConnectable: state.switches.nodesConnectable,
              elementsSelectable: state.switches.elementsSelectable,
              nodeTypes: { button: ButtonNode, temporary: TemporaryNode },
              style: { width: '900px', height: '520px' },
              onNodesChange: (changes: readonly NodeChange[]) => {
                nodeChanges.push(...changes)
                onNodesChange(changes)
              },
              onEdgesChange: (changes: readonly EdgeChange[]) => {
                edgeChanges.push(...changes)
                onEdgesChange(changes)
                applyConnectionLimit()
              },
              onConnectEnd,
              onError: (report: FlowErrorReport) => errors.push(report),
              onNodeClick: record('nodeClick'),
              onNodeContextMenu: (node: FlowNode, event?: MouseEvent) => {
                event?.preventDefault()
                record('nodeContextMenu')(node, event)
              },
              onNodeMouseEnter: record('nodeMouseEnter'),
              onNodeDoubleClick: record('nodeDoubleClick'),
              onNodeDragStart: record('nodeDragStart'),
              onEdgeClick: record('edgeClick'),
              onEdgeContextMenu: (edge: FlowEdge, event?: MouseEvent) => {
                event?.preventDefault()
                record('edgeContextMenu')(edge, event)
              },
            },
            {
              default: () => [
                h(FlowControls, {
                  position: 'bottom-left',
                  onInteractiveChange: (interactive: boolean) =>
                    interactiveCalls.push(interactive),
                }),
                h(Probe),
              ],
            }
          )
      },
    })
  )

  app.mount(root)

  window.__flowVueEvents = {
    nodes: () => nodes.value,
    edges: () => edges.value,
    viewport: () => flow().getViewport(),
    nodeChanges: () => nodeChanges,
    edgeChanges: () => edgeChanges,
    events: () => events,
    errors: () => errors,
    connectionStates: () => connectionStates,
    interactivity: () => flow().interactivity.value,
    interactiveCalls: () => interactiveCalls,
    buttonClicks: () => buttonClicks,
    setProp: (name, value) => {
      state.switches[name] = value
    },
    setInteractivity: (next) => flow().setInteractivity(next),
    setDropMode: (mode) => {
      state.dropMode = mode
    },
    deleteElements: async (input) => {
      await flow().deleteElements(input)
    },
    failingDelete: async (nodeId) => {
      try {
        await flow().deleteElements(
          { nodeIds: [nodeId] },
          {
            onBeforeDelete: () => {
              throw new Error('approval exploded')
            },
          }
        )

        return 'resolved'
      } catch (error) {
        return error instanceof Error ? error.name : 'unknown'
      }
    },
    failingEdit: async (transaction) => {
      try {
        await flow().applyEdit(transaction)

        return 'resolved'
      } catch (error) {
        return error instanceof Error ? error.name : 'unknown'
      }
    },
    failingStateListener: () => {
      const unsubscribe = flow().subscribeState(() => {
        unsubscribe()
        throw new Error('listener exploded')
      })
    },
  }
}
