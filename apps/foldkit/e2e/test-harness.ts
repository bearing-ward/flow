import {
  FlowCommandSchema,
  FlowEditDisposedSchema,
  NodeIdSchema,
  decodeFlowDocument,
  FlowSnapshotSchema,
  applyNodeBoundsChange,
  NodeBoundsChangeSchema,
} from '@flow/core'
import type {
  ConnectionPreviewState,
  Viewport,
  FlowChangeSchema,
  FlowDocumentSchema,
  FlowInternalNodeSchema,
  FlowStateChangeSchema,
  FlowEditTransactionSchema,
} from '@flow/core'
import {
  HostAction,
  createProgram,
  createFoldkitSnapshotClient,
  createViewportClient,
  defaultInteractionOptions,
  Message,
  createFoldkitObservers,
  createFoldkitNodeMeasurementObserver,
} from '@flow/foldkit'
import type {
  MeasurementResultSchema,
  FoldkitNodeMeasurementObserver,
  ViewportEventSchema,
  ViewportRequestSchema,
  ViewportResponseSchema,
  InteractionEventSchema,
  EditResponse,
  FoldkitObservers,
  FoldkitVersionedSnapshotClient,
  FoldkitSnapshotResult,
  FlowKeyCode,
  FlowKeyPressOptions,
  GraphInteractionOptions,
  ports,
  SnapshotRequest,
  VersionedSnapshotResponseSchema,
  ViewportClient,
} from '@flow/foldkit'
import { Effect, Exit, Match, Schema } from 'effect'
import { Runtime } from 'foldkit'

import type {
  ConformanceFixture,
  PublicEditQueuedDisposal,
  PublicStateRead,
} from '../../../packages/conformance/src/index.ts'

import '@flow/foldkit/style.css'
import '../src/playground.css'

interface FoldkitHarness {
  startMountedMeasurementObserver: () => void
  mount: (
    fixture: ConformanceFixture,
    selectionMode?: 'full' | 'partial',
    interactionOptions?: GraphInteractionOptions,
    previewProbe?: boolean
  ) => Promise<void>
  connectionPreviewStates: () => readonly ConnectionPreviewState[]
  readConnectionPreview: () => Promise<
    EncodedSnapshotResponse['connectionPreview']
  >
  mountMeasurementDocument: (
    document: typeof FlowDocumentSchema.Encoded,
    renderOnlyVisible: boolean
  ) => Promise<void>
  updateMeasurementDocument: (
    document: typeof FlowDocumentSchema.Encoded
  ) => Promise<void>
  measurementInternalNode: (
    nodeId: string
  ) => Promise<typeof FlowInternalNodeSchema.Encoded | null>
  measurementNodesInitialized: (includeHidden: boolean) => Promise<boolean>
  refreshMeasurementNode: (nodeId: string) => Promise<{
    readonly status: string
    readonly width: number | null
    readonly height: number | null
  }>
  destroyMeasurementDocument: () => Promise<void>
  startRendererContract: () => Promise<void>
  startRendererFixture: (
    document: typeof FlowDocumentSchema.Encoded,
    defaultEdgeOptions?: GraphInteractionOptions['defaultEdgeOptions']
  ) => Promise<Readonly<Record<string, number>>>
  replaceRendererDocument: (document: typeof FlowDocumentSchema.Encoded) => void
  rendererContractState: () => {
    readonly renderCalls: number
    readonly disposedPrograms: number
  }
  rendererCallCounts: () => readonly number[]
  rendererInteractionEvents: (
    index: number
  ) => readonly (typeof InteractionEventSchema.Encoded)[]
  rendererChanges: (index: number) => readonly EncodedFlowChange[]
  clearRendererInteractionEvents: () => void
  disposeRendererContract: () => Promise<number>
  acknowledgeNextResize: (document: typeof FlowDocumentSchema.Encoded) => void
  attachResizeMeasurementObserver: () => void
  resizeMeasurements: () => readonly {
    nodeId: string
    width: number
    height: number
  }[]
  stopResizeMeasurementObserver: () => void
  replaceDocument: (document: typeof FlowDocumentSchema.Encoded) => void
  replaceViewport: (viewport: Viewport) => void
  changeKinds: () => readonly string[]
  changes: () => readonly EncodedFlowChange[]
  interactionEvents: () => readonly (typeof InteractionEventSchema.Encoded)[]
  dispose: () => void
  finishDestroy: () => Promise<{
    readonly mountedElements: number
    readonly changesAfterDestroy: number
    readonly acceptedStatesAfterDestroy: number
  }>
  destroy: () => Promise<{
    readonly mountedElements: number
    readonly changesAfterDestroy: number
    readonly acceptedStatesAfterDestroy: number
  }>
  startPublicState: () => Promise<void>
  startPublicObservers: (
    id: PublicProgramId,
    target: HTMLElement
  ) => Promise<void>
  subscribePublicSelection: (id: PublicProgramId) => void
  publicSelectionEvents: (id: PublicProgramId) => readonly string[]
  observePublicNodeConnections: (
    id: PublicProgramId,
    nodeId: string,
    failDisconnectOnce?: boolean,
    filter?: {
      readonly type?: 'source' | 'target'
      readonly handleId?: string | null
    }
  ) => void
  stopPublicNodeConnections: (id: PublicProgramId) => void
  publicNodeConnectionEvents: (id: PublicProgramId) => readonly string[]
  publicNodeConnectionErrors: (id: PublicProgramId) => readonly string[]
  observePublicKeyPress: (id: PublicProgramId, target: HTMLElement) => void
  publicKeyStates: (id: PublicProgramId) => readonly boolean[]
  observeContractKeyPress: (
    programId: PublicProgramId,
    observerId: string,
    keyCode: FlowKeyCode,
    options: FlowKeyPressOptions
  ) => void
  contractKeyStates: (
    programId: PublicProgramId,
    observerId: string
  ) => readonly boolean[]
  unsubscribeContractKeyPress: (
    programId: PublicProgramId,
    observerId: string
  ) => void
  disposePublicObservers: (id: PublicProgramId) => void
  startConnectionPreviewIsolation: () => Promise<void>
  requestSnapshot: (
    id: PublicProgramId,
    query?: Omit<SnapshotRequest, 'requestId'>
  ) => Promise<EncodedSnapshotResponse>
  requestSnapshotResult: (id: PublicProgramId) => Promise<FoldkitSnapshotResult>
  refreshPublicNode: (
    id: PublicProgramId,
    nodeId: string,
    generation?: number
  ) => Promise<typeof MeasurementResultSchema.Encoded>
  replacePublicDocument: (
    id: PublicProgramId,
    document: typeof FlowDocumentSchema.Encoded
  ) => void
  replacePublicViewport: (id: PublicProgramId, viewport: Viewport) => void
  dispatchPublicCommand: (
    id: PublicProgramId,
    command: typeof FlowCommandSchema.Encoded
  ) => void
  requestPublicEdit: (
    id: PublicProgramId,
    transaction: typeof FlowEditTransactionSchema.Encoded
  ) => Promise<EditResponse>
  requestPublicViewport: (
    id: PublicProgramId,
    request: Omit<typeof ViewportRequestSchema.Type, 'requestId'>
  ) => Promise<typeof ViewportResponseSchema.Type>
  requestViewportClient: (
    id: PublicProgramId,
    request: Parameters<ViewportClient['request']>[0]
  ) => Promise<typeof ViewportResponseSchema.Type>
  exercisePublicEditReentrancy: () => Promise<{
    readonly responseOrder: readonly string[]
    readonly firstCount: number
    readonly secondCount: number
    readonly finalCount: number
  }>
  exercisePublicEditDisposal: (scenario: PublicEditQueuedDisposal) => Promise<{
    readonly responseTags: readonly string[]
    readonly responseOrder: readonly string[]
    readonly pendingCount: number
    readonly lateNotifications: number
  }>
  publicChanges: (id: PublicProgramId) => readonly EncodedFlowChange[]
  publicAcceptedStates: (
    id: PublicProgramId
  ) => readonly EncodedFlowStateChange[]
  publicEventOrder: (id: PublicProgramId) => readonly string[]
  publicMeasurementResults: (
    id: PublicProgramId
  ) => readonly MeasurementResultEncoded[]
  publicViewportEvents: (
    id: PublicProgramId
  ) => readonly (typeof ViewportEventSchema.Encoded)[]
  publicInteractionEvents: (
    id: PublicProgramId
  ) => readonly (typeof InteractionEventSchema.Encoded)[]
  readMountedState: (
    query: Omit<SnapshotRequest, 'requestId'>
  ) => Promise<PublicStateRead>
  mountedAcceptedStates: () => readonly EncodedFlowStateChange[]
  exercisePublicReentrancy: () => Promise<readonly string[]>
  exercisePublicUnsubscribe: () => Promise<number>
  exercisePublicListenerFailure: () => Promise<number>
  settlePublicState: () => Promise<void>
  disposePublicState: () => void
  probeAfterPublicDisposal: (id: PublicProgramId) => Promise<{
    readonly acceptedCount: number
    readonly changeCount: number
    readonly mountedElements: number
  }>
}

declare global {
  interface Window {
    __flowFoldkitTest?: FoldkitHarness
  }
}

let handle: Runtime.EmbedHandle<typeof ports> | undefined

type PublicProgramId = 'uncontrolled' | 'controlled'

const nextAnimationFrame = (): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<undefined>()
  requestAnimationFrame(() => resolve())

  return promise
}

let unsubscribe: (() => void) | undefined

let changesAtDispose = 0

let acceptedStatesAtDispose = 0

type EncodedFlowChange = typeof FlowChangeSchema.Encoded

type EncodedFlowStateChange = typeof FlowStateChangeSchema.Encoded

type EncodedSnapshotResponse = typeof VersionedSnapshotResponseSchema.Encoded

type MeasurementResultEncoded = typeof MeasurementResultSchema.Encoded

const publicHandles = new Map<
  PublicProgramId,
  Runtime.EmbedHandle<typeof ports>
>()

const publicViewportClients = new Map<PublicProgramId, ViewportClient>()

const publicContainers = new Map<PublicProgramId, HTMLElement>()

const pendingMeasurements = new Map<
  string,
  {
    readonly nodeId: string
    readonly resolve: (result: typeof MeasurementResultSchema.Encoded) => void
  }
>()

const pendingViewport = new Map<
  string,
  (response: typeof ViewportResponseSchema.Type) => void
>()

const publicChangeEvents = new Map<PublicProgramId, EncodedFlowChange[]>()

const publicStateEvents = new Map<PublicProgramId, EncodedFlowStateChange[]>()

const publicEventOrders = new Map<PublicProgramId, string[]>()

const publicMeasurementEvents = new Map<
  PublicProgramId,
  MeasurementResultEncoded[]
>()

const publicViewportEventLog = new Map<
  PublicProgramId,
  (typeof ViewportEventSchema.Encoded)[]
>()

const publicInteractionEventLog = new Map<
  PublicProgramId,
  (typeof InteractionEventSchema.Encoded)[]
>()

const publicObservers = new Map<PublicProgramId, FoldkitObservers>()

const publicSelectionEventLog = new Map<PublicProgramId, string[]>()

const publicNodeConnectionEventLog = new Map<PublicProgramId, string[]>()

const publicNodeConnectionErrorLog = new Map<PublicProgramId, string[]>()

const publicNodeConnectionStops = new Map<PublicProgramId, () => void>()

const publicKeyStateLog = new Map<PublicProgramId, boolean[]>()

const contractKeyStateLogs = new Map<string, boolean[]>()

const contractKeyStops = new Map<string, () => void>()

const contractKeyObserverId = (
  programId: PublicProgramId,
  observerId: string
): string => `${programId}:${observerId}`

const snapshotClients = new WeakMap<
  Runtime.EmbedHandle<typeof ports>,
  FoldkitVersionedSnapshotClient
>()

const mountedMeasurementObservers = new WeakMap<
  Runtime.EmbedHandle<typeof ports>,
  FoldkitNodeMeasurementObserver
>()

const startMountedMeasurementObserver = (): void => {
  const active = handle
  const roots = document.querySelectorAll<HTMLElement>('.flow-foldkit-root')
  const [owner] = roots

  if (active === undefined || roots.length !== 1 || owner === undefined) {
    throw new Error('Missing mounted Foldkit measurement owner')
  }

  mountedMeasurementObservers.get(active)?.dispose()

  const observer = createFoldkitNodeMeasurementObserver({
    owner,
    zoom: () => 1,
    onMeasure: ({ requestId, measurement }) => {
      const sent = active.ports.actions.send(
        HostAction.MeasureNode({ requestId, measurement })
      )

      if (Exit.isFailure(sent)) {
        throw new Error('Mounted Foldkit measurement send failed')
      }
    },
  })

  mountedMeasurementObservers.set(active, observer)
}

const requestHandleSnapshot = async (
  active: Runtime.EmbedHandle<typeof ports>,
  query: Omit<SnapshotRequest, 'requestId'> = {}
): Promise<EncodedSnapshotResponse> => {
  let client = snapshotClients.get(active)

  if (client === undefined) {
    client = createFoldkitSnapshotClient(active.ports)
    snapshotClients.set(active, client)
  }

  const result = await client.requestVersioned(query)

  return Match.value(result).pipe(
    Match.when({ status: 'succeeded' }, ({ response }) => response),
    Match.when({ status: 'failed' }, ({ reason }) => {
      throw new Error(`Foldkit snapshot failed: ${reason}`)
    }),
    Match.when({ status: 'disposed' }, () => {
      throw new Error('Foldkit snapshot owner is disposed')
    }),
    Match.exhaustive
  )
}

const disposeHandle = (
  active: Runtime.EmbedHandle<typeof ports> | undefined
): void => {
  if (active === undefined) {
    return
  }

  mountedMeasurementObservers.get(active)?.dispose()
  mountedMeasurementObservers.delete(active)

  let client = snapshotClients.get(active)

  if (client === undefined) {
    client = createFoldkitSnapshotClient(active.ports)
    snapshotClients.set(active, client)
  }

  client.dispose()
  active.dispose()
}

const requestSnapshotResult = (
  id: PublicProgramId
): Promise<FoldkitSnapshotResult> => {
  const active = publicHandles.get(id)

  if (active === undefined) {
    throw new Error(`Missing ${id} Foldkit program`)
  }

  let client = snapshotClients.get(active)

  if (client === undefined) {
    client = createFoldkitSnapshotClient(active.ports)
    snapshotClients.set(active, client)
  }

  return client.request()
}

const pendingEdits = new Map<string, (response: EditResponse) => void>()

let nextEditRequestId = 1

let secondPublicContainer: HTMLElement | undefined

let changes: EncodedFlowChange[] = []

let mountedAcceptedStateEvents: EncodedFlowStateChange[] = []

let mountedInteractionEvents: (typeof InteractionEventSchema.Encoded)[] = []

let nextMountedRequestId = 1

const rendererHandles: Runtime.EmbedHandle<typeof ports>[] = []

let rendererFixtureGeneration = 0

let rendererCalls = 0

let rendererCallsByHost: number[] = []

let rendererEventsByHost: (typeof InteractionEventSchema.Encoded)[][] = []

let rendererChangesByHost: EncodedFlowChange[][] = []

let disposedRendererPrograms = 0

const collectRendererEvents = (
  hostIndex: number,
  active: Runtime.EmbedHandle<typeof ports>
): void => {
  active.ports.interactionEvents.subscribe((events) => {
    rendererEventsByHost[hostIndex]?.push(...events)
  })
  active.ports.changes.subscribe((change) => {
    rendererChangesByHost[hostIndex]?.push(change)
  })
}

const measureRendererFixtureNode = async (
  active: Runtime.EmbedHandle<typeof ports>,
  node: HTMLElement
): Promise<readonly [string, number]> => {
  const { nodeId } = node.dataset

  if (nodeId === undefined) {
    throw new Error('Foldkit renderer fixture node has no identity')
  }

  rendererFixtureGeneration += 1
  const bounds = node.getBoundingClientRect()
  const requestId = `renderer-fixture-${rendererFixtureGeneration}`

  const response =
    Promise.withResolvers<typeof MeasurementResultSchema.Encoded>()

  const stopListening = active.ports.measurementResults.subscribe((result) => {
    if (result.requestId === requestId) {
      response.resolve(result)
    }
  })

  const result = active.ports.actions.send(
    HostAction.MeasureNode({
      requestId,
      measurement: {
        nodeId: NodeIdSchema.make(nodeId),
        width: bounds.width,
        height: bounds.height,
        generation: rendererFixtureGeneration,
      },
    })
  )

  if (Exit.isFailure(result)) {
    stopListening()
    throw new Error(`Foldkit rejected fixture measurement for ${nodeId}`)
  }

  const accepted = await response.promise
  stopListening()

  if (accepted.status !== 'measured') {
    throw new Error(
      `Foldkit did not accept fixture measurement for ${nodeId}: ${accepted.status}`
    )
  }

  if (accepted.internalNode?.height !== bounds.height) {
    throw new Error(
      `Foldkit accepted ${nodeId} at ${String(accepted.internalNode?.height)}px high; DOM measured ${bounds.height}px`
    )
  }

  return [nodeId, bounds.height]
}

const measureRendererFixtureNodes = async (
  active: Runtime.EmbedHandle<typeof ports>,
  nodes: readonly HTMLElement[],
  index = 0,
  measured: readonly (readonly [string, number])[] = []
): Promise<readonly (readonly [string, number])[]> => {
  const node = nodes[index]

  if (node === undefined) {
    return measured
  }

  const nextMeasurement = await measureRendererFixtureNode(active, node)

  return measureRendererFixtureNodes(active, nodes, index + 1, [
    ...measured,
    nextMeasurement,
  ])
}

const rendererDocument = {
  nodes: [
    {
      id: 'renderer-custom',
      label: 'Custom node',
      type: 'custom-node',
      position: { x: 50, y: 70 },
      data: { revision: 1 },
      handles: [{ id: 'out', kind: 'source', side: 'right' }],
    },
    {
      id: 'renderer-fallback',
      label: 'Fallback node',
      type: 'unknown-node',
      position: { x: 360, y: 70 },
      handles: [{ id: 'in', kind: 'target', side: 'left' }],
    },
  ],
  edges: [
    {
      id: 'renderer-custom-edge',
      source: 'renderer-custom',
      target: 'renderer-fallback',
      type: 'custom-edge',
      path: 'smoothstep',
      sourceHandle: 'out',
      targetHandle: 'in',
      label: 'Custom label',
      markerEnd: 'arrowclosed',
    },
    ...(['straight', 'bezier', 'step', 'simplebezier'] as const).map(
      (path, index) => ({
        id: `renderer-${path}`,
        source: 'renderer-custom',
        target: 'renderer-fallback',
        path,
        zIndex: index,
      })
    ),
  ],
} satisfies typeof FlowDocumentSchema.Encoded

const startRendererContract = async (): Promise<void> => {
  for (const active of rendererHandles.splice(0)) {
    disposeHandle(active)
  }

  disposedRendererPrograms = 0
  rendererCalls = 0
  rendererCallsByHost = [0, 0]
  rendererEventsByHost = [[], []]
  rendererChangesByHost = [[], []]

  const host = document.querySelector<HTMLElement>('#app')

  if (host === null) {
    throw new Error('Missing Foldkit renderer host')
  }

  host.innerHTML =
    '<div id="renderer-first"></div><div id="renderer-second"></div>'

  const decoded = Effect.runSync(decodeFlowDocument(rendererDocument))

  const registryForHost = (
    hostIndex: number
  ): NonNullable<Parameters<typeof createProgram>[6]> => ({
    nodeTypes: {
      'custom-node': (node, h) => {
        rendererCalls += 1
        rendererCallsByHost[hostIndex] =
          (rendererCallsByHost[hostIndex] ?? 0) + 1

        return h.div(
          [
            h.Class('custom-node-view'),
            h.DataAttribute('renderer-label', node.label),
            h.DataAttribute('revision', String(node.data?.revision ?? 0)),
          ],
          [
            h.div([h.Class('custom-node-label')], [node.label]),
            h.div(
              [
                h.Class('custom-node-status'),
                h.DataAttribute(
                  'status',
                  String(node.data?.status ?? 'waiting')
                ),
              ],
              [String(node.data?.status ?? 'waiting')]
            ),
            h.div(
              [h.Class('custom-node-detail')],
              [String(node.data?.detail ?? 'Build is queued')]
            ),
            h.button(
              [
                h.Class('custom-node-status-control'),
                h.Type('button'),
                h.OnClick(
                  Message.EditRequest({
                    requestId: `custom-node-status-${node.id}`,
                    transaction: {
                      operations: [
                        {
                          kind: 'update-node-data',
                          nodeId: node.id,
                          data: {
                            status: 'ready',
                            detail: 'All checks passed',
                          },
                        },
                      ],
                    },
                  })
                ),
              ],
              ['Mark ready']
            ),
            h.div(
              [
                h.Class('custom-node-no-drag'),
                h.DataAttribute('flow-nodrag', 'true'),
              ],
              ['No drag region']
            ),
            h.input([
              h.Class('custom-node-input'),
              h.Attribute('placeholder', node.label),
              h.AriaLabel(`${node.label} editor`),
            ]),
            h.button(
              [
                h.Class('custom-node-action'),
                h.Type('button'),
                h.OnClick(
                  Message.DispatchCommand({
                    command: {
                      kind: 'set-node-position',
                      nodeId: node.id,
                      position: { x: 90, y: 160 },
                    },
                  })
                ),
              ],
              ['Move node']
            ),
          ]
        )
      },
    },
    edgeTypes: {
      'custom-edge': (edge, geometry, h) => {
        rendererCalls += 1
        rendererCallsByHost[hostIndex] =
          (rendererCallsByHost[hostIndex] ?? 0) + 1

        return h.path([
          h.Class('custom-edge-view'),
          h.DataAttribute('renderer-label', edge.label ?? ''),
          h.D(geometry.path),
          h.Fill('none'),
          h.Stroke('#d946ef'),
          h.StrokeWidth('3'),
          ...(geometry.markerEndId === undefined
            ? []
            : [h.MarkerEnd(`url(#${geometry.markerEndId})`)]),
        ])
      },
    },
  })

  for (const [hostIndex, id] of [
    'renderer-first',
    'renderer-second',
  ].entries()) {
    const container = document.querySelector<HTMLElement>(`#${id}`)

    if (container === null) {
      throw new Error(`Missing ${id}`)
    }

    const active = Runtime.embed<typeof ports, never, 'Element'>(
      createProgram(
        container,
        decoded,
        { x: 0, y: 0, zoom: 1 },
        [],
        'uncontrolled',
        'uncontrolled',
        registryForHost(hostIndex)
      )
    )

    rendererHandles.push(active)
    collectRendererEvents(hostIndex, active)
  }

  await nextAnimationFrame()
}

const waitForRendererFixtureNodes = async (
  expectedCount: number,
  attempt = 0
): Promise<readonly HTMLElement[]> => {
  const nodes = [
    ...document.querySelectorAll<HTMLElement>('.flow-foldkit-node'),
  ]

  if (nodes.length === expectedCount) {
    return nodes
  }

  if (attempt === 8) {
    throw new Error(
      `Foldkit rendered ${nodes.length} of ${expectedCount} fixture nodes`
    )
  }

  await nextAnimationFrame()

  return waitForRendererFixtureNodes(expectedCount, attempt + 1)
}

const readRendererFixtureHeight = async (
  active: Runtime.EmbedHandle<typeof ports>,
  nodeId: string,
  expectedHeight: number,
  attempt = 0
): Promise<number> => {
  const snapshot = await requestHandleSnapshot(active, { nodeId })

  if (snapshot.internalNode === null) {
    throw new Error(`Foldkit omitted fixture internal node ${nodeId}`)
  }

  if (snapshot.internalNode.height === expectedHeight || attempt === 8) {
    return snapshot.internalNode.height
  }

  await nextAnimationFrame()

  return readRendererFixtureHeight(active, nodeId, expectedHeight, attempt + 1)
}

const startRendererFixture = async (
  input: typeof FlowDocumentSchema.Encoded,
  defaultEdgeOptions?: GraphInteractionOptions['defaultEdgeOptions']
): Promise<Readonly<Record<string, number>>> => {
  for (const active of rendererHandles.splice(0)) {
    disposeHandle(active)
  }

  const host = document.querySelector<HTMLElement>('#app')

  if (host === null) {
    throw new Error('Missing Foldkit renderer fixture host')
  }

  host.innerHTML = '<div id="renderer-fixture"></div>'

  const container = document.querySelector<HTMLElement>('#renderer-fixture')

  if (container === null) {
    throw new Error('Missing Foldkit renderer fixture container')
  }

  const decoded = Effect.runSync(decodeFlowDocument(input))

  const interactionOptions = { ...defaultInteractionOptions }

  if (defaultEdgeOptions !== undefined) {
    interactionOptions.defaultEdgeOptions = defaultEdgeOptions
  }

  const registry: NonNullable<Parameters<typeof createProgram>[6]> = {
    nodeTypes: {
      'contract-node': (node, h) => {
        const width = node.size?.width ?? 140
        const height = node.size?.height ?? 76

        return h.div(
          [
            h.Class('contract-node-view'),
            h.Style({ width: `${width}px`, height: `${height}px` }),
          ],
          [node.label]
        )
      },
    },
    edgeTypes: {
      'contract-edge': (_edge, geometry, h) =>
        h.path([
          h.Class('contract-edge-view'),
          h.D(geometry.path),
          h.Fill('none'),
          h.Stroke('#d946ef'),
          h.StrokeWidth('3'),
          ...(geometry.markerStartId === undefined
            ? []
            : [h.MarkerStart(`url(#${geometry.markerStartId})`)]),
          ...(geometry.markerEndId === undefined
            ? []
            : [h.MarkerEnd(`url(#${geometry.markerEndId})`)]),
        ]),
    },
  }

  const active = Runtime.embed<typeof ports, never, 'Element'>(
    createProgram(
      container,
      decoded,
      { x: 0, y: 0, zoom: 1 },
      [],
      'uncontrolled',
      'uncontrolled',
      registry,
      undefined,
      'full',
      interactionOptions
    )
  )

  rendererHandles.push(active)
  await nextAnimationFrame()
  await nextAnimationFrame()

  const renderedNodes = await waitForRendererFixtureNodes(input.nodes.length)
  const measuredNodes = await measureRendererFixtureNodes(active, renderedNodes)

  await nextAnimationFrame()
  await nextAnimationFrame()

  const internalHeights = await Promise.all(
    measuredNodes.map(([nodeId, expectedHeight]) =>
      readRendererFixtureHeight(active, nodeId, expectedHeight)
    )
  )

  return Object.fromEntries(
    measuredNodes.map(([nodeId], index) => [
      nodeId,
      internalHeights[index] ?? -1,
    ])
  )
}

const replaceRendererDocument = (
  input: typeof FlowDocumentSchema.Encoded
): void => {
  const decoded = Effect.runSync(decodeFlowDocument(input))

  for (const active of rendererHandles) {
    active.ports.actions.send(HostAction.ReplaceDocument({ document: decoded }))
  }
}

const disposeRendererContract = async (): Promise<number> => {
  for (const active of rendererHandles.splice(0)) {
    disposeHandle(active)
    disposedRendererPrograms += 1
  }

  await nextAnimationFrame()
  await nextAnimationFrame()

  return document.querySelectorAll('[data-testid="flow-canvas"]').length
}

let resizeMeasurementObserver:
  | ReturnType<typeof createFoldkitNodeMeasurementObserver>
  | undefined

const resizeMeasurementRequests: {
  nodeId: string
  width: number
  height: number
}[] = []

const stopResizeMeasurementObserver = (): void => {
  resizeMeasurementObserver?.dispose()
  resizeMeasurementObserver = undefined
}

const attachResizeMeasurementObserver = (): void => {
  stopResizeMeasurementObserver()
  const active = handle

  const owner = document.querySelector<HTMLElement>(
    '[data-testid="flow-canvas"]'
  )

  if (active === undefined || owner === null) {
    throw new Error('Missing resize measurement host')
  }

  resizeMeasurementRequests.length = 0
  resizeMeasurementObserver = createFoldkitNodeMeasurementObserver({
    owner,
    onMeasure: ({ requestId, measurement }) => {
      resizeMeasurementRequests.push({
        nodeId: measurement.nodeId,
        width: measurement.width,
        height: measurement.height,
      })
      active.ports.actions.send(
        HostAction.MeasureNode({ requestId, measurement })
      )
    },
  })
}

let resizeAcknowledgement: typeof FlowDocumentSchema.Type | undefined

const acknowledgeNextResize = (
  input: typeof FlowDocumentSchema.Encoded
): void => {
  resizeAcknowledgement = Effect.runSync(decodeFlowDocument(input))
}

let measurementGeneration = 0

const measurementGenerations = new Map<string, number>()

const pendingMountedMeasurements = new Map<
  string,
  (response: MeasurementResultEncoded) => void
>()

let previewProbeStates: ConnectionPreviewState[] = []

const mount = async (
  fixture: ConformanceFixture,
  selectionMode: 'full' | 'partial' = 'full',
  interactionOptions: GraphInteractionOptions = defaultInteractionOptions,
  previewProbe = false
): Promise<void> => {
  disposeHandle(handle)
  const container = document.querySelector<HTMLElement>('#app')

  if (container === null) {
    throw new Error('Missing Foldkit test host')
  }

  const decoded = Effect.runSync(decodeFlowDocument(fixture.document))
  previewProbeStates = []

  const program = createProgram(
    container,
    decoded,
    { x: 0, y: 0, zoom: 1 },
    fixture.allowedConnectionTargets ?? [],
    fixture.documentMode,
    fixture.viewportMode,
    previewProbe
      ? {
          connectionPreview: (state, h) => {
            previewProbeStates.push(state)

            return h.svg(
              [
                h.Class('flow-foldkit-connection-preview-probe'),
                h.DataAttribute('preview-kind', state.kind),
                h.DataAttribute(
                  'preview-valid',
                  state.valid === null ? 'pending' : String(state.valid)
                ),
                h.DataAttribute(
                  'candidate-target',
                  state.candidate?.target ?? ''
                ),
                h.Attribute('width', '960'),
                h.Attribute('height', '640'),
                h.ViewBox('0 0 960 640'),
              ],
              [
                h.path([
                  h.Class('flow-foldkit-connection-preview-probe-path'),
                  h.D(
                    `M ${state.from.x} ${state.from.y} L ${state.to.x} ${state.to.y}`
                  ),
                ]),
              ]
            )
          },
        }
      : {},
    undefined,
    selectionMode,
    // Conformance fixtures exercise resize controls.
    { ...interactionOptions, nodesResizable: true }
  )

  handle = Runtime.embed<typeof ports, never, 'Element'>(program)
  changes = []
  mountedAcceptedStateEvents = []
  mountedInteractionEvents = []
  resizeAcknowledgement = undefined
  const active = handle
  unsubscribe = active.ports.changes.subscribe((change) => {
    changes.push(change)

    if (change.kind === 'node-bounds' && resizeAcknowledgement !== undefined) {
      const document = applyNodeBoundsChange(
        resizeAcknowledgement,
        Schema.decodeUnknownSync(NodeBoundsChangeSchema)(change)
      )

      resizeAcknowledgement = undefined

      if (document === undefined) {
        throw new Error('Invalid resize acknowledgement')
      }

      active.ports.actions.send(HostAction.ReplaceDocument({ document }))
    }
  })
  handle.ports.acceptedStates.subscribe((change) =>
    mountedAcceptedStateEvents.push(change)
  )
  handle.ports.interactionEvents.subscribe((events) =>
    mountedInteractionEvents.push(...events)
  )
  handle.ports.measurementResults.subscribe((response) => {
    pendingMountedMeasurements.get(response.requestId)?.(response)
    pendingMountedMeasurements.delete(response.requestId)
  })

  for (const node of fixture.document.nodes) {
    if (!measurementGenerations.has(node.id)) {
      measurementGeneration += 1
      measurementGenerations.set(node.id, measurementGeneration)
    }
  }

  await nextAnimationFrame()
}

const mountMeasurementDocument = async (
  documentInput: typeof FlowDocumentSchema.Encoded,
  _renderOnlyVisible: boolean
): Promise<void> => {
  disposeHandle(handle)
  const container = document.querySelector<HTMLElement>('#app')

  if (container === null) {
    throw new Error('Missing Foldkit measurement conformance host')
  }

  const decoded = Effect.runSync(decodeFlowDocument(documentInput))

  const program = createProgram(
    container,
    decoded,
    { x: 0, y: 0, zoom: 1 },
    [],
    'uncontrolled',
    'uncontrolled'
  )

  handle = Runtime.embed<typeof ports, never, 'Element'>(program)
  measurementGenerations.clear()

  for (const node of documentInput.nodes) {
    measurementGeneration += 1
    measurementGenerations.set(node.id, measurementGeneration)
  }

  handle.ports.measurementResults.subscribe((response) => {
    pendingMountedMeasurements.get(response.requestId)?.(response)
    pendingMountedMeasurements.delete(response.requestId)
  })
  await nextAnimationFrame()
  await nextAnimationFrame()
}

const updateMeasurementDocument = async (
  documentInput: typeof FlowDocumentSchema.Encoded
): Promise<void> => {
  const active = handle

  if (active === undefined) {
    throw new Error('Missing Foldkit measurement runtime')
  }

  const decoded = Effect.runSync(decodeFlowDocument(documentInput))
  active.ports.actions.send(HostAction.ReplaceDocument({ document: decoded }))

  for (const node of documentInput.nodes) {
    if (!measurementGenerations.has(node.id)) {
      measurementGeneration += 1
      measurementGenerations.set(node.id, measurementGeneration)
    }
  }

  await nextAnimationFrame()
  await nextAnimationFrame()
}

const requestMountedSnapshot = (
  query: Omit<SnapshotRequest, 'requestId'> = {}
): Promise<EncodedSnapshotResponse> => {
  const active = handle

  if (active === undefined) {
    throw new Error('Missing Foldkit measurement runtime')
  }

  return requestHandleSnapshot(active, query)
}

const measurementInternalNode = async (
  nodeId: string
): Promise<typeof FlowInternalNodeSchema.Encoded | null> => {
  const response = await requestMountedSnapshot({ nodeId })

  return response.internalNode ?? null
}

const measurementNodesInitialized = async (
  includeHidden: boolean
): Promise<boolean> => {
  const response = await requestMountedSnapshot({
    includeHiddenNodes: includeHidden,
  })

  return response.nodesInitialized
}

const refreshMeasurementNode = async (nodeId: string) => {
  const active = handle

  const element = document.querySelector<HTMLElement>(
    `[data-node-id="${CSS.escape(nodeId)}"]`
  )

  if (active === undefined || element === null) {
    return { status: 'missing', width: null, height: null }
  }

  const bounds = element.getBoundingClientRect()
  const requestId = `measurement-refresh-${nextMountedRequestId}`
  nextMountedRequestId += 1
  const generation = measurementGenerations.get(nodeId) ?? 0
  const { promise, resolve } = Promise.withResolvers<MeasurementResultEncoded>()
  pendingMountedMeasurements.set(requestId, resolve)
  active.ports.actions.send(
    HostAction.MeasureNode({
      requestId,
      measurement: {
        nodeId: Schema.decodeUnknownSync(NodeIdSchema)(nodeId),
        width: bounds.width,
        height: bounds.height,
        generation,
      },
    })
  )
  const response = await promise

  return {
    status: response.status,
    width: response.internalNode?.width ?? null,
    height: response.internalNode?.height ?? null,
  }
}

const destroyMeasurementDocument = async (): Promise<void> => {
  disposeHandle(handle)
  handle = undefined
  await nextAnimationFrame()
  await nextAnimationFrame()
}

const replaceDocument = (input: typeof FlowDocumentSchema.Encoded): void => {
  const active = handle

  if (active === undefined) {
    throw new Error('Missing Foldkit runtime')
  }

  const document = Effect.runSync(decodeFlowDocument(input))
  active.ports.actions.send(HostAction.ReplaceDocument({ document }))
}

const replaceViewport = (viewport: Viewport): void => {
  const active = handle

  if (active === undefined) {
    throw new Error('Missing Foldkit runtime')
  }

  active.ports.actions.send(HostAction.ReplaceViewport({ viewport }))
}

const dispose = (): void => {
  changesAtDispose = changes.length
  acceptedStatesAtDispose = mountedAcceptedStateEvents.length
  disposeHandle(handle)
  handle = undefined
}

const finishDestroy = async () => {
  await nextAnimationFrame()
  await nextAnimationFrame()
  const changesAfterDestroy = changes.length - changesAtDispose
  unsubscribe?.()
  unsubscribe = undefined

  return {
    mountedElements: document.querySelectorAll(
      "[data-testid='flow-canvas'], [data-testid='flow-node'], [data-testid='flow-edge']"
    ).length,
    changesAfterDestroy,
    acceptedStatesAfterDestroy:
      mountedAcceptedStateEvents.length - acceptedStatesAtDispose,
  }
}

const destroy = () => {
  dispose()

  return finishDestroy()
}

const publicDocument = {
  nodes: [
    {
      id: 'visible',
      label: 'Visible',
      position: { x: 20, y: 30 },
      data: { alpha: 1, beta: 2 },
    },
    {
      id: 'hidden',
      label: 'Hidden',
      hidden: true,
      position: { x: 240, y: 30 },
    },
    { id: 'culled', label: 'Culled', position: { x: 4000, y: 4000 } },
    { id: 'parent', label: 'Parent', position: { x: 300, y: 300 } },
    {
      id: 'child',
      label: 'Child',
      parentId: 'parent',
      position: { x: 10, y: 15 },
    },
  ],
  edges: [
    { id: 'visible-edge', source: 'visible', target: 'hidden' },
    { id: 'culled-edge', source: 'parent', target: 'child' },
  ],
} satisfies typeof FlowDocumentSchema.Encoded

const connectionPreviewIsolationDocument = {
  nodes: [
    {
      id: 'source',
      label: 'Source',
      position: { x: 60, y: 80 },
      handles: [{ id: 'out', kind: 'source', side: 'right' }],
    },
    {
      id: 'target',
      label: 'Target',
      position: { x: 340, y: 80 },
      handles: [{ id: 'in', kind: 'target', side: 'left' }],
    },
  ],
  edges: [],
} satisfies typeof FlowDocumentSchema.Encoded

const publicProgram = (
  container: HTMLElement,
  id: PublicProgramId,
  input: typeof FlowDocumentSchema.Encoded = publicDocument,
  allowedTargets: readonly string[] = [],
  interactionOptions: GraphInteractionOptions = defaultInteractionOptions
): Runtime.EmbedHandle<typeof ports> => {
  const decoded = Effect.runSync(decodeFlowDocument(input))

  const program = createProgram(
    container,
    decoded,
    { x: 0, y: 0, zoom: 1 },
    allowedTargets,
    id === 'controlled' ? 'controlled' : 'uncontrolled',
    id === 'controlled' ? 'controlled' : 'uncontrolled',
    undefined,
    { minZoom: 0.25, maxZoom: 4 },
    'full',
    // Conformance fixtures exercise resize controls.
    { ...interactionOptions, nodesResizable: true }
  )

  const active = Runtime.embed<typeof ports, never, 'Element'>(program)
  publicHandles.set(id, active)
  publicContainers.set(id, container)
  publicViewportClients.set(
    id,
    createViewportClient(
      active.ports,
      () => {
        const bounds = container.getBoundingClientRect()

        return {
          width: bounds.width,
          height: bounds.height,
          originX: bounds.left,
          originY: bounds.top,
        }
      },
      { x: 0, y: 0, zoom: 1 },
      { minZoom: 0.25, maxZoom: 4 }
    )
  )
  publicChangeEvents.set(id, [])
  publicStateEvents.set(id, [])
  publicEventOrders.set(id, [])
  publicMeasurementEvents.set(id, [])
  publicViewportEventLog.set(id, [])
  publicInteractionEventLog.set(id, [])
  active.ports.changes.subscribe((change) => {
    publicChangeEvents.get(id)?.push(change)
    publicEventOrders.get(id)?.push(`change:${change.kind}`)
  })
  active.ports.acceptedStates.subscribe((change) => {
    publicStateEvents.get(id)?.push(change)
    publicEventOrders.get(id)?.push(`state:${change.cause}`)
  })
  active.ports.editResults.subscribe((response) => {
    pendingEdits.get(response.requestId)?.(response)
    pendingEdits.delete(response.requestId)
  })
  active.ports.viewportResults.subscribe((response) => {
    if (response.complete) {
      pendingViewport.get(response.requestId)?.(response)
      pendingViewport.delete(response.requestId)
    }
  })
  active.ports.measurementResults.subscribe((response) => {
    publicMeasurementEvents.get(id)?.push(response)
    pendingMeasurements.get(response.requestId)?.resolve(response)
    pendingMeasurements.delete(response.requestId)
  })
  active.ports.viewportEvents.subscribe((event) => {
    publicViewportEventLog.get(id)?.push(event)
  })
  active.ports.interactionEvents.subscribe((events) => {
    publicInteractionEventLog.get(id)?.push(...events)
  })

  return active
}

const startPublicState = async (): Promise<void> => {
  for (const owner of publicObservers.values()) {
    owner.dispose()
  }

  publicObservers.clear()
  publicNodeConnectionEventLog.clear()

  for (const client of publicViewportClients.values()) {
    client.dispose()
  }

  for (const active of publicHandles.values()) {
    disposeHandle(active)
  }

  publicHandles.clear()
  publicViewportClients.clear()
  publicContainers.clear()
  publicChangeEvents.clear()
  publicStateEvents.clear()
  publicEventOrders.clear()
  publicMeasurementEvents.clear()
  publicViewportEventLog.clear()
  publicInteractionEventLog.clear()
  pendingEdits.clear()

  const container = document.querySelector<HTMLElement>('#app')

  if (container === null) {
    throw new Error('Missing Foldkit public state host')
  }

  container.replaceChildren()
  secondPublicContainer?.remove()
  secondPublicContainer = document.createElement('div')
  secondPublicContainer.id = 'foldkit-second-public-state'
  document.body.append(secondPublicContainer)

  publicProgram(container, 'uncontrolled')
  publicProgram(secondPublicContainer, 'controlled', publicDocument, [], {
    ...defaultInteractionOptions,
    panOnDrag: true,
  })
  await Promise.resolve()
}

const requestSnapshot = (
  id: PublicProgramId,
  query: Omit<SnapshotRequest, 'requestId'> = {}
): Promise<EncodedSnapshotResponse> => {
  const active = publicHandles.get(id)

  if (active === undefined) {
    throw new Error(`Missing ${id} Foldkit program`)
  }

  return requestHandleSnapshot(active, query)
}

const startPublicObservers = async (
  id: PublicProgramId,
  target: HTMLElement
): Promise<void> => {
  publicObservers.get(id)?.dispose()
  publicNodeConnectionStops.get(id)?.()
  publicNodeConnectionStops.delete(id)
  const activeHandle = publicHandles.get(id)

  if (activeHandle === undefined) {
    throw new Error(`Missing ${id} Runtime observer owner`)
  }

  const response = await requestSnapshot(id)

  const initialSnapshot = Schema.decodeUnknownSync(FlowSnapshotSchema)(
    response.snapshot
  )

  publicSelectionEventLog.set(id, [])
  publicKeyStateLog.set(id, [])
  publicNodeConnectionErrorLog.set(id, [])

  for (const key of contractKeyStateLogs.keys()) {
    if (key.startsWith(`${id}:`)) {
      contractKeyStateLogs.delete(key)
    }
  }

  for (const [key, stop] of contractKeyStops) {
    if (key.startsWith(`${id}:`)) {
      stop()
      contractKeyStops.delete(key)
    }
  }

  publicObservers.set(
    id,
    createFoldkitObservers(
      activeHandle.ports.acceptedStates,
      initialSnapshot,
      target.ownerDocument,
      // eslint-disable-next-line promise/prefer-await-to-callbacks -- observer failures are reported at this synchronous host boundary.
      (error, context) => {
        publicNodeConnectionErrorLog
          .get(id)
          ?.push(`${context.callback}:${error.message}`)
      }
    )
  )
}

const startConnectionPreviewIsolation = async (): Promise<void> => {
  for (const owner of publicObservers.values()) {
    owner.dispose()
  }

  publicObservers.clear()

  for (const active of publicHandles.values()) {
    disposeHandle(active)
  }

  publicHandles.clear()
  publicContainers.clear()

  const firstContainer = document.querySelector<HTMLElement>('#app')

  if (firstContainer === null) {
    throw new Error('Missing first Foldkit preview-isolation host')
  }

  firstContainer.replaceChildren()
  secondPublicContainer?.remove()
  secondPublicContainer = document.createElement('div')
  secondPublicContainer.id = 'foldkit-preview-isolation-second'
  secondPublicContainer.style.width = '960px'
  secondPublicContainer.style.height = '640px'
  document.body.append(secondPublicContainer)
  firstContainer.style.width = '960px'
  firstContainer.style.height = '640px'

  publicProgram(
    firstContainer,
    'uncontrolled',
    connectionPreviewIsolationDocument,
    ['target']
  )
  publicProgram(
    secondPublicContainer,
    'controlled',
    connectionPreviewIsolationDocument,
    ['target']
  )
  await nextAnimationFrame()
  await nextAnimationFrame()
}

let nextMeasurementRequestId = 1

const freshMeasurementRequestId = (prefix: string): string => {
  const requestId = `${prefix}-${nextMeasurementRequestId}`
  nextMeasurementRequestId += 1

  return requestId
}

const refreshPublicNode = (
  id: PublicProgramId,
  nodeId: string,
  generation = 0
): Promise<typeof MeasurementResultSchema.Encoded> => {
  const active = publicHandles.get(id)
  const container = publicContainers.get(id)

  const element =
    container?.querySelector<HTMLElement>(
      `[data-node-id="${CSS.escape(nodeId)}"]`
    ) ??
    document.querySelector<HTMLElement>(
      `[data-node-id="${CSS.escape(nodeId)}"]`
    )

  if (
    active === undefined ||
    container === undefined ||
    element === null ||
    element === undefined
  ) {
    return Promise.resolve({
      requestId: freshMeasurementRequestId('measurement-missing'),
      nodeId,
      status: 'missing',
      internalNode: null,
      nodesInitialized: false,
    })
  }

  const requestId = freshMeasurementRequestId('measurement')

  const bounds = element.getBoundingClientRect()

  const { promise, resolve } =
    Promise.withResolvers<typeof MeasurementResultSchema.Encoded>()

  pendingMeasurements.set(requestId, { nodeId, resolve })
  active.ports.actions.send(
    HostAction.MeasureNode({
      requestId,
      measurement: {
        nodeId: Schema.decodeUnknownSync(NodeIdSchema)(nodeId),
        width: bounds.width,
        height: bounds.height,
        generation,
      },
    })
  )

  return promise
}

const readMountedState = (
  query: Omit<SnapshotRequest, 'requestId'>
): Promise<PublicStateRead> => {
  if (handle === undefined) {
    throw new Error('Missing Foldkit Runtime')
  }

  const promise = requestHandleSnapshot(handle, query)

  return promise.then((response) => ({
    snapshot: response.snapshot,
    node: response.node ?? null,
    edge: response.edge ?? null,
  }))
}

const readMountedConnectionPreview = async (): Promise<
  EncodedSnapshotResponse['connectionPreview']
> => {
  if (handle === undefined) {
    throw new Error('Missing Foldkit Runtime')
  }

  const response = await requestHandleSnapshot(handle)

  return response.connectionPreview
}

const replacePublicDocument = (
  id: PublicProgramId,
  input: typeof FlowDocumentSchema.Encoded
): void => {
  const active = publicHandles.get(id)

  if (active === undefined) {
    throw new Error(`Missing ${id} Foldkit program`)
  }

  const nextDocument = Effect.runSync(decodeFlowDocument(input))
  active.ports.actions.send(
    HostAction.ReplaceDocument({ document: nextDocument })
  )
}

const replacePublicViewport = (
  id: PublicProgramId,
  viewport: Viewport
): void => {
  const active = publicHandles.get(id)

  if (active === undefined) {
    throw new Error(`Missing ${id} Foldkit program`)
  }

  active.ports.actions.send(HostAction.ReplaceViewport({ viewport }))
}

const dispatchPublicCommand = (
  id: PublicProgramId,
  command: typeof FlowCommandSchema.Encoded
): void => {
  const active = publicHandles.get(id)

  if (active === undefined) {
    throw new Error(`Missing ${id} Foldkit program`)
  }

  const decodedCommand = Schema.decodeUnknownSync(FlowCommandSchema)(command)
  active.ports.actions.send(
    HostAction.DispatchCommand({ command: decodedCommand })
  )
}

const requestPublicEdit = (
  id: PublicProgramId,
  transaction: typeof FlowEditTransactionSchema.Encoded
): Promise<EditResponse> => {
  const active = publicHandles.get(id)

  if (active === undefined) {
    throw new Error(`Missing ${id} Foldkit program`)
  }

  const requestId = `edit-${nextEditRequestId}`
  nextEditRequestId += 1
  const { promise, resolve } = Promise.withResolvers<EditResponse>()
  pendingEdits.set(requestId, resolve)
  active.ports.editRequests.send({ requestId, transaction })

  return promise
}

let nextViewportRequestId = 1

const requestPublicViewport = (
  id: PublicProgramId,
  request: Omit<typeof ViewportRequestSchema.Type, 'requestId'>
): Promise<typeof ViewportResponseSchema.Type> => {
  const active = publicHandles.get(id)

  if (active === undefined) {
    throw new Error(`Missing ${id} Foldkit program`)
  }

  const requestId = `viewport-${nextViewportRequestId}`
  nextViewportRequestId += 1

  const { promise, resolve } =
    Promise.withResolvers<typeof ViewportResponseSchema.Type>()

  pendingViewport.set(requestId, resolve)
  active.ports.viewportRequests.send({ ...request, requestId })

  return promise
}

const requestViewportClient = (
  id: PublicProgramId,
  request: Parameters<ViewportClient['request']>[0]
) => {
  const client = publicViewportClients.get(id)

  if (client === undefined) {
    throw new Error(`Missing ${id} Foldkit viewport client`)
  }

  return client.request(request)
}

const disposePublicState = (): void => {
  for (const owner of publicObservers.values()) {
    owner.dispose()
  }

  publicObservers.clear()

  for (const client of publicViewportClients.values()) {
    client.dispose()
  }

  publicViewportClients.clear()

  for (const [requestId, resolve] of pendingEdits) {
    resolve({ requestId, error: FlowEditDisposedSchema.make({}) })
  }

  pendingEdits.clear()

  for (const [requestId, pending] of pendingMeasurements) {
    pending.resolve({
      requestId,
      nodeId: pending.nodeId,
      status: 'disposed',
      internalNode: null,
      nodesInitialized: false,
    })
  }

  pendingMeasurements.clear()

  for (const active of publicHandles.values()) {
    disposeHandle(active)
  }
}

const exercisePublicEditReentrancy = async (): Promise<{
  readonly responseOrder: readonly string[]
  readonly firstCount: number
  readonly secondCount: number
  readonly finalCount: number
}> => {
  const active = publicHandles.get('uncontrolled')

  if (active === undefined) {
    throw new Error('Missing uncontrolled Foldkit program')
  }

  const responseOrder: string[] = []
  active.ports.editResults.subscribe(({ requestId }) => {
    responseOrder.push(requestId)
  })

  let queued: Promise<EditResponse> | undefined

  const stopListening = active.ports.changes.subscribe((change) => {
    if (
      change.kind === 'edit-proposal' &&
      Number(change.document.nodes[0]?.data?.count ?? 0) === 1 &&
      queued === undefined
    ) {
      queued = requestPublicEdit('uncontrolled', {
        operations: [
          {
            kind: 'update-node-data',
            nodeId: 'visible',
            data: { count: 2 },
          },
        ],
      })
    }
  })

  const first = await requestPublicEdit('uncontrolled', {
    operations: [
      {
        kind: 'update-node-data',
        nodeId: 'visible',
        data: { count: 1 },
      },
    ],
  })

  const queuedRequest = queued
  stopListening()

  if (queuedRequest === undefined) {
    throw new Error('Accepted-state listener did not enqueue the second edit')
  }

  const second = await queuedRequest
  const snapshot = await requestSnapshot('uncontrolled', { nodeId: 'visible' })

  if (!('result' in first) || !('result' in second)) {
    throw new Error('Reentrant Foldkit edit request returned a typed failure')
  }

  return {
    responseOrder,
    firstCount: Number(first.result.document.nodes[0]?.data?.count ?? 0),
    secondCount: Number(second.result.document.nodes[0]?.data?.count ?? 0),
    finalCount: Number(snapshot.node?.data?.count ?? 0),
  }
}

const exercisePublicEditDisposal = async (
  scenario: PublicEditQueuedDisposal
): Promise<{
  readonly responseTags: readonly string[]
  readonly responseOrder: readonly string[]
  readonly pendingCount: number
  readonly lateNotifications: number
}> => {
  replacePublicDocument('uncontrolled', scenario.document)
  await nextAnimationFrame()
  await nextAnimationFrame()

  const active = publicHandles.get('uncontrolled')

  if (active === undefined) {
    throw new Error('Missing uncontrolled Foldkit program')
  }

  let reentrant: Promise<EditResponse> | undefined
  let lateNotifications = 0
  let disposed = false

  const stopAccepted = active.ports.acceptedStates.subscribe(() => {
    if (disposed) {
      lateNotifications += 1
    }
  })

  const stopListening = active.ports.editResults.subscribe((response) => {
    if ('result' in response && reentrant === undefined) {
      reentrant = requestPublicEdit('uncontrolled', scenario.queued)
      disposed = true
      disposePublicState()
    }
  })

  const first = requestPublicEdit('uncontrolled', scenario.trigger)

  const firstResponse = await first
  const reentrantRequest = reentrant

  if (reentrantRequest === undefined) {
    throw new Error('Edit-result listener did not enqueue the second edit')
  }

  const responses = [firstResponse, await reentrantRequest]
  stopListening()
  stopAccepted()

  return {
    responseTags: responses.map((response) =>
      'error' in response ? response.error._tag : 'success'
    ),
    responseOrder: responses.map((response) => response.requestId),
    pendingCount: pendingEdits.size,
    lateNotifications,
  }
}

const exercisePublicReentrancy = (): Promise<readonly string[]> => {
  const active = publicHandles.get('uncontrolled')

  if (active === undefined) {
    throw new Error('Missing uncontrolled Foldkit program')
  }

  const order: string[] = []

  const { promise, resolve } = Promise.withResolvers<readonly string[]>()

  const stopListening = active.ports.acceptedStates.subscribe(({ current }) => {
    order.push(String(current.viewport.x))

    if (order.length === 1) {
      replacePublicViewport('uncontrolled', { x: 77, y: 0, zoom: 1 })
    } else {
      stopListening()
      resolve(order)
    }
  })

  replacePublicViewport('uncontrolled', { x: 50, y: 0, zoom: 1 })

  return promise
}

const exercisePublicUnsubscribe = async (): Promise<number> => {
  const active = publicHandles.get('uncontrolled')

  if (active === undefined) {
    throw new Error('Missing uncontrolled Foldkit program')
  }

  let notifications = 0

  const stopListening = active.ports.acceptedStates.subscribe(() => {
    notifications += 1
  })

  stopListening()
  replacePublicViewport('uncontrolled', { x: 66, y: 0, zoom: 1 })
  await nextAnimationFrame()
  await nextAnimationFrame()

  return notifications
}

const exercisePublicListenerFailure = async (): Promise<number> => {
  const active = publicHandles.get('uncontrolled')

  if (active === undefined) {
    throw new Error('Missing uncontrolled Foldkit program')
  }

  let laterListenerCalls = 0
  active.ports.acceptedStates.subscribe(() => {
    throw new Error('expected test port listener failure')
  })
  active.ports.acceptedStates.subscribe(() => {
    laterListenerCalls += 1
  })

  replacePublicViewport('uncontrolled', { x: 88, y: 0, zoom: 1 })
  await nextAnimationFrame()
  await nextAnimationFrame()

  return laterListenerCalls
}

const settlePublicState = async (): Promise<void> => {
  await nextAnimationFrame()
  await nextAnimationFrame()
}

const probeAfterPublicDisposal = async (id: PublicProgramId) => {
  const active = publicHandles.get(id)

  if (active === undefined) {
    throw new Error(`Missing ${id} Foldkit program`)
  }

  const acceptedCount = publicStateEvents.get(id)?.length ?? 0
  const changeCount = publicChangeEvents.get(id)?.length ?? 0
  active.ports.actions.send(
    HostAction.ReplaceViewport({
      viewport: { x: 500, y: 0, zoom: 1 },
    })
  )
  active.ports.snapshotRequests.send({ requestId: 'after-disposal' })
  await nextAnimationFrame()

  return {
    acceptedCount: (publicStateEvents.get(id)?.length ?? 0) - acceptedCount,
    changeCount: (publicChangeEvents.get(id)?.length ?? 0) - changeCount,
    mountedElements: document.querySelectorAll(
      "[data-testid='flow-canvas'], [data-testid='flow-node'], [data-testid='flow-edge']"
    ).length,
  }
}

window.__flowFoldkitTest = {
  startMountedMeasurementObserver,
  mount,
  connectionPreviewStates: () => previewProbeStates,
  readConnectionPreview: readMountedConnectionPreview,
  startRendererContract,
  startRendererFixture,
  replaceRendererDocument,
  rendererContractState: () => ({
    renderCalls: rendererCalls,
    disposedPrograms: disposedRendererPrograms,
  }),
  rendererCallCounts: () => rendererCallsByHost,
  rendererInteractionEvents: (index) => rendererEventsByHost[index] ?? [],
  rendererChanges: (index) => rendererChangesByHost[index] ?? [],
  clearRendererInteractionEvents: () => {
    rendererEventsByHost = rendererEventsByHost.map(() => [])
    rendererChangesByHost = rendererChangesByHost.map(() => [])
  },
  disposeRendererContract,
  mountMeasurementDocument,
  updateMeasurementDocument,
  acknowledgeNextResize,
  attachResizeMeasurementObserver,
  resizeMeasurements: () => [...resizeMeasurementRequests],
  stopResizeMeasurementObserver,
  measurementInternalNode,
  measurementNodesInitialized,
  refreshMeasurementNode,
  destroyMeasurementDocument,
  replaceDocument,
  replaceViewport,
  changeKinds: () => changes.map((change) => change.kind),
  changes: () => changes,
  interactionEvents: () => mountedInteractionEvents,
  dispose,
  finishDestroy,
  destroy,
  startPublicState,
  startPublicObservers,
  subscribePublicSelection: (id) => {
    const owner = publicObservers.get(id)

    if (owner === undefined) {
      throw new Error(`Missing ${id} Runtime observer owner`)
    }

    owner.subscribeSelection(({ nodes, edges }) => {
      publicSelectionEventLog
        .get(id)
        ?.push(
          `${nodes.map(({ id: nodeId }) => nodeId).join(',')}|${edges.map(({ id: edgeId }) => edgeId).join(',')}`
        )
    })
  },
  publicSelectionEvents: (id) => publicSelectionEventLog.get(id) ?? [],
  observePublicNodeConnections: (
    id,
    nodeId,
    failDisconnectOnce = false,
    filter = {}
  ) => {
    const owner = publicObservers.get(id)

    if (owner === undefined) {
      throw new Error(`Missing ${id} Runtime observer owner`)
    }

    publicNodeConnectionEventLog.set(id, [])
    publicNodeConnectionErrorLog.set(id, [])
    let shouldFailDisconnect = failDisconnectOnce
    publicNodeConnectionStops.get(id)?.()
    publicNodeConnectionStops.set(
      id,
      owner.observeNodeConnections(
        { nodeId, ...filter },
        {
          onDisconnect: (connections) => {
            publicNodeConnectionEventLog
              .get(id)
              ?.push(
                `disconnect:${connections.map(({ edgeId }) => edgeId).join(',')}`
              )

            if (shouldFailDisconnect) {
              shouldFailDisconnect = false
              throw new Error('Foldkit observer disconnect failed')
            }
          },
          onConnect: (connections) => {
            publicNodeConnectionEventLog
              .get(id)
              ?.push(
                `connect:${connections.map(({ edgeId }) => edgeId).join(',')}`
              )
          },
        }
      )
    )
  },
  stopPublicNodeConnections: (id) => {
    publicNodeConnectionStops.get(id)?.()
    publicNodeConnectionStops.delete(id)
  },
  publicNodeConnectionEvents: (id) =>
    publicNodeConnectionEventLog.get(id) ?? [],
  publicNodeConnectionErrors: (id) =>
    publicNodeConnectionErrorLog.get(id) ?? [],
  observePublicKeyPress: (id, target) => {
    const owner = publicObservers.get(id)

    if (owner === undefined) {
      throw new Error(`Missing ${id} Runtime observer owner`)
    }

    owner.observeKeyPress('x', { target }, (pressed) =>
      publicKeyStateLog.get(id)?.push(pressed)
    )
  },
  publicKeyStates: (id) => publicKeyStateLog.get(id) ?? [],
  observeContractKeyPress: (programId, observerId, keyCode, options) => {
    const owner = publicObservers.get(programId)

    if (owner === undefined) {
      throw new Error(`Missing ${programId} Runtime observer owner`)
    }

    const key = contractKeyObserverId(programId, observerId)
    contractKeyStops.get(key)?.()
    const states: boolean[] = []
    contractKeyStateLogs.set(key, states)
    contractKeyStops.set(
      key,
      owner.observeKeyPress(keyCode, options, (pressed) => states.push(pressed))
    )
  },
  contractKeyStates: (programId, observerId) =>
    contractKeyStateLogs.get(contractKeyObserverId(programId, observerId)) ??
    [],
  unsubscribeContractKeyPress: (programId, observerId) => {
    const key = contractKeyObserverId(programId, observerId)
    contractKeyStops.get(key)?.()
    contractKeyStops.delete(key)
  },
  disposePublicObservers: (id) => {
    publicNodeConnectionStops.get(id)?.()
    publicNodeConnectionStops.delete(id)
    publicObservers.get(id)?.dispose()
    publicObservers.delete(id)

    for (const key of contractKeyStops.keys()) {
      if (key.startsWith(`${id}:`)) {
        contractKeyStops.delete(key)
      }
    }
  },
  startConnectionPreviewIsolation,
  requestSnapshot,
  requestSnapshotResult,
  refreshPublicNode,
  replacePublicDocument,
  replacePublicViewport,
  dispatchPublicCommand,
  requestPublicEdit,
  requestPublicViewport,
  requestViewportClient,
  exercisePublicEditReentrancy,
  exercisePublicEditDisposal,
  publicChanges: (id) => publicChangeEvents.get(id) ?? [],
  publicAcceptedStates: (id) => publicStateEvents.get(id) ?? [],
  publicEventOrder: (id) => publicEventOrders.get(id) ?? [],
  publicMeasurementResults: (id) => publicMeasurementEvents.get(id) ?? [],
  publicViewportEvents: (id) => publicViewportEventLog.get(id) ?? [],
  publicInteractionEvents: (id) => publicInteractionEventLog.get(id) ?? [],
  readMountedState,
  mountedAcceptedStates: () => mountedAcceptedStateEvents,
  exercisePublicReentrancy,
  exercisePublicUnsubscribe,
  exercisePublicListenerFailure,
  settlePublicState,
  disposePublicState,
  probeAfterPublicDisposal,
}
