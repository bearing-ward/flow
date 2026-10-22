import {
  decodeFlowDocument,
  FlowStateChangeSchema,
  getOutgoers,
} from '@flow/core'
import type {
  FlowConnection,
  FlowConnectionState,
  FlowDocument,
  FlowEditTransactionInput,
  FlowInteractivity,
  FlowNode,
  Viewport,
} from '@flow/core'
import {
  ElementChangesSchema,
  HostAction,
  InteractionEventSchema,
  applyFoldkitElementChanges,
  createFlowControls,
  createFoldkitConnectionObserver,
  createFoldkitInteractivity,
  createFoldkitNodeMeasurementObserver,
  createProgram,
  createViewportClient,
  defaultInteractionOptions,
  createFoldkitInteractionHandlers,
} from '@flow/foldkit'
import { Effect, Exit, Schema as S } from 'effect'
import { Runtime } from 'foldkit'

type InteractionEvent = typeof InteractionEventSchema.Type

type ElementChanges = typeof ElementChangesSchema.Type

export type FoldkitEventsScenario =
  | 'controlled'
  | 'editor'
  | 'switches'
  | 'fixed'

export type FoldkitDropMode = 'none' | 'add' | 'temporary'

export interface FoldkitEventsFixture {
  readonly document: () => FlowDocument
  readonly events: () => readonly InteractionEvent[]
  readonly deltas: () => readonly ElementChanges[]
  readonly connectionStates: () => readonly FlowConnectionState[]
  readonly connection: () => FlowConnectionState
  readonly setInteractivity: (next: Partial<FlowInteractivity>) => void
  readonly setAllowedTargets: (targets: readonly string[]) => void
  readonly interactivity: () => FlowInteractivity
  readonly setDropMode: (mode: FoldkitDropMode) => void
  readonly acceptTemporary: () => void
  readonly cancelTemporary: () => void
  readonly viewport: () => Viewport
  readonly interactiveCalls: () => readonly boolean[]
  /** Mount Controls wired to the switches once the canvas has rendered. */
  readonly mountControls: () => void
  /** Register an `onNodeClick` consumer, as an app handling node clicks would. */
  readonly registerNodeClickHandler: () => void
  readonly nodeClickCallbacks: () => number
}

const decodeChange = S.decodeUnknownSync(FlowStateChangeSchema)

const decodeEvents = S.decodeUnknownSync(S.Array(InteractionEventSchema))

const decodeDeltas = S.decodeUnknownSync(ElementChangesSchema)

const send = (sent: Exit.Exit<unknown, unknown>): void => {
  if (Exit.isFailure(sent)) {
    throw new Error('Foldkit rejected a fixture action')
  }
}

interface FixtureHandle {
  readonly id: string
  readonly kind: 'source' | 'target'
  readonly side: 'left' | 'right'
}

const fixtureHandle = (handle: 'in' | 'out'): FixtureHandle =>
  handle === 'in'
    ? { id: handle, kind: 'target', side: 'left' }
    : { id: handle, kind: 'source', side: 'right' }

const node = (
  id: string,
  x: number,
  y: number,
  handles: readonly ('in' | 'out')[]
) => ({
  id,
  label: id.toUpperCase(),
  position: { x, y },
  handles: handles.map(fixtureHandle),
})

const documents = {
  controlled: {
    nodes: [node('a', 60, 80, ['out']), node('b', 420, 240, ['in'])],
    edges: [],
  },
  editor: {
    nodes: [
      node('a', 40, 60, ['in', 'out']),
      node('b', 260, 60, ['in', 'out']),
      node('c', 480, 60, ['in', 'out']),
      node('blocked', 480, 240, ['in']),
      node('limit', 260, 400, ['in']),
      node('feeder', 40, 300, ['out']),
    ],
    edges: [
      {
        id: 'ab',
        source: 'a',
        sourceHandle: 'out',
        target: 'b',
        targetHandle: 'in',
      },
      {
        id: 'bc',
        source: 'b',
        sourceHandle: 'out',
        target: 'c',
        targetHandle: 'in',
      },
    ],
  },
  switches: {
    nodes: [
      node('a', 60, 80, ['out']),
      node('b', 420, 240, ['in']),
      {
        id: 'free',
        label: 'Free',
        position: { x: 60, y: 400 },
        draggable: true,
        selectable: true,
      },
    ],
    edges: [],
  },
}

/** Preventing Cycles: reject an edge whose target already reaches its source. */
const createsCycle = (connection: FlowConnection, document: FlowDocument) => {
  const seen = new Set<string>()

  const reaches = (current: Pick<FlowNode, 'id'>): boolean => {
    if (seen.has(current.id)) {
      return false
    }

    seen.add(current.id)

    return getOutgoers(current, document.nodes, document.edges).some(
      (next) => next.id === connection.source || reaches(next)
    )
  }

  return (
    connection.source === connection.target ||
    reaches({ id: connection.target })
  )
}

export const mountFoldkitEventsFixture = (
  container: HTMLElement,
  scenario: FoldkitEventsScenario
): FoldkitEventsFixture => {
  let document = Effect.runSync(
    decodeFlowDocument(documents[scenario === 'fixed' ? 'switches' : scenario])
  )

  let viewport: Viewport = { x: 0, y: 0, zoom: 1 }

  // The fixed scenario creates the program with nodes that cannot be dragged.
  const switches = {
    nodesDraggable: scenario !== 'fixed',
    nodesConnectable: true,
    elementsSelectable: true,
  }

  const active = Runtime.embed(
    createProgram(
      container,
      document,
      viewport,
      scenario === 'editor' ? [] : ['b'],
      scenario === 'controlled' ? 'controlled' : 'uncontrolled',
      'uncontrolled',
      {},
      { minZoom: 0.5, maxZoom: 2 },
      'full',
      {
        ...defaultInteractionOptions,
        nodesResizable: true,
        ...switches,
        panOnDrag: scenario === 'switches' || scenario === 'fixed',
        // Validation and Preventing Cycles in one callback.
        isValidConnection: (connection, current) =>
          scenario !== 'editor' ||
          (connection.target !== 'blocked' &&
            !createsCycle(connection, current)),
      }
    )
  )

  createFoldkitNodeMeasurementObserver({
    owner: container.parentElement ?? container,
    zoom: () => viewport.zoom,
    onMeasure: ({ requestId, measurement }) =>
      send(
        active.ports.actions.send(
          HostAction.MeasureNode({ requestId, measurement })
        )
      ),
  })

  const host = container.parentElement ?? container.ownerDocument.body

  const pane = () => {
    const canvas = host.querySelector<HTMLElement>('.flow-foldkit-canvas')

    if (canvas === null) {
      throw new Error('Foldkit canvas has not rendered')
    }

    return canvas
  }

  const viewportClient = createViewportClient(
    active.ports,
    () => {
      const bounds = pane().getBoundingClientRect()

      return {
        width: bounds.width,
        height: bounds.height,
        originX: bounds.left,
        originY: bounds.top,
      }
    },
    viewport
  )

  const interactivity = createFoldkitInteractivity(active.ports)
  const events: InteractionEvent[] = []
  const deltas: ElementChanges[] = []
  const connectionStates: FlowConnectionState[] = []
  const interactiveCalls: boolean[] = []

  const connection = createFoldkitConnectionObserver(
    active.ports.connectionStates
  )

  let dropMode: FoldkitDropMode = 'none'
  let editNumber = 0

  let temporary:
    | { readonly nodeId: string; readonly edgeId: string }
    | undefined

  let menu: HTMLElement | undefined

  connection.subscribeConnection((state) => connectionStates.push(state))

  const edit = (transaction: FlowEditTransactionInput): void => {
    editNumber += 1
    send(
      active.ports.editRequests.send({
        requestId: `events-${editNumber}`,
        transaction,
      })
    )
  }

  active.ports.acceptedStates.subscribe((accepted) => {
    ;({ document, viewport } = decodeChange(accepted).current)

    // Connection Limit: the limit handle accepts one connection.
    const limitNode = document.nodes.find(({ id }) => id === 'limit')
    const used = document.edges.some(({ target }) => target === 'limit')
    const handle = limitNode?.handles?.[0]

    if (handle !== undefined && (handle.connectable !== false) === used) {
      send(
        active.ports.actions.send(
          HostAction.ReplaceDocument({
            document: {
              ...document,
              nodes: document.nodes.map((candidate) =>
                candidate.id === 'limit'
                  ? {
                      ...candidate,
                      handles: [{ ...handle, connectable: !used }],
                    }
                  : candidate
              ),
            },
          })
        )
      )
    }
  })

  // Controlled flow: apply the deltas and hand the document back.
  active.ports.elementChanges.subscribe((encoded) => {
    const changes = decodeDeltas(encoded)
    deltas.push(changes)

    if (scenario === 'controlled') {
      document = applyFoldkitElementChanges(document, changes)
      send(active.ports.actions.send(HostAction.ReplaceDocument({ document })))
    }
  })

  const closeMenu = () => {
    menu?.remove()
    menu = undefined
  }

  const openMenu = (
    event: InteractionEvent,
    items: readonly { readonly label: string; readonly run: () => void }[]
  ) => {
    closeMenu()
    const element = container.ownerDocument.createElement('div')
    element.className = 'fixture-context-menu'
    element.setAttribute('role', 'menu')
    element.style.position = 'fixed'
    element.style.left = `${event.clientX ?? 0}px`
    element.style.top = `${event.clientY ?? 0}px`
    element.style.zIndex = '10000'

    for (const item of items) {
      const button = container.ownerDocument.createElement('button')
      button.type = 'button'
      button.setAttribute('role', 'menuitem')
      button.textContent = item.label
      button.addEventListener('click', () => {
        item.run()
        closeMenu()
      })
      element.append(button)
    }

    element.addEventListener('keydown', (keyboard) => {
      if (keyboard.key === 'Escape') {
        closeMenu()
      }
    })
    container.ownerDocument.body.append(element)
    menu = element
    element.querySelector('button')?.focus()
  }

  const dropOnPane = async (event: InteractionEvent) => {
    const state = event.connectionState

    if (
      dropMode === 'none' ||
      state === undefined ||
      state.toNodeId !== null ||
      event.clientX === undefined ||
      event.clientY === undefined
    ) {
      return
    }

    const { point } = await viewportClient.screenToFlow({
      x: event.clientX,
      y: event.clientY,
    })

    if (point === undefined) {
      return
    }

    editNumber += 1
    const nodeId = `dropped-${editNumber}`
    const edgeId = `drop-edge-${editNumber}`
    const marked = dropMode === 'temporary'

    edit({
      operations: [
        {
          kind: 'add-nodes',
          nodes: [
            {
              ...node(nodeId, point.x, point.y, ['in']),
              data: { temporary: marked },
            },
          ],
        },
        {
          kind: 'add-edges',
          edges: [
            {
              id: edgeId,
              source: state.fromNodeId,
              sourceHandle: state.fromHandleId,
              target: nodeId,
              targetHandle: 'in',
              data: { temporary: marked },
            },
          ],
        },
      ],
    })

    if (marked) {
      temporary = { nodeId, edgeId }
    }
  }

  const handleEvent = (event: InteractionEvent): void => {
    if (event.name === 'onConnectEnd') {
      void dropOnPane(event)
    }

    if (
      event.name === 'onNodeContextMenu' &&
      event.nodeId !== undefined &&
      event.nodeId !== null
    ) {
      const { nodeId } = event

      openMenu(event, [
        {
          label: 'Duplicate',
          run: () => {
            const original = document.nodes.find(({ id }) => id === nodeId)

            if (original !== undefined) {
              edit({
                operations: [
                  {
                    kind: 'add-nodes',
                    nodes: [
                      {
                        ...original,
                        id: `${nodeId}-copy`,
                        selected: false,
                        position: {
                          x: original.position.x + 40,
                          y: original.position.y + 40,
                        },
                      },
                    ],
                  },
                ],
              })
            }
          },
        },
        {
          label: 'Delete',
          run: () =>
            edit({
              operations: [{ kind: 'delete-elements', nodeIds: [nodeId] }],
            }),
        },
      ])
    }

    if (
      event.name === 'onEdgeContextMenu' &&
      event.edgeId !== undefined &&
      event.edgeId !== null
    ) {
      const { edgeId } = event

      openMenu(event, [
        {
          label: 'Delete edge',
          run: () =>
            edit({
              operations: [{ kind: 'delete-elements', edgeIds: [edgeId] }],
            }),
        },
      ])
    }

    if (event.name === 'onPaneClick') {
      closeMenu()
    }
  }

  active.ports.interactionEvents.subscribe((encoded) => {
    const batch = decodeEvents(encoded)

    events.push(...batch)

    for (const event of batch) {
      handleEvent(event)
    }
  })

  let nodeClickCallbacks = 0

  return {
    nodeClickCallbacks: () => nodeClickCallbacks,
    registerNodeClickHandler: () => {
      createFoldkitInteractionHandlers(active.ports, {
        onNodeClick: () => {
          nodeClickCallbacks += 1
        },
      })
    },
    mountControls: () => {
      const controls = createFlowControls(
        pane().ownerDocument,
        viewportClient,
        {
          interactivity,
          onInteractiveChange: (next) => interactiveCalls.push(next),
        }
      )

      controls.element.classList.add(
        'flow-foldkit-panel',
        'flow-foldkit-panel-bottom-left'
      )
      pane().append(controls.element)
    },
    document: () => document,
    events: () => events,
    deltas: () => deltas,
    connectionStates: () => connectionStates,
    connection: connection.getConnection,
    setInteractivity: (next) => interactivity.set(next),
    setAllowedTargets: (targets) =>
      send(
        active.ports.actions.send(HostAction.SetAllowedTargets({ targets }))
      ),
    interactivity: interactivity.get,
    setDropMode: (mode) => {
      dropMode = mode
    },
    acceptTemporary: () => {
      if (temporary === undefined) {
        return
      }

      edit({
        operations: [
          {
            kind: 'update-node-data',
            nodeId: temporary.nodeId,
            data: { temporary: false },
          },
          {
            kind: 'update-edge-data',
            edgeId: temporary.edgeId,
            data: { temporary: false },
          },
        ],
      })
      temporary = undefined
    },
    cancelTemporary: () => {
      if (temporary === undefined) {
        return
      }

      edit({
        operations: [
          {
            kind: 'delete-elements',
            nodeIds: [temporary.nodeId],
            edgeIds: [temporary.edgeId],
          },
        ],
      })
      temporary = undefined
    },
    viewport: () => viewport,
    interactiveCalls: () => interactiveCalls,
  }
}
