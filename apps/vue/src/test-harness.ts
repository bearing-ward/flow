import { FlowEditErrorSchema, decodeFlowDocument } from '@flow/core'
import type {
  FlowDocument,
  FlowConnection,
  FlowEdge,
  FlowNode,
  FlowHandleConnectionsQuery,
  FlowSnapshot,
  FlowEditResult,
  FlowDeleteDecision,
  FlowStateChange,
  FlowInternalNode,
  Viewport,
  FlowDocumentSchema,
  FlowEditTransactionSchema,
  ConnectionMode,
  ConnectionRadius,
  ConnectionPreviewState,
  FlowDefaultEdgeOptions,
} from '@flow/core'
import {
  FlowCanvas,
  useEdges,
  useFlow,
  useNodeId,
  useNodes,
  useViewport,
} from '@flow/vue'
import type { FlowKeyCode, FlowKeyPressOptions } from '@flow/vue'
import { Effect, Schema } from 'effect'
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
} from 'vue'
import type { App, Component as VueComponent, PropType, Ref } from 'vue'

import type {
  ConformanceFixture,
  PublicStateQuery,
  PublicStateRead,
  PublicEditQueuedDisposal,
} from '../../../packages/conformance/src/index.ts'
import type { ApiUtilityDeletionEvent } from '../../shared-e2e/api-utility-reference.ts'

import '@flow/vue/style.css'
import './style.css'

interface TestApi {
  mount: (
    fixture: ConformanceFixture,
    options?: { readonly defaultEdgeOptions?: FlowDefaultEdgeOptions }
  ) => void
  updateDocument: (document: typeof FlowDocumentSchema.Encoded) => void
  acceptDocument: (document: typeof FlowDocumentSchema.Encoded) => void
  updateViewport: (viewport: Viewport) => void
  mountMeasurementDocument: (
    document: typeof FlowDocumentSchema.Encoded,
    renderOnlyVisible: boolean
  ) => Promise<void>
  updateMeasurementDocument: (
    document: typeof FlowDocumentSchema.Encoded
  ) => Promise<void>
  internalNode: (id: string) => FlowInternalNode | undefined
  nodesInitialized: (includeHidden: boolean) => boolean
  refreshNode: (
    id: string
  ) => Promise<
    Awaited<
      ReturnType<ReturnType<typeof useFlow>['updateNodeInternals']>
    >[number]
  >
  refreshAndUnmountMeasurementDocument: (
    id: string
  ) => Promise<
    Awaited<
      ReturnType<ReturnType<typeof useFlow>['updateNodeInternals']>
    >[number]
  >
  destroyMeasurementDocument: () => void
  changeKinds: () => readonly string[]
  readState: (query: PublicStateQuery) => PublicStateRead
  acceptedStates: () => readonly FlowStateChange[]
  connectionCandidates: () => readonly FlowConnection[]
  clearConnectionCandidates: () => void
  setSelectionMode: (mode: 'full' | 'partial') => void
  setConnectionOptions: (options: {
    readonly mode: ConnectionMode
    readonly radius: ConnectionRadius
    readonly autoPanOnConnect: boolean
  }) => void
  setGestureOptions: (options: GestureHarnessOptions) => void
  setConnectionValidatorThrows: (enabled: boolean) => void
  gestureEvents: () => readonly string[]
  viewport: () => Viewport
  setConnectionPreviewEnabled: (enabled: boolean) => void
  connectionPreviewStates: () => readonly ConnectionPreviewState[]
  connectionPreview: () => ConnectionPreviewState | null
  destroy: () => {
    readonly mountedElements: number
    readonly changesAfterDestroy: number
    readonly acceptedStatesAfterDestroy: number
  }
  smoke: () => Promise<{
    readonly leftCount: string | null
    readonly rightCount: string | null
    readonly labelUpdated: boolean
    readonly edgeUpdated: boolean
    readonly identityPreserved: boolean
    readonly mounted: number
    readonly unmounted: number
    readonly edgeMounted: number
    readonly edgeUnmounted: number
    readonly remaining: number
  }>
  startSplitModel: () => void
  updateSplitDocument: (document: typeof FlowDocumentSchema.Encoded) => void
  splitModelSnapshot: () => {
    readonly initialRendered: boolean
    readonly nodeUpdateAcknowledged: boolean
    readonly edgeUpdateAcknowledged: boolean
    readonly documentUpdateAcknowledged: boolean
    readonly identityPreserved: boolean
  }
  applySplitEdit: () => Promise<FlowEditResult | undefined>
  splitEditSnapshot: () => {
    readonly nodeIds: readonly string[]
    readonly edgeIds: readonly string[]
    readonly nodeUpdates: number
    readonly edgeUpdates: number
    readonly proposals: number
  }
  readonly changes: string[]
  readonly positionChanges: {
    readonly nodeId: string
    readonly position: { readonly x: number; readonly y: number }
  }[]
  startNestedDragCase: (mode: 'controlled' | 'uncontrolled') => void
  updateNestedDragDocument: (
    document: typeof FlowDocumentSchema.Encoded
  ) => void
  startPublicState: (document?: typeof FlowDocumentSchema.Encoded) => void
  getPublicHandleConnections: (
    id: 'left' | 'right',
    query: FlowHandleConnectionsQuery
  ) => readonly FlowEdge[]
  exercisePreDeleteApproval: () => Promise<{
    readonly result: FlowEditResult['deletion']
    readonly requested: {
      readonly nodes: readonly string[]
      readonly edges: readonly string[]
    }
    readonly candidateNodes: readonly string[]
    readonly candidateEdges: readonly string[]
    readonly order: readonly string[]
    readonly referenceEvents: readonly ApiUtilityDeletionEvent[]
    readonly acceptedNodeIds: readonly string[]
    readonly acceptedEdgeIds: readonly string[]
    readonly ownerNodeIds: readonly string[]
  }>
  exercisePreDeleteCallbackOutcomes: () => Promise<{
    readonly empty: {
      readonly result: FlowEditResult['deletion']
      readonly callbacks: readonly string[]
    }
    readonly failed: string
    readonly callbacks: readonly string[]
    readonly ownerNodeIds: readonly string[]
    readonly acceptedNodeIds: readonly string[]
    readonly acceptedEdgeIds: readonly string[]
  }>
  exerciseStalePreDeleteApproval: () => Promise<string>
  disposeDuringPreDeleteApproval: () => Promise<{
    readonly error: string
    readonly approvalResolved: boolean
    readonly nodeIds: readonly string[]
  }>
  exercisePreDeleteDecisions: () => Promise<{
    readonly denied: FlowEditResult['deletion']
    readonly widened: string
    readonly rejected: string
    readonly acceptedNodeIds: readonly string[]
    readonly acceptedEdgeIds: readonly string[]
  }>
  exerciseReentrantPreDelete: () => Promise<{
    readonly outer: string
    readonly inner: FlowEditResult['deletion'] | undefined
    readonly callbacks: readonly string[]
    readonly acceptedNodeIds: readonly string[]
  }>
  exerciseDeleteCallbackCancellation: () => Promise<
    readonly {
      readonly trigger: string
      readonly result: string
      readonly callbacks: readonly string[]
      readonly nodeIds: readonly string[]
      readonly edgeIds: readonly string[]
    }[]
  >
  exerciseCallbackReentrantDelete: () => Promise<{
    readonly outer: FlowEditResult['deletion']
    readonly inner: FlowEditResult['deletion'] | undefined
    readonly nodeIds: readonly string[]
  }>
  preparePublicRestore: (id: 'left' | 'right') => Promise<FlowSnapshot>
  publicState: (id: 'left' | 'right') => {
    readonly document: FlowSnapshot['document']
    readonly nodeIds: readonly string[]
    readonly edgeIds: readonly string[]
    readonly viewport: Viewport
    readonly firstNodeX: number | null
    readonly selectedData: readonly unknown[]
    readonly selectedConnections: readonly unknown[]
    readonly savedSession: unknown
    readonly missingNode: boolean
    readonly missingEdge: boolean
    readonly frozen: boolean
    readonly mutationRejected: boolean
    readonly notifications: number
    readonly events: readonly string[]
  }
  updatePublicDocument: (
    id: 'left' | 'right',
    document: typeof FlowDocumentSchema.Encoded
  ) => void
  updatePublicViewport: (viewport: Viewport, id?: 'left' | 'right') => void
  proposePublicViewport: () => void
  proposePublicPosition: (id: 'left' | 'right') => void
  acceptPublicProposals: () => void
  subscribePublicSelection: (id: 'left' | 'right') => void
  publicSelectionEvents: (id: 'left' | 'right') => readonly string[]
  proposePublicSelection: () => Promise<void>
  acknowledgePublicSelection: () => void
  observePublicKeyPress: (target: HTMLElement) => void
  publicKeyStates: () => readonly boolean[]
  observeContractKeyPress: (
    id: string,
    keyCode: FlowKeyCode,
    options: FlowKeyPressOptions
  ) => void
  contractKeyStates: (id: string) => readonly boolean[]
  unsubscribeContractKeyPress: (id: string) => void
  exercisePublicNotificationPolicy: () => readonly string[]
  unmountPublicObserver: () => void
  destroyPublicCanvases: () => void
  outsideProviderError: () => string
  proposePublicDataEdit: () => Promise<FlowEditResult>
  applyPublicEditFixture: (
    document: typeof FlowDocumentSchema.Encoded,
    transaction: typeof FlowEditTransactionSchema.Encoded
  ) => Promise<
    FlowEditResult & {
      readonly acceptedDocument: FlowDocument
      readonly events: readonly string[]
      readonly domNodeIds: readonly string[]
      readonly retainedDomIdentity: boolean
    }
  >
  exercisePublicEditIsolation: () => Promise<{
    readonly leftNodeIds: readonly string[]
    readonly rightData: FlowNode['data'] | null
    readonly leftEvents: readonly string[]
    readonly rightEvents: readonly string[]
  }>
  exerciseFunctionalEditUpdaters: () => Promise<{
    readonly calls: number
    readonly count: number | null
    readonly mutationBlocked: boolean
  }>
  disposeDuringEditPreparation: (
    scenario: PublicEditQueuedDisposal
  ) => Promise<{
    readonly error: string
    readonly events: readonly string[]
  }>
  acknowledgePublicEdit: () => void
  mountGestureIsolationHosts: () => Promise<void>
  gestureIsolationSnapshot: () => {
    readonly leftNodeX: number | null
    readonly rightNodeX: number | null
    readonly leftChanges: readonly string[]
    readonly rightChanges: readonly string[]
    readonly leftDragEvents: number
    readonly rightDragEvents: number
    readonly leftCanvasCount: number
    readonly rightCanvasCount: number
  }
  unmountGestureIsolationLeft: () => Promise<void>
}

interface CanvasHarnessProps {
  document: FlowDocument
  documentMode: 'controlled' | 'uncontrolled'
  viewport: Viewport
  viewportMode: 'controlled' | 'uncontrolled'
  renderOnlyVisible: boolean
  defaultEdgeOptions?: FlowDefaultEdgeOptions
  selectionMode: 'full' | 'partial'
  connectionMode?: ConnectionMode
  connectionRadius?: ConnectionRadius
  autoPanOnConnect?: boolean
  connectionPreview?: VueComponent<{
    readonly preview: ConnectionPreviewState
  }>
  panOnDrag?: boolean
  selectionOnDrag?: boolean
  panOnScroll?: boolean
  panOnScrollSpeed?: number
  panOnScrollMode?: 'free' | 'horizontal' | 'vertical'
  selectNodesOnDrag?: boolean
  connectOnClick?: boolean
  zoomOnScroll?: boolean
  zoomOnDoubleClick?: boolean
  panActivationKeyCode?: string
  zoomActivationKeyCode?: string
  noPanClassName?: string
  noDragClassName?: string
  noWheelClassName?: string
  'onUpdate:viewport': (next: Viewport) => void
  onChange: (change: { kind: string }) => void
  isValidConnection: (candidate: FlowConnection) => boolean
  onInit: () => void
  onNodeDragStart: () => void
  onNodeDrag: () => void
  onNodeDragEnd: (payload: { readonly status: string }) => void
  onNodeDragStop: (payload: { readonly status: string }) => void
  onConnectStart: () => void
  onConnect: () => void
  onConnectEnd: (payload: { readonly status: string }) => void
  onClickConnectStart: () => void
  onClickConnectEnd: (payload: { readonly status: string }) => void
  onReconnectStart: () => void
  onReconnect: () => void
  onReconnectEnd: (payload: { readonly status: string }) => void
  onSelectionStart: () => void
  onSelectionProgress: () => void
  onSelectionEnd: (payload: { readonly status: string }) => void
  onSelectionDragStart: () => void
  onSelectionDrag: () => void
  onSelectionDragStop: (payload: { readonly status: string }) => void
  onSelectionChange: () => void
  onSelectionContextMenu: () => void
  onMoveStart: () => void
  onMove: () => void
  onMoveEnd: (_viewport: Viewport, status: string) => void
  onError: (payload: { readonly boundary: string }) => void
}

interface GestureHarnessOptions {
  readonly panOnDrag?: boolean
  readonly selectionOnDrag?: boolean
  readonly panOnScroll?: boolean
  readonly panOnScrollSpeed?: number
  readonly panOnScrollMode?: 'free' | 'horizontal' | 'vertical'
  readonly selectNodesOnDrag?: boolean
  readonly connectOnClick?: boolean
  readonly zoomOnScroll?: boolean
  readonly zoomOnDoubleClick?: boolean
  readonly panActivationKeyCode?: string
  readonly zoomActivationKeyCode?: string
  readonly noPanClassName?: string
  readonly noDragClassName?: string
  readonly noWheelClassName?: string
}

declare global {
  interface Window {
    __flowVueTest?: TestApi
  }
}

let app: App | undefined

let isolationLeftDocument: Ref<FlowDocument> | undefined

let isolationRightDocument: Ref<FlowDocument> | undefined

let isolationLeftChanges: string[] = []

let isolationRightChanges: string[] = []

let isolationLeftDragEvents = 0

let isolationRightDragEvents = 0

let isolationShowLeft: Ref<boolean> | undefined

const documentState = ref<FlowDocument>(
  Effect.runSync(decodeFlowDocument({ nodes: [], edges: [] }))
)

const defaultEdgeOptions = ref<FlowDefaultEdgeOptions>()

const viewportState = ref<Viewport>({ x: 0, y: 0, zoom: 1 })

const allowedTargets = ref<readonly string[]>()

const connectionCandidates: FlowConnection[] = []

const selectionMode = ref<'full' | 'partial'>('full')

const connectionMode = ref<ConnectionMode>('strict')

const connectionRadius = ref<ConnectionRadius>(20)

const autoPanOnConnect = ref(true)

const connectionOptionsSet = ref(false)

const connectionPreviewEnabled = ref(false)

const connectionPreviewStates: ConnectionPreviewState[] = []

const gestureOptions = ref<GestureHarnessOptions>({})

const gestureEventLog: string[] = []

const connectionValidatorThrows = ref(false)

const cullOffscreen = ref(false)

const documentMode = ref<'controlled' | 'uncontrolled'>('controlled')

const viewportMode = ref<'controlled' | 'uncontrolled'>('controlled')

let changes: string[] = []

let positionChanges: {
  readonly nodeId: string
  readonly position: { readonly x: number; readonly y: number }
}[] = []

let conformanceSnapshot: (() => FlowSnapshot) | undefined

let conformanceNode: ((id: string) => FlowNode | undefined) | undefined

let conformanceEdge: ((id: string) => FlowEdge | undefined) | undefined

let conformanceInternalNode:
  | ((id: string) => FlowInternalNode | undefined)
  | undefined

let conformanceNodesInitialized:
  | ((includeHidden: boolean) => boolean)
  | undefined

let conformanceRefreshNode:
  | ((
      id: string
    ) => ReturnType<ReturnType<typeof useFlow>['updateNodeInternals']>)
  | undefined

let conformanceAcceptedStates: FlowStateChange[] = []

let splitNodeUpdates = 0

let splitEdgeUpdates = 0

let splitDocumentUpdater: ((document: FlowDocument) => void) | undefined

let splitEditRequester:
  | ((
      transaction: typeof FlowEditTransactionSchema.Encoded
    ) => Promise<FlowEditResult>)
  | undefined

let splitProposalCount = 0

interface PublicProbe {
  readonly flow: ReturnType<typeof useFlow>
  readonly nodes: ReturnType<typeof useNodes>
  readonly edges: ReturnType<typeof useEdges>
  readonly viewport: ReturnType<typeof useViewport>
  readonly notifications: number
  readonly unsubscribe: () => void
}

const publicProbes = new Map<'left' | 'right', PublicProbe>()

let mountedFlow: ReturnType<typeof useFlow> | undefined

const publicDocuments = new Map<'left' | 'right', Ref<FlowDocument>>()

const publicViewports = new Map<'left' | 'right', Ref<Viewport>>()

const publicEvents = new Map<'left' | 'right', string[]>()

let publicAcceptLeft = false

let publicCandidateLeft: FlowDocument | undefined

let publicSelectionProposal: FlowDocument | undefined

const publicSelectionEventLog = new Map<'left' | 'right', string[]>()

const publicObserverStops = new Set<() => void>()

let publicKeyStateLog: boolean[] = []

const contractKeyStateLogs = new Map<string, boolean[]>()

const contractKeyStops = new Map<string, () => void>()

const describeFlowEditFailure = (cause: unknown): string => {
  try {
    return Schema.decodeUnknownSync(FlowEditErrorSchema)(cause)._tag
  } catch {
    return 'UnknownFlowEditFailure'
  }
}

const ConnectionPreviewProbe = defineComponent({
  props: {
    // SAFETY: Vue uses this typed prop declaration to validate the schema-backed preview input.
    preview: {
      type: Object as PropType<ConnectionPreviewState>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      connectionPreviewStates.push(structuredClone(props.preview))

      return h('path', {
        'data-testid': 'flow-custom-connection-preview',
        'data-preview-kind': props.preview.kind,
        d: `M ${props.preview.from.x} ${props.preview.from.y} L ${props.preview.to.x} ${props.preview.to.y}`,
      })
    }
  },
})

const publicProbeMounted = ref(true)

const Component = defineComponent({
  name: 'FlowVueTestRoot',
  setup() {
    const Probe = defineComponent({
      setup() {
        const flow = useFlow()

        mountedFlow = flow

        conformanceSnapshot = () => flow.getSnapshot()
        conformanceNode = (id) => flow.getNode(id)
        conformanceEdge = (id) => flow.getEdge(id)
        conformanceInternalNode = (id) => flow.getInternalNode(id)
        conformanceNodesInitialized = (includeHidden) =>
          flow.nodesInitialized({ includeHidden })
        conformanceRefreshNode = (id) => flow.updateNodeInternals([id])

        const unsubscribe = flow.subscribeState((change) => {
          conformanceAcceptedStates.push(change)
          gestureEventLog.push(`accepted:${change.cause}`)
        })

        onUnmounted(unsubscribe)

        return () => null
      },
    })

    return () => {
      const canvasProps: CanvasHarnessProps = {
        document: documentState.value,
        documentMode: documentMode.value,
        viewport: viewportState.value,
        viewportMode: viewportMode.value,
        ...gestureOptions.value,
        renderOnlyVisible: cullOffscreen.value,
        selectionMode: selectionMode.value,
        'onUpdate:viewport': (next: Viewport) => {
          viewportState.value = next
        },
        onChange: (change: { kind: string }) => {
          changes.push(change.kind)
          gestureEventLog.push(`change:${change.kind}`)
        },
        onInit: () => gestureEventLog.push('init'),
        onNodeDragStart: () => gestureEventLog.push('nodeDragStart'),
        onNodeDrag: () => gestureEventLog.push('nodeDrag'),
        onNodeDragEnd: ({ status }: { readonly status: string }) =>
          gestureEventLog.push(`nodeDragEnd:${status}`),
        onNodeDragStop: ({ status }: { readonly status: string }) =>
          gestureEventLog.push(`nodeDragStop:${status}`),
        onConnectStart: () => gestureEventLog.push('connectStart'),
        onConnect: () => gestureEventLog.push('connect'),
        onConnectEnd: ({ status }: { readonly status: string }) =>
          gestureEventLog.push(`connectEnd:${status}`),
        onClickConnectStart: () => gestureEventLog.push('clickConnectStart'),
        onClickConnectEnd: ({ status }: { readonly status: string }) =>
          gestureEventLog.push(`clickConnectEnd:${status}`),
        onReconnectStart: () => gestureEventLog.push('reconnectStart'),
        onReconnect: () => gestureEventLog.push('reconnect'),
        onReconnectEnd: ({ status }: { readonly status: string }) =>
          gestureEventLog.push(`reconnectEnd:${status}`),
        onSelectionStart: () => gestureEventLog.push('selectionStart'),
        onSelectionProgress: () => gestureEventLog.push('selectionProgress'),
        onSelectionEnd: ({ status }: { readonly status: string }) =>
          gestureEventLog.push(`selectionEnd:${status}`),
        onSelectionDragStart: () => gestureEventLog.push('selectionDragStart'),
        onSelectionDrag: () => gestureEventLog.push('selectionDrag'),
        onSelectionDragStop: ({ status }: { readonly status: string }) =>
          gestureEventLog.push(`selectionDragStop:${status}`),
        onSelectionChange: () => gestureEventLog.push('selectionChange'),
        onSelectionContextMenu: () =>
          gestureEventLog.push('selectionContextMenu'),
        onMoveStart: () => gestureEventLog.push('moveStart'),
        onMove: () => gestureEventLog.push('move'),
        onMoveEnd: (_viewport: Viewport, status: string) =>
          gestureEventLog.push(`moveEnd:${status}`),
        onError: ({ boundary }: { readonly boundary: string }) =>
          gestureEventLog.push(`error:${boundary}`),
        isValidConnection: (candidate: FlowConnection) => {
          connectionCandidates.push(candidate)

          if (connectionValidatorThrows.value) {
            throw new Error('Fixture validator failure')
          }

          return (
            allowedTargets.value === undefined ||
            allowedTargets.value.includes(candidate.target)
          )
        },
      }

      if (defaultEdgeOptions.value !== undefined) {
        canvasProps.defaultEdgeOptions = defaultEdgeOptions.value
      }

      if (connectionOptionsSet.value) {
        canvasProps.connectionMode = connectionMode.value
        canvasProps.connectionRadius = connectionRadius.value
        canvasProps.autoPanOnConnect = autoPanOnConnect.value
      }

      if (connectionPreviewEnabled.value) {
        canvasProps.connectionPreview = ConnectionPreviewProbe
      }

      return h(FlowCanvas, canvasProps, { default: () => h(Probe) })
    }
  },
})

const api: TestApi = {
  mount(fixture, options) {
    app?.unmount()
    documentState.value = Effect.runSync(decodeFlowDocument(fixture.document))
    allowedTargets.value = fixture.allowedConnectionTargets
    defaultEdgeOptions.value = options?.defaultEdgeOptions
    connectionCandidates.length = 0
    selectionMode.value = 'full'
    cullOffscreen.value = fixture.renderOnlyVisible === true
    documentMode.value = fixture.documentMode
    viewportMode.value = fixture.viewportMode
    connectionMode.value = 'strict'
    connectionRadius.value = 20
    autoPanOnConnect.value = true
    connectionOptionsSet.value = false
    connectionPreviewEnabled.value = false
    connectionPreviewStates.length = 0
    gestureOptions.value = {}
    gestureEventLog.length = 0
    connectionValidatorThrows.value = false
    viewportState.value = { x: 0, y: 0, zoom: 1 }
    changes = []
    positionChanges = []
    conformanceAcceptedStates = []
    conformanceSnapshot = undefined
    conformanceNode = undefined
    conformanceEdge = undefined
    app = createApp(Component)
    app.mount('#app')
  },
  updateDocument(document) {
    documentState.value = Effect.runSync(decodeFlowDocument(document))
  },
  acceptDocument(document) {
    documentState.value = Effect.runSync(decodeFlowDocument(document))
  },
  async mountMeasurementDocument(document, renderOnlyVisible) {
    app?.unmount()
    documentState.value = Effect.runSync(decodeFlowDocument(document))
    cullOffscreen.value = renderOnlyVisible
    documentMode.value = 'uncontrolled'
    viewportMode.value = 'uncontrolled'
    viewportState.value = { x: 0, y: 0, zoom: 1 }
    conformanceSnapshot = undefined
    conformanceNode = undefined
    conformanceEdge = undefined
    conformanceInternalNode = undefined
    conformanceNodesInitialized = undefined
    conformanceRefreshNode = undefined
    app = createApp(Component)
    app.mount('#app')
    await nextTick()
  },
  async updateMeasurementDocument(document) {
    documentState.value = Effect.runSync(decodeFlowDocument(document))
    await nextTick()
    await nextTick()
  },
  internalNode(id) {
    return conformanceInternalNode?.(id)
  },
  nodesInitialized(includeHidden) {
    return conformanceNodesInitialized?.(includeHidden) ?? false
  },
  async refreshNode(id) {
    if (conformanceRefreshNode === undefined) {
      throw new Error('Missing Vue measurement editor')
    }

    const [first] = await conformanceRefreshNode(id)

    if (first === undefined) {
      throw new Error('Vue refresh returned no result')
    }

    return first
  },
  refreshAndUnmountMeasurementDocument(id) {
    if (conformanceRefreshNode === undefined) {
      throw new Error('Missing Vue measurement editor')
    }

    const pending = (async () => {
      const [first] = await conformanceRefreshNode(id)

      if (first === undefined) {
        throw new Error('Vue refresh returned no result')
      }

      return first
    })()

    app?.unmount()
    app = undefined

    return pending
  },
  destroyMeasurementDocument() {
    app?.unmount()
    app = undefined
    conformanceInternalNode = undefined
    conformanceNodesInitialized = undefined
    conformanceRefreshNode = undefined
  },
  updateViewport(viewport) {
    viewportState.value = viewport
  },
  changeKinds() {
    return [...changes]
  },
  readState(query) {
    if (
      conformanceSnapshot === undefined ||
      conformanceNode === undefined ||
      conformanceEdge === undefined
    ) {
      throw new Error('Missing Vue conformance state probe')
    }

    return {
      snapshot: conformanceSnapshot(),
      node:
        query.nodeId === undefined
          ? null
          : (conformanceNode(query.nodeId) ?? null),
      edge:
        query.edgeId === undefined
          ? null
          : (conformanceEdge(query.edgeId) ?? null),
    }
  },
  acceptedStates() {
    return [...conformanceAcceptedStates]
  },
  connectionCandidates() {
    return [...connectionCandidates]
  },
  clearConnectionCandidates() {
    connectionCandidates.length = 0
  },
  setSelectionMode(mode) {
    selectionMode.value = mode
  },
  setConnectionOptions(options) {
    connectionOptionsSet.value = true
    connectionMode.value = options.mode
    connectionRadius.value = options.radius
    autoPanOnConnect.value = options.autoPanOnConnect
  },
  setGestureOptions(options) {
    gestureOptions.value = options
  },
  setConnectionValidatorThrows(enabled) {
    connectionValidatorThrows.value = enabled
  },
  gestureEvents() {
    return [...gestureEventLog]
  },
  viewport() {
    return viewportState.value
  },
  setConnectionPreviewEnabled(enabled) {
    connectionPreviewEnabled.value = enabled
    connectionPreviewStates.length = 0
  },
  connectionPreviewStates() {
    return structuredClone(connectionPreviewStates)
  },
  connectionPreview() {
    return mountedFlow?.connectionPreview.value ?? null
  },
  destroy() {
    const changesBeforeDestroy = changes.length
    const acceptedBeforeDestroy = conformanceAcceptedStates.length
    app?.unmount()
    app = undefined
    document
      .querySelector('#app')
      ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

    const mountedElements = document.querySelectorAll(
      "[data-testid='flow-canvas'], [data-testid='flow-node'], [data-testid='flow-edge']"
    ).length

    return {
      mountedElements,
      changesAfterDestroy: changes.length - changesBeforeDestroy,
      acceptedStatesAfterDestroy:
        conformanceAcceptedStates.length - acceptedBeforeDestroy,
    }
  },
  async smoke() {
    app?.unmount()

    const left = ref(
      Effect.runSync(
        decodeFlowDocument({
          nodes: [
            { id: 'left-a', label: 'Left A', position: { x: 20, y: 30 } },
            { id: 'left-b', label: 'Left B', position: { x: 240, y: 30 } },
          ],
          edges: [
            {
              id: 'left-edge',
              source: 'left-a',
              target: 'left-b',
              label: 'Edge old',
            },
          ],
        })
      )
    )

    const right = ref(
      Effect.runSync(
        decodeFlowDocument({
          nodes: [
            { id: 'right-a', label: 'Right A', position: { x: 20, y: 120 } },
          ],
          edges: [],
        })
      )
    )

    let mounted = 0
    let unmounted = 0
    let edgeMounted = 0
    let edgeUnmounted = 0

    // SAFETY: Vue receives node values from the decoded initial FlowDocument in this test.
    const Visual = defineComponent({
      props: { node: { type: Object as PropType<FlowNode>, required: true } },
      setup(props) {
        const flow = useFlow()
        onMounted(() => {
          mounted += 1
        })
        onUnmounted(() => {
          unmounted += 1
        })

        return () =>
          h(
            'span',
            { 'data-flow-count': flow.nodes.value.length },
            props.node.label
          )
      },
    })

    // SAFETY: Vue receives edge values from the decoded initial FlowDocument in this test.
    const EdgeVisual = defineComponent({
      props: { edge: { type: Object as PropType<FlowEdge>, required: true } },
      setup(props) {
        onMounted(() => {
          edgeMounted += 1
        })
        onUnmounted(() => {
          edgeUnmounted += 1
        })

        return () => h('text', { 'data-edge-label': true }, props.edge.label)
      },
    })

    const Root = defineComponent({
      setup() {
        return () =>
          h('div', [
            h(FlowCanvas, {
              document: left.value,
              documentMode: 'controlled',
              nodeComponent: Visual,
              edgeComponent: EdgeVisual,
              'onUpdate:document': (value) => {
                left.value = value
              },
            }),
            h(FlowCanvas, {
              document: right.value,
              documentMode: 'controlled',
              nodeComponent: Visual,
              'onUpdate:document': (value) => {
                right.value = value
              },
            }),
          ])
      },
    })

    app = createApp(Root)
    app.mount('#app')

    const identity = document.querySelector<HTMLElement>(
      "[data-node-id='left-a']"
    )

    if (identity !== null) {
      identity.dataset.identity = 'left'
    }

    const firstNode = left.value.nodes.at(0)
    const secondNode = left.value.nodes.at(1)
    const firstEdge = left.value.edges.at(0)

    if (
      firstNode === undefined ||
      secondNode === undefined ||
      firstEdge === undefined
    ) {
      throw new Error('Expected populated left canvas fixture')
    }

    left.value = {
      ...left.value,
      nodes: [{ ...firstNode, label: 'Left A updated' }, secondNode],
      edges: [{ ...firstEdge, label: 'Edge updated' }],
    }
    await nextTick()

    const results = {
      leftCount:
        document.querySelector<HTMLElement>(
          "[data-node-id='left-a'] [data-flow-count]"
        )?.dataset.flowCount ?? null,
      rightCount:
        document.querySelector<HTMLElement>(
          "[data-node-id='right-a'] [data-flow-count]"
        )?.dataset.flowCount ?? null,
      labelUpdated:
        document
          .querySelector("[data-node-id='left-a']")
          ?.textContent?.includes('Left A updated') ?? false,
      edgeUpdated:
        document.querySelector("[data-edge-id='left-edge'] [data-edge-label]")
          ?.textContent === 'Edge updated',
      identityPreserved:
        document.querySelector<HTMLElement>("[data-node-id='left-a']")?.dataset
          .identity === 'left',
      mounted,
    }

    app.unmount()
    app = undefined
    await nextTick()

    return {
      ...results,
      unmounted,
      edgeMounted,
      edgeUnmounted,
      remaining: document.querySelectorAll(
        "[data-testid='flow-canvas'], [data-testid='flow-node'], [data-testid='flow-edge']"
      ).length,
    }
  },
  startSplitModel() {
    app?.unmount()

    const initial = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'split-a',
            label: 'Split A',
            position: { x: 20, y: 30 },
            handles: [{ id: 'out', kind: 'source', side: 'right' }],
          },
          {
            id: 'split-b',
            label: 'Split B',
            position: { x: 240, y: 30 },
            handles: [{ id: 'in', kind: 'target', side: 'left' }],
          },
        ],
        edges: [],
      })
    )

    const nodes = ref<readonly FlowNode[]>(initial.nodes)
    const edges = ref<readonly FlowEdge[]>([])
    splitNodeUpdates = 0
    splitEdgeUpdates = 0
    splitDocumentUpdater = undefined
    splitEditRequester = undefined
    splitProposalCount = 0

    // SAFETY: Vue receives split-node values from the decoded initial FlowDocument in this test.
    const SplitNode = defineComponent({
      props: { node: { type: Object as PropType<FlowNode>, required: true } },
      setup(props) {
        const flow = useFlow()
        splitDocumentUpdater = flow.updateDocument
        splitEditRequester = flow.applyEdit

        return () => h('span', props.node.label)
      },
    })

    const Root = defineComponent({
      setup() {
        return () =>
          h(FlowCanvas, {
            nodes: nodes.value,
            edges: edges.value,
            nodeComponent: SplitNode,
            'onUpdate:nodes': (next: readonly FlowNode[]) => {
              splitNodeUpdates += 1
              nodes.value = next
            },
            'onUpdate:edges': (next: readonly FlowEdge[]) => {
              splitEdgeUpdates += 1
              edges.value = next
            },
            onChange: (change: { readonly kind: string }) => {
              if (change.kind === 'edit-proposal') {
                splitProposalCount += 1
              }
            },
          })
      },
    })

    app = createApp(Root)
    app.mount('#app')
  },
  updateSplitDocument(document) {
    const update = splitDocumentUpdater

    if (update === undefined) {
      throw new Error('Split FlowCanvas updateDocument action is unavailable')
    }

    update(Effect.runSync(decodeFlowDocument(document)))
  },
  async applySplitEdit() {
    const request = splitEditRequester

    if (request === undefined) {
      throw new Error('Split FlowCanvas edit action is unavailable')
    }

    const result = await request({
      operations: [
        {
          kind: 'set-nodes',
          nodes: [
            {
              id: 'split-a',
              label: 'Split A',
              position: { x: 20, y: 30 },
              handles: [{ id: 'out', kind: 'source', side: 'right' }],
            },
            {
              id: 'split-c',
              label: 'Split C',
              position: { x: 460, y: 30 },
              handles: [{ id: 'in', kind: 'target', side: 'left' }],
            },
          ],
        },
        {
          kind: 'set-edges',
          edges: [
            {
              id: 'split-reconnected-edge',
              source: 'split-a',
              target: 'split-c',
              sourceHandle: 'out',
              targetHandle: 'in',
            },
          ],
        },
      ],
    })

    await nextTick()

    return result
  },
  splitEditSnapshot() {
    return {
      nodeIds: [
        ...document.querySelectorAll<HTMLElement>('[data-node-id]'),
      ].flatMap((node) => {
        const id = node.dataset.nodeId ?? ''

        return id.startsWith('split-') ? [id] : []
      }),
      edgeIds: [
        ...document.querySelectorAll<HTMLElement>('[data-edge-id]'),
      ].flatMap((edge) => {
        const id = edge.dataset.edgeId ?? ''

        return id.startsWith('split-') ? [id] : []
      }),
      nodeUpdates: splitNodeUpdates,
      edgeUpdates: splitEdgeUpdates,
      proposals: splitProposalCount,
    }
  },
  startNestedDragCase(mode) {
    app?.unmount()
    documentMode.value = mode
    viewportMode.value = 'uncontrolled'
    viewportState.value = { x: 0, y: 0, zoom: 1 }
    documentState.value = Effect.runSync(
      decodeFlowDocument({
        edges: [],
        nodes: [
          {
            id: 'child:[]',
            label: 'Nested Child',
            parentId: 'parent',
            position: { x: 20, y: 30 },
          },
          { id: 'parent', label: 'Parent', position: { x: 100, y: 120 } },
        ],
      })
    )
    changes = []
    positionChanges = []

    const DragRoot = defineComponent({
      setup() {
        return () =>
          h(FlowCanvas, {
            ...(mode === 'controlled'
              ? { document: documentState.value }
              : { defaultDocument: documentState.value }),
            documentMode: mode,
            defaultViewport: { x: 0, y: 0, zoom: 1 },
            viewportMode: 'uncontrolled',
            onChange: (change: {
              kind: string
              nodeId?: string
              position?: { x: number; y: number }
            }) => {
              changes.push(change.kind)

              if (
                change.kind === 'node-position' &&
                change.nodeId !== undefined &&
                change.position !== undefined
              ) {
                positionChanges.push({
                  nodeId: change.nodeId,
                  position: change.position,
                })
              }
            },
            'onUpdate:document': (next: FlowDocument) => {
              documentState.value = next
            },
          })
      },
    })

    app = createApp(DragRoot)
    app.mount('#app')
  },
  updateNestedDragDocument(document) {
    documentState.value = Effect.runSync(decodeFlowDocument(document))
  },
  startPublicState(inputDocument) {
    app?.unmount()

    for (const stop of publicObserverStops) {
      stop()
    }

    publicObserverStops.clear()
    contractKeyStops.clear()
    contractKeyStateLogs.clear()
    publicProbes.clear()
    publicDocuments.clear()
    publicViewports.clear()
    publicEvents.clear()
    publicAcceptLeft = false
    publicCandidateLeft = undefined
    publicSelectionProposal = undefined
    publicSelectionEventLog.clear()
    publicKeyStateLog = []
    publicProbeMounted.value = true

    const leftDocument = ref(
      Effect.runSync(
        decodeFlowDocument(
          inputDocument ?? {
            nodes: [
              {
                id: 'left-visible',
                label: 'Left visible',
                position: { x: 20, y: 30 },
                data: { tag: 'left' },
              },
              {
                id: 'left-hidden',
                label: 'Left hidden',
                hidden: true,
                position: { x: 240, y: 30 },
              },
            ],
            edges: [
              {
                id: 'left-edge',
                source: 'left-visible',
                target: 'left-hidden',
              },
            ],
          }
        )
      )
    )

    const rightDocument = ref(
      Effect.runSync(
        decodeFlowDocument({
          nodes: [
            {
              id: 'right-node',
              label: 'Right node',
              position: { x: 20, y: 120 },
            },
          ],
          edges: [],
        })
      )
    )

    const leftViewport = ref<Viewport>({ x: 0, y: 0, zoom: 1 })
    const rightViewport = ref<Viewport>({ x: 15, y: 25, zoom: 1.25 })
    publicDocuments.set('left', leftDocument)
    publicDocuments.set('right', rightDocument)
    publicViewports.set('left', leftViewport)
    publicViewports.set('right', rightViewport)
    publicEvents.set('left', [])
    publicEvents.set('right', [])

    const NodeIdProbe = defineComponent({
      props: {
        // SAFETY: The harness mounts this probe only with FlowNode values from the accepted fixtures.
        node: { type: Object as PropType<FlowNode>, required: true },
      },
      setup(props) {
        const nodeId = useNodeId()

        return () =>
          h('span', {
            'data-testid': `node-context-${props.node.id}`,
            'data-node-id-context': nodeId,
          })
      },
    })

    const Probe = defineComponent({
      props: {
        // SAFETY: The harness only mounts this probe with the two declared ids below.
        id: { type: String as PropType<'left' | 'right'>, required: true },
      },
      setup(props) {
        const flow = useFlow()
        const nodes = useNodes()
        const edges = useEdges()
        const viewport = useViewport()

        if (props.id !== 'left' && props.id !== 'right') {
          throw new Error(`Unknown public state probe ${props.id}`)
        }

        let notificationCount = 0

        const unsubscribe = flow.subscribeState(() => {
          notificationCount += 1
          publicEvents.get(props.id)?.push('accepted')
        })

        const probe: PublicProbe = {
          flow,
          nodes,
          edges,
          viewport,
          get notifications() {
            return notificationCount
          },
          unsubscribe,
        }

        publicProbes.set(props.id, probe)
        onUnmounted(() => probe.unsubscribe())

        return () =>
          h(
            'output',
            {
              'data-testid': `state-probe-${props.id}`,
              'data-node-count': nodes.value.length,
              'data-edge-count': edges.value.length,
              'data-viewport-x': viewport.value.x,
            },
            flow.snapshot.value.document.nodes
              .map(({ label }) => label)
              .join(',')
          )
      },
    })

    const Root = defineComponent({
      setup() {
        return () =>
          h('section', [
            h(
              FlowCanvas,
              {
                document: leftDocument.value,
                documentMode: 'controlled',
                viewport: leftViewport.value,
                viewportMode: 'controlled',
                renderOnlyVisible: true,
                nodeComponent: NodeIdProbe,
                onChange: () => publicEvents.get('left')?.push('proposal'),
                'onUpdate:document': (next: FlowDocument) => {
                  publicCandidateLeft = next

                  if (publicAcceptLeft) {
                    leftDocument.value = next
                  }
                },
                'onUpdate:viewport': (next: Viewport) => {
                  leftViewport.value = next
                },
              },
              {
                default: () =>
                  publicProbeMounted.value ? h(Probe, { id: 'left' }) : null,
              }
            ),
            h(
              FlowCanvas,
              {
                defaultDocument: rightDocument.value,
                documentMode: 'uncontrolled',
                defaultViewport: rightViewport.value,
                viewportMode: 'uncontrolled',
                onChange: () => publicEvents.get('right')?.push('proposal'),
              },
              {
                default: () =>
                  publicProbeMounted.value ? h(Probe, { id: 'right' }) : null,
              }
            ),
          ])
      },
    })

    app = createApp(Root)
    app.mount('#app')
  },
  publicState(id) {
    const probe = publicProbes.get(id)

    if (probe === undefined) {
      throw new Error(`Missing ${id} state probe`)
    }

    const snapshot = probe.flow.getSnapshot()
    const [firstNode] = snapshot.document.nodes

    return {
      document: snapshot.document,
      nodeIds: snapshot.document.nodes.map(({ id: nodeId }) => nodeId),
      edgeIds: snapshot.document.edges.map(({ id: edgeId }) => edgeId),
      viewport: probe.viewport.value,
      firstNodeX: snapshot.document.nodes[0]?.position.x ?? null,
      firstNodeData: snapshot.document.nodes[0]?.data ?? null,
      selectedData: probe.flow.getNodesData([
        'left-hidden',
        'left-visible',
        'missing',
      ]).value,
      selectedConnections: probe.flow.getNodeConnections({
        nodeId: 'left-visible',
      }).value,
      savedSession: probe.flow.getVersionedSavedSession(),
      missingNode: probe.flow.getNode('missing') === undefined,
      missingEdge: probe.flow.getEdge('missing') === undefined,
      frozen:
        Object.isFrozen(snapshot) &&
        Object.isFrozen(snapshot.document) &&
        Object.isFrozen(snapshot.document.nodes) &&
        Object.isFrozen(snapshot.document.nodes[0]),
      mutationRejected:
        firstNode === undefined || !Reflect.set(firstNode, 'label', 'mutated'),
      notifications: probe.notifications,
      events: publicEvents.get(id) ?? [],
    }
  },
  getPublicHandleConnections(id, query) {
    const probe = publicProbes.get(id)

    if (probe === undefined) {
      throw new Error(`Missing ${id} state probe`)
    }

    return probe.flow.getHandleConnections(query)
  },
  async exercisePreDeleteApproval() {
    const probe = publicProbes.get('left')

    if (probe === undefined) {
      throw new Error('Missing left state probe')
    }

    const order: string[] = []
    const referenceEvents: ApiUtilityDeletionEvent[] = []
    let candidateNodes: readonly string[] = []
    let candidateEdges: readonly string[] = []
    let beforeCompleted = false

    const result = await probe.flow.deleteElements(
      { nodeIds: ['left-visible'] },
      {
        onBeforeDelete: async (candidate) => {
          candidateNodes = candidate.nodes.map(({ id }) => id)
          candidateEdges = candidate.edges.map(({ id }) => id)
          referenceEvents.push({
            type: 'before:start',
            nodes: candidateNodes,
            edges: candidateEdges,
          })
          await Promise.resolve()
          beforeCompleted = true
          referenceEvents.push({ type: 'before:resolved' })

          return { nodes: candidate.nodes, edges: candidate.edges }
        },
        onEdgesDelete: (edges) => {
          order.push('edges')
          referenceEvents.push({
            type: 'edges',
            beforeCompleted,
            ids: edges.map(({ id }) => id),
          })
        },
        onNodesDelete: (nodes) => {
          order.push('nodes')
          referenceEvents.push({
            type: 'nodes',
            beforeCompleted,
            ids: nodes.map(({ id }) => id),
          })
        },
        onDelete: ({ nodes, edges }) => {
          order.push('combined')
          referenceEvents.push({
            type: 'delete',
            beforeCompleted,
            nodes: nodes.map(({ id }) => id),
            edges: edges.map(({ id }) => id),
          })
        },
      }
    )

    return {
      result,
      requested: { nodes: ['left-visible'], edges: [] },
      candidateNodes,
      candidateEdges,
      order,
      referenceEvents,
      acceptedNodeIds: probe.flow.snapshot.value.document.nodes.map(
        ({ id }) => id
      ),
      acceptedEdgeIds: probe.flow.snapshot.value.document.edges.map(
        ({ id }) => id
      ),
      ownerNodeIds:
        publicDocuments.get('left')?.value.nodes.map(({ id }) => id) ?? [],
    }
  },
  async exercisePreDeleteCallbackOutcomes() {
    const probe = publicProbes.get('left')
    const owner = publicDocuments.get('left')

    if (probe === undefined || owner === undefined) {
      throw new Error('Missing left state probe')
    }

    const callbacks: string[] = []

    const empty = await probe.flow.deleteElements(
      { nodeIds: ['missing-node'] },
      {
        onBeforeDelete: async (candidate) => {
          callbacks.push('before-empty')

          return await Promise.resolve(candidate)
        },
        onEdgesDelete: () => callbacks.push('edges-empty'),
        onNodesDelete: () => callbacks.push('nodes-empty'),
        onDelete: () => callbacks.push('combined-empty'),
      }
    )

    const emptyCallbacks = callbacks.splice(0)

    const failed = await probe.flow
      .deleteElements(
        { nodeIds: ['left-visible'] },
        {
          onEdgesDelete: () => {
            callbacks.push('edges')
            throw new Error('edge callback failed')
          },
          onNodesDelete: () => callbacks.push('nodes'),
          onDelete: () => callbacks.push('combined'),
        }
      )
      .then(
        () => 'deleted',
        (error: Error) => error.message
      )

    return {
      empty: { result: empty, callbacks: emptyCallbacks },
      failed,
      callbacks,
      ownerNodeIds: owner.value.nodes.map(({ id }) => id),
      acceptedNodeIds: probe.flow.snapshot.value.document.nodes.map(
        ({ id }) => id
      ),
      acceptedEdgeIds: probe.flow.snapshot.value.document.edges.map(
        ({ id }) => id
      ),
    }
  },
  async exerciseStalePreDeleteApproval() {
    const probe = publicProbes.get('left')
    const owner = publicDocuments.get('left')

    if (probe === undefined || owner === undefined) {
      throw new Error('Missing left state probe')
    }

    const initial = owner.value

    const approval = Promise.withResolvers<FlowDeleteDecision>()

    const { promise: requested, resolve: resolveRequested } =
      Promise.withResolvers<null>()

    const deletion = (async (): Promise<string> => {
      try {
        await probe.flow.deleteElements(
          { nodeIds: ['left-hidden'] },
          {
            onBeforeDelete: () => {
              resolveRequested(null)

              return approval.promise
            },
          }
        )

        return 'deleted'
      } catch (error) {
        return describeFlowEditFailure(error)
      }
    })()

    await requested
    owner.value = Effect.runSync(
      decodeFlowDocument({
        ...initial,
        nodes: initial.nodes.map((node) =>
          node.id === 'left-visible'
            ? {
                ...node,
                position: { ...node.position, x: node.position.x + 1 },
              }
            : node
        ),
      })
    )
    await nextTick()
    owner.value = initial
    await nextTick()
    approval.resolve(true)

    return deletion
  },
  async disposeDuringPreDeleteApproval() {
    const probe = publicProbes.get('left')

    if (probe === undefined || app === undefined) {
      throw new Error('Missing left state probe')
    }

    const approval = Promise.withResolvers<FlowDeleteDecision>()
    let approvalResolved = false

    const { promise: requested, resolve: resolveRequested } =
      Promise.withResolvers<null>()

    const deletion = (async (): Promise<string> => {
      try {
        await probe.flow.deleteElements(
          { nodeIds: ['left-hidden'] },
          {
            onBeforeDelete: () => {
              resolveRequested(null)

              return approval.promise.then((decision) => {
                approvalResolved = true

                return decision
              })
            },
          }
        )

        return 'deleted'
      } catch (error) {
        return describeFlowEditFailure(error)
      }
    })()

    await requested
    app.unmount()
    approval.resolve(true)

    await Promise.resolve()

    return {
      error: await deletion,
      approvalResolved,
      nodeIds: probe.flow.snapshot.value.document.nodes.map(({ id }) => id),
    }
  },
  async exercisePreDeleteDecisions() {
    const probe = publicProbes.get('left')

    if (probe === undefined) {
      throw new Error('Missing left state probe')
    }

    const denied = await probe.flow.deleteElements(
      { nodeIds: ['left-hidden'] },
      {
        onBeforeDelete: async () => await Promise.resolve(false),
      }
    )

    const widenedNode = probe.flow.getNode('left-visible')

    if (widenedNode === undefined) {
      throw new Error('Missing widening candidate')
    }

    const widened = await probe.flow
      .deleteElements(
        { nodeIds: ['left-hidden'] },
        {
          onBeforeDelete: async () =>
            await Promise.resolve({
              nodes: [widenedNode],
              edges: [],
            }),
        }
      )
      .then(() => 'deleted', describeFlowEditFailure)

    const rejected = await probe.flow
      .deleteElements(
        { nodeIds: ['left-hidden'] },
        {
          onBeforeDelete: () => {
            throw new Error('permission service failed')
          },
        }
      )
      .then(() => 'deleted', describeFlowEditFailure)

    return {
      denied,
      widened,
      rejected,
      acceptedNodeIds: probe.flow.snapshot.value.document.nodes.map(
        ({ id }) => id
      ),
      acceptedEdgeIds: probe.flow.snapshot.value.document.edges.map(
        ({ id }) => id
      ),
    }
  },
  async exerciseReentrantPreDelete() {
    const probe = publicProbes.get('right')

    if (probe === undefined) {
      throw new Error('Missing right state probe')
    }

    await probe.flow.addNodes({
      id: 'right-other',
      label: 'Other',
      position: { x: 80, y: 20 },
    })
    let inner: FlowEditResult['deletion'] | undefined
    const callbacks: string[] = []

    const outer = await probe.flow
      .deleteElements(
        { nodeIds: ['right-node'] },
        {
          onBeforeDelete: async () => {
            inner = await probe.flow.deleteElements({
              nodeIds: ['right-other'],
            })

            return true
          },
          onEdgesDelete: () => callbacks.push('edges'),
          onNodesDelete: () => callbacks.push('nodes'),
          onDelete: () => callbacks.push('combined'),
        }
      )
      .then(() => 'deleted', describeFlowEditFailure)

    return {
      outer,
      inner,
      callbacks,
      acceptedNodeIds: probe.flow.snapshot.value.document.nodes.map(
        ({ id }) => id
      ),
    }
  },
  async exerciseDeleteCallbackCancellation() {
    const probe = publicProbes.get('right')

    if (probe === undefined) {
      throw new Error('Missing right state probe')
    }

    const initial = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'right-node',
            label: 'Right node',
            position: { x: 20, y: 120 },
          },
          { id: 'right-other', label: 'Other', position: { x: 80, y: 20 } },
        ],
        edges: [
          { id: 'right-edge', source: 'right-node', target: 'right-other' },
        ],
      })
    )

    const results = []

    /* eslint-disable no-await-in-loop -- Each iteration resets state before running the next cancellation source. */
    for (const trigger of ['edges', 'nodes', 'combined'] as const) {
      probe.flow.updateDocument(initial)
      await nextTick()

      const abort = new AbortController()
      const callbacks: string[] = []

      const record = (name: typeof trigger): void => {
        callbacks.push(name)

        if (trigger === name) {
          abort.abort()
        }
      }

      const result = await probe.flow
        .deleteElements(
          { nodeIds: ['right-node'] },
          {
            signal: abort.signal,
            onEdgesDelete: () => record('edges'),
            onNodesDelete: () => record('nodes'),
            onDelete: () => record('combined'),
          }
        )
        .then(() => 'deleted', describeFlowEditFailure)

      results.push({
        trigger,
        result,
        callbacks,
        nodeIds: probe.flow.snapshot.value.document.nodes.map(({ id }) => id),
        edgeIds: probe.flow.snapshot.value.document.edges.map(({ id }) => id),
      })
    }
    /* eslint-enable no-await-in-loop */

    return results
  },
  async exerciseCallbackReentrantDelete() {
    const probe = publicProbes.get('right')

    if (probe === undefined) {
      throw new Error('Missing right state probe')
    }

    const initial = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'right-node',
            label: 'Right node',
            position: { x: 20, y: 120 },
          },
          { id: 'right-other', label: 'Other', position: { x: 80, y: 20 } },
        ],
        edges: [],
      })
    )

    probe.flow.updateDocument(initial)
    await nextTick()

    let inner: Promise<FlowEditResult['deletion']> | undefined

    const outer = await probe.flow.deleteElements(
      { nodeIds: ['right-node'] },
      {
        onDelete: () => {
          inner = probe.flow.deleteElements({ nodeIds: ['right-other'] })
        },
      }
    )

    const innerResult = inner === undefined ? undefined : await inner

    return {
      outer,
      inner: innerResult,
      nodeIds: probe.flow.snapshot.value.document.nodes.map(({ id }) => id),
    }
  },
  preparePublicRestore(id) {
    const probe = publicProbes.get(id)

    if (probe === undefined) {
      throw new Error(`Missing ${id} state probe`)
    }

    return probe.flow.prepareVersionedRestore(
      probe.flow.getVersionedSavedSession()
    )
  },
  updatePublicDocument(id, document) {
    const state = publicDocuments.get(id)

    if (state === undefined) {
      throw new Error(`Missing ${id} owner document`)
    }

    state.value = Effect.runSync(decodeFlowDocument(document))
  },
  updatePublicViewport(viewport, id = 'left') {
    const state = publicViewports.get(id)

    if (state === undefined) {
      throw new Error(`Missing ${id} owner viewport`)
    }

    state.value = viewport
  },
  proposePublicViewport() {
    const probe = publicProbes.get('left')

    if (probe === undefined) {
      throw new Error('Missing left state probe')
    }

    probe.flow.updateViewport({ x: 35, y: 45, zoom: 1.2 })
  },
  proposePublicPosition(id) {
    const probe = publicProbes.get(id)

    if (probe === undefined) {
      throw new Error(`Missing ${id} state probe`)
    }

    const [node] = probe.nodes.value

    if (node === undefined) {
      throw new Error(`Missing ${id} graph node`)
    }

    probe.flow.dispatch({
      kind: 'set-node-position',
      nodeId: node.id,
      position: { x: 90, y: 100 },
    })
  },
  acceptPublicProposals() {
    publicAcceptLeft = true
  },
  subscribePublicSelection(id) {
    const probe = publicProbes.get(id)

    if (probe === undefined) {
      throw new Error(`Missing ${id} state probe`)
    }

    const events: string[] = []
    publicSelectionEventLog.set(id, events)
    publicObserverStops.add(
      probe.flow.subscribeSelection(({ nodes, edges }) => {
        events.push(
          `${nodes.map(({ id: nodeId }) => nodeId).join(',')}|${edges.map(({ id: edgeId }) => edgeId).join(',')}`
        )
      })
    )
  },
  publicSelectionEvents(id) {
    return publicSelectionEventLog.get(id) ?? []
  },
  async proposePublicSelection() {
    const probe = publicProbes.get('left')

    if (probe === undefined) {
      throw new Error('Missing left state probe')
    }

    const result = await probe.flow.updateNode('left-visible', {
      selected: true,
    })

    publicSelectionProposal = result.document
  },
  acknowledgePublicSelection() {
    if (publicSelectionProposal === undefined) {
      throw new Error('Missing pending selection proposal')
    }

    const owner = publicDocuments.get('left')

    if (owner === undefined) {
      throw new Error('Missing left document owner')
    }

    owner.value = publicSelectionProposal
    publicSelectionProposal = undefined
  },
  observePublicKeyPress(target) {
    const probe = publicProbes.get('left')

    if (probe === undefined) {
      throw new Error('Missing left state probe')
    }

    publicKeyStateLog = []
    publicObserverStops.add(
      probe.flow.observeKeyPress('x', { target }, (pressed) =>
        publicKeyStateLog.push(pressed)
      )
    )
  },
  publicKeyStates() {
    return publicKeyStateLog
  },
  observeContractKeyPress(id, keyCode, options) {
    const probe = publicProbes.get('left')

    if (probe === undefined) {
      throw new Error('Missing left state probe')
    }

    const previousStop = contractKeyStops.get(id)

    if (previousStop !== undefined) {
      previousStop()
      publicObserverStops.delete(previousStop)
    }

    const states: boolean[] = []
    contractKeyStateLogs.set(id, states)

    const stop = probe.flow.observeKeyPress(keyCode, options, (pressed) => {
      states.push(pressed)
    })

    contractKeyStops.set(id, stop)
    publicObserverStops.add(stop)
  },
  contractKeyStates(id) {
    return contractKeyStateLogs.get(id) ?? []
  },
  unsubscribeContractKeyPress(id) {
    const stop = contractKeyStops.get(id)

    if (stop !== undefined) {
      stop()
      publicObserverStops.delete(stop)
      contractKeyStops.delete(id)
    }
  },
  async proposePublicDataEdit() {
    const probe = publicProbes.get('left')

    if (probe === undefined) {
      throw new Error('Missing left state probe')
    }

    const result = await probe.flow.updateNodeData('left-visible', {
      label: 'edited',
    })

    publicCandidateLeft = result.document

    return result
  },
  async exerciseFunctionalEditUpdaters() {
    const probe = publicProbes.get('right')

    if (probe === undefined) {
      throw new Error('Missing right public edit probe')
    }

    let calls = 0
    let mutationBlocked = false
    let queued: Promise<FlowEditResult> | undefined

    const unsubscribe = probe.flow.subscribeState(({ current }) => {
      if (
        current.document.nodes[0]?.data?.count === 1 &&
        queued === undefined
      ) {
        queued = probe.flow.updateNodeData('right-node', (data) => {
          calls += 1

          try {
            mutationBlocked = !Reflect.set(data, 'count', 100)
          } catch {
            mutationBlocked = true
          }

          return { count: Number(data.count ?? 0) + 1 }
        })
      }
    })

    await probe.flow.updateNodeData('right-node', (data) => {
      calls += 1

      return { count: Number(data.count ?? 0) + 1 }
    })
    await queued
    unsubscribe()

    return {
      calls,
      count: Number(
        probe.flow.getNode('right-node')?.data?.count ?? Number.NaN
      ),
      mutationBlocked,
    }
  },
  async disposeDuringEditPreparation(scenario) {
    const probe = publicProbes.get('right')

    if (probe === undefined) {
      throw new Error('Missing right public edit probe')
    }

    const events: string[] = []
    let queued: Promise<FlowEditResult> | undefined

    const stop = probe.flow.subscribeState(({ current }) => {
      if (
        current.document.nodes[0]?.data?.count === 1 &&
        queued === undefined
      ) {
        events.push('accepted:trigger')
        queued = probe.flow.applyEdit(scenario.queued)
        app?.unmount()
        app = undefined
      } else {
        events.push('late:notification')
      }
    })

    await probe.flow.applyEdit(scenario.trigger)
    let errorMessage = ''

    try {
      await queued
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error)
    }

    stop()

    return { error: errorMessage, events }
  },
  async applyPublicEditFixture(document, transaction) {
    const owner = publicDocuments.get('left')
    const probe = publicProbes.get('left')

    if (owner === undefined || probe === undefined) {
      throw new Error('Missing left public edit probe')
    }

    owner.value = Effect.runSync(decodeFlowDocument(document))
    await nextTick()
    publicEvents.get('left')?.splice(0)

    const [leftCanvas] =
      globalThis.document.querySelectorAll<HTMLElement>('.flow-vue-canvas')

    const retainedNode = leftCanvas?.querySelector<HTMLElement>(
      '.flow-vue-node[data-node-id="b"]'
    )

    const result = await probe.flow.applyEdit(transaction)
    const accepted = probe.flow.getSnapshot()

    const settledNode = leftCanvas?.querySelector<HTMLElement>(
      '.flow-vue-node[data-node-id="b"]'
    )

    return Object.assign(result, {
      acceptedDocument: accepted.document,
      events: [...(publicEvents.get('left') ?? [])],
      domNodeIds: [
        ...(leftCanvas?.querySelectorAll<HTMLElement>(
          '.flow-vue-node[data-node-id]'
        ) ?? []),
      ].map((element) => element.dataset.nodeId ?? ''),
      retainedDomIdentity:
        retainedNode !== null &&
        retainedNode !== undefined &&
        retainedNode === settledNode,
    })
  },
  async exercisePublicEditIsolation() {
    const left = publicProbes.get('left')
    const right = publicProbes.get('right')

    if (left === undefined || right === undefined) {
      throw new Error('Missing public edit isolation probes')
    }

    const leftEvents = publicEvents.get('left') ?? []
    const rightEvents = publicEvents.get('right') ?? []
    const leftStart = leftEvents.length
    const rightStart = rightEvents.length

    await right.flow.updateNodeData('right-node', { isolatedEdit: true })

    return {
      leftNodeIds: left.flow
        .getSnapshot()
        .document.nodes.map(({ id: nodeId }) => nodeId),
      rightData: right.flow.getNode('right-node')?.data ?? null,
      leftEvents: leftEvents.slice(leftStart),
      rightEvents: rightEvents.slice(rightStart),
    }
  },

  acknowledgePublicEdit() {
    const owner = publicDocuments.get('left')

    if (owner === undefined || publicCandidateLeft === undefined) {
      throw new Error('Missing pending left edit proposal')
    }

    owner.value = publicCandidateLeft
    publicCandidateLeft = undefined
  },
  async mountGestureIsolationHosts() {
    app?.unmount()
    isolationLeftDocument = ref(
      Effect.runSync(
        decodeFlowDocument({
          nodes: [
            {
              id: 'isolation-left',
              label: 'Left host',
              position: { x: 40, y: 60 },
            },
          ],
          edges: [],
        })
      )
    )
    isolationRightDocument = ref(
      Effect.runSync(
        decodeFlowDocument({
          nodes: [
            {
              id: 'isolation-right',
              label: 'Right host',
              position: { x: 40, y: 60 },
            },
          ],
          edges: [],
        })
      )
    )
    isolationShowLeft = ref(true)

    const leftDocument = isolationLeftDocument
    const rightDocument = isolationRightDocument
    isolationLeftChanges = []
    isolationRightChanges = []
    isolationLeftDragEvents = 0
    isolationRightDragEvents = 0

    const Root = defineComponent({
      setup() {
        return () =>
          h('div', { style: { display: 'flex', gap: '20px' } }, [
            ...(isolationShowLeft?.value && isolationLeftDocument !== undefined
              ? [
                  h('section', { 'data-testid': 'isolation-left-host' }, [
                    h(FlowCanvas, {
                      document: leftDocument.value,
                      documentMode: 'controlled',
                      onChange: (change: { kind: string }) =>
                        isolationLeftChanges.push(change.kind),
                      'onUpdate:document': (next: FlowDocument) => {
                        leftDocument.value = next
                      },
                      onNodeDragStart: () => {
                        isolationLeftDragEvents += 1
                      },
                      onNodeDrag: () => {
                        isolationLeftDragEvents += 1
                      },
                    }),
                  ]),
                ]
              : []),
            ...(isolationRightDocument === undefined
              ? []
              : [
                  h('section', { 'data-testid': 'isolation-right-host' }, [
                    h(FlowCanvas, {
                      document: rightDocument.value,
                      documentMode: 'controlled',
                      onChange: (change: { kind: string }) =>
                        isolationRightChanges.push(change.kind),
                      'onUpdate:document': (next: FlowDocument) => {
                        rightDocument.value = next
                      },
                      onNodeDragStart: () => {
                        isolationRightDragEvents += 1
                      },
                      onNodeDrag: () => {
                        isolationRightDragEvents += 1
                      },
                    }),
                  ]),
                ]),
          ])
      },
    })

    app = createApp(Root)
    app.mount('#app')
    await nextTick()
  },
  gestureIsolationSnapshot() {
    const leftNode = isolationLeftDocument?.value.nodes.at(0)
    const rightNode = isolationRightDocument?.value.nodes.at(0)

    return {
      leftNodeX: leftNode?.position.x ?? null,
      rightNodeX: rightNode?.position.x ?? null,
      leftChanges: [...isolationLeftChanges],
      rightChanges: [...isolationRightChanges],
      leftDragEvents: isolationLeftDragEvents,
      rightDragEvents: isolationRightDragEvents,
      leftCanvasCount: document.querySelectorAll(
        '[data-testid="isolation-left-host"] [data-testid="flow-canvas"]'
      ).length,
      rightCanvasCount: document.querySelectorAll(
        '[data-testid="isolation-right-host"] [data-testid="flow-canvas"]'
      ).length,
    }
  },

  async unmountGestureIsolationLeft() {
    if (isolationShowLeft === undefined) {
      throw new Error('Missing Vue gesture isolation host fixture')
    }

    isolationShowLeft.value = false
    await nextTick()
  },
  exercisePublicNotificationPolicy() {
    const probe = publicProbes.get('right')

    if (probe === undefined) {
      throw new Error('Missing right state probe')
    }

    const order: string[] = []
    let reentered = false

    const unsubscribeFirst = probe.flow.subscribeState(({ current }) => {
      order.push(`first:${current.viewport.x}`)

      if (!reentered) {
        reentered = true
        probe.flow.updateViewport({ x: 101, y: 25, zoom: 1.25 })
      }
    })

    const unsubscribeFailure = probe.flow.subscribeState(({ current }) => {
      order.push(`failure:${current.viewport.x}`)
      throw new Error('expected test listener failure')
    })

    const unsubscribeLast = probe.flow.subscribeState(({ current }) => {
      order.push(`last:${current.viewport.x}`)
    })

    probe.flow.updateViewport({ x: 100, y: 25, zoom: 1.25 })
    probe.flow.updateViewport({ x: 101, y: 25, zoom: 1.25 })
    unsubscribeFirst()
    unsubscribeFailure()
    unsubscribeLast()

    return order
  },
  unmountPublicObserver() {
    publicProbeMounted.value = false
  },
  destroyPublicCanvases() {
    app?.unmount()
    app = undefined
  },
  outsideProviderError() {
    let message = ''

    const Outside = defineComponent({
      setup() {
        try {
          useFlow()
        } catch (error) {
          message = error instanceof Error ? error.message : String(error)
        }

        return () => h('span')
      },
    })

    const outsideApp = createApp(Outside)
    const container = document.createElement('div')
    document.body.append(container)
    outsideApp.mount(container)
    outsideApp.unmount()
    container.remove()

    return message
  },
  splitModelSnapshot() {
    const node = document.querySelector<HTMLElement>("[data-node-id='split-a']")

    return {
      initialRendered: document.querySelectorAll('[data-node-id]').length === 2,
      nodeUpdateAcknowledged:
        splitNodeUpdates >= 1 &&
        node?.getAttribute('style')?.includes('left: 90px') === true,
      edgeUpdateAcknowledged:
        splitEdgeUpdates >= 1 &&
        document.querySelector('[data-edge-id]') !== null,
      documentUpdateAcknowledged:
        splitNodeUpdates === 2 &&
        splitEdgeUpdates === 2 &&
        node?.textContent?.includes('Updated split A') === true &&
        node?.getAttribute('style')?.includes('left: 90px') === true &&
        document.querySelector("[data-edge-id='split-replacement-edge']") !==
          null,
      identityPreserved: node?.dataset.identity === 'caller-node',
    }
  },
  get changes() {
    return changes
  },
  get positionChanges() {
    return [...positionChanges]
  },
}

window.__flowVueTest = api
