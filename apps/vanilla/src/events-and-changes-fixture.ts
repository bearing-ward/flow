import { decodeFlowDocument, FlowEdgeSchema, FlowNodeSchema } from '@flow/core'
import type {
  EdgeChange,
  FlowChange,
  FlowConnectionState,
  FlowDocument,
  FlowEdge,
  NodeChange,
} from '@flow/core'
import { Effect, Schema as S } from 'effect'

import { createFlowControls } from './controls.ts'
import { createFlowEdgesState, createFlowNodesState } from './flow-changes.ts'
import type {
  FlowConnectionEndDetails,
  FlowReconnectDetails,
} from './flow-changes.ts'
import { mountFlow } from './mount-flow.ts'
import type {
  FlowConnectEndPayload,
  FlowControlsMount,
  FlowSelectionDragStopPayload,
  JavaScriptFlowController,
} from './public.ts'

import './style.css'

/** Example recipes exercised by the wave 2 browser tests. */
export type EventsRecipe =
  | 'controlled'
  | 'connection-limit'
  | 'add-node-on-drop'
  | 'temporary-edges'
  | 'payloads'

export interface EventsFixtureOptions {
  readonly recipe: EventsRecipe
  readonly nodesDraggable?: boolean
  readonly nodesConnectable?: boolean
  readonly elementsSelectable?: boolean
  readonly panActivationModifier?: 'shift' | 'none'
}

export interface EventsFixture {
  readonly controller: JavaScriptFlowController
  readonly controls: FlowControlsMount
  readonly nodeChanges: NodeChange[][]
  readonly edgeChanges: EdgeChange[][]
  readonly flowChanges: FlowChange[]
  readonly connectEnds: (FlowConnectEndPayload & FlowConnectionEndDetails)[]
  readonly reconnects: { edge: FlowEdge; details: FlowReconnectDetails }[]
  readonly nodeClicks: string[]
  readonly drags: FlowSelectionDragStopPayload[]
  readonly interactiveCalls: boolean[]
  readonly connections: FlowConnectionState[]
  readonly buttonClicks: () => number
  readonly acceptTemporary: () => void
  readonly cancelTemporary: () => void
}

const document_ = (withEdge: boolean): FlowDocument =>
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
          position: { x: 360, y: 60 },
          handles: [
            { id: 'in', kind: 'target', side: 'left' },
            { id: 'out', kind: 'source', side: 'right' },
          ],
        },
        {
          id: 'c',
          label: 'Gamma',
          position: { x: 60, y: 260 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'd',
          label: 'Delta',
          position: { x: 540, y: 200 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: withEdge
        ? [
            {
              id: 'e1',
              source: 'a',
              sourceHandle: 'out',
              target: 'b',
              targetHandle: 'in',
            },
          ]
        : [],
    })
  )

const decodeNode = S.decodeUnknownSync(FlowNodeSchema)

const decodeEdge = S.decodeUnknownSync(FlowEdgeSchema)

/** Mounts one canvas wired with React Flow style controlled state and recipes. */
export const mountEventsFixture = (
  root: HTMLElement,
  options: EventsFixtureOptions
): EventsFixture => {
  root.replaceChildren()
  root.style.width = '720px'
  root.style.height = '420px'

  const initial = document_(options.recipe === 'payloads')
  const nodes = createFlowNodesState(initial.nodes)
  const edges = createFlowEdgesState(initial.edges)
  const nodeChanges: NodeChange[][] = []
  const edgeChanges: EdgeChange[][] = []
  const flowChanges: FlowChange[] = []
  const connectEnds: (FlowConnectEndPayload & FlowConnectionEndDetails)[] = []
  const reconnects: EventsFixture['reconnects'] = []
  const nodeClicks: string[] = []
  const drags: FlowSelectionDragStopPayload[] = []
  const interactiveCalls: boolean[] = []
  const connections: FlowConnectionState[] = []
  let dropped = 0
  let buttonCount = 0

  const controller: JavaScriptFlowController = mountFlow(root, initial, {
    documentMode: 'controlled',
    connectionMode: 'strict',
    viewport: {
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.5, maxZoom: 2 },
      mode: 'uncontrolled',
    },
    nodesDraggable: options.nodesDraggable,
    nodesConnectable: options.nodesConnectable,
    elementsSelectable: options.elementsSelectable,
    panActivationModifier: options.panActivationModifier,
    onNodesChange: (changes) => {
      nodeChanges.push([...changes])
      nodes.onChange(changes)
    },
    onEdgesChange: (changes) => {
      edgeChanges.push([...changes])
      edges.onChange(changes)
    },
    onConnectEnd: (payload, details) => {
      connectEnds.push({ ...payload, ...details })
      const { connectionState, clientPosition } = details

      if (
        connectionState.toHandle !== null ||
        connectionState.fromNode === null ||
        connectionState.fromHandle === null ||
        clientPosition === undefined ||
        (options.recipe !== 'add-node-on-drop' &&
          options.recipe !== 'temporary-edges')
      ) {
        return
      }

      // Add Node On Edge Drop: a node at the drop point, joined to the origin.
      dropped += 1

      const id =
        options.recipe === 'temporary-edges' ? 'temp' : `drop-${dropped}`

      const position = controller.screenToFlowPosition(clientPosition)

      nodes.update((current) => [
        ...current,
        decodeNode({
          id,
          label: id,
          position,
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        }),
      ])

      const edge = decodeEdge({
        id: `${id}-edge`,
        source: connectionState.fromNode.id,
        sourceHandle: connectionState.fromHandle.id,
        target: id,
        targetHandle: 'in',
      })

      // Temporary Edges marks the dropped edge pending until accepted.
      edges.update((current) => [
        ...current,
        options.recipe === 'temporary-edges'
          ? { ...edge, data: { temporary: true } }
          : edge,
      ])
    },
    onReconnect: (edge, details) => reconnects.push({ edge, details }),
    onNodeClick: ({ nodeId }) => {
      if (nodeId !== undefined) {
        nodeClicks.push(nodeId)
      }
    },
    onSelectionDragStop: (drag) => drags.push(drag),
    nodeRenderers: {
      default: (node, content) => {
        const label = globalThis.document.createElement('span')
        label.textContent = node.label
        const button = globalThis.document.createElement('button')
        button.type = 'button'
        button.className = 'nodrag'
        button.textContent = `act-${node.id}`
        button.addEventListener('click', () => {
          buttonCount += 1
        })
        // A no-pan region: a press here never becomes a canvas pan.
        const hold = globalThis.document.createElement('span')
        hold.className = 'nopan'
        hold.textContent = `hold-${node.id}`
        content.replaceChildren(label, button, hold)

        return {
          update: (next) => {
            label.textContent = next.label
          },
          destroy: () => content.replaceChildren(),
        }
      },
    },
  })

  // The controlled loop: deltas update caller state, caller state feeds the canvas.
  const sync = () =>
    controller.update({ nodes: [...nodes.get()], edges: [...edges.get()] })

  nodes.subscribe(sync)
  edges.subscribe(sync)
  controller.subscribe((change) => flowChanges.push(change))
  controller.subscribeConnection((state) => connections.push(state))

  if (options.recipe === 'connection-limit') {
    // Connection Limit: the target handle stops accepting after one edge.
    edges.subscribe((current) => {
      const full = current.some(
        (edge) => edge.target === 'b' && edge.targetHandle === 'in'
      )

      nodes.update((list) =>
        list.map((node) =>
          node.id === 'b'
            ? {
                ...node,
                handles: (node.handles ?? []).map((handle) =>
                  handle.id === 'in'
                    ? { ...handle, connectable: !full }
                    : handle
                ),
              }
            : node
        )
      )
    })
  }

  const controls = createFlowControls(controller, {
    onInteractiveChange: (interactive) => interactiveCalls.push(interactive),
  })

  return {
    controller,
    controls,
    nodeChanges,
    edgeChanges,
    flowChanges,
    connectEnds,
    reconnects,
    nodeClicks,
    drags,
    interactiveCalls,
    connections,
    buttonClicks: () => buttonCount,
    // Temporary Edges: accepting keeps one persistent edge, cancelling removes both.
    acceptTemporary: () =>
      edges.update((current) =>
        current.map((edge) => {
          if (edge.id !== 'temp-edge') {
            return edge
          }

          const { data: _data, ...kept } = edge

          return kept
        })
      ),
    cancelTemporary: () => {
      edges.update((current) => current.filter(({ id }) => id !== 'temp-edge'))
      nodes.update((current) => current.filter(({ id }) => id !== 'temp'))
    },
  }
}
