import type {
  FlowClipboardActions,
  FlowHistoryStatus,
  FlowTransactionContext,
  FlowChange,
  FlowCommand,
  FlowDeleteResult,
  FlowDeleteLifecycle,
  FlowDeleteDecision,
  FlowDocument,
  FlowEdge,
  FlowEdgeSchema,
  FlowEditResult,
  FlowEditTransactionInput,
  FlowNode,
  FlowHandleConnectionsQuery,
  FlowInternalNode,
  NodeInternalsRefreshResult,
  FlowNodeSchema,
  FlowSnapshot,
  ConnectionPreviewSnapshot,
  FlowConnectionState,
  FlowInteractivity,
  FlowInteractivityInput,
  SavedFlowSession,
  SavedVersionedFlowSession,
  FlowStateChange,
  FlowNodeConnection,
  FlowSelection,
  FlowAriaLabelConfig,
  FlowObject,
  FlowRect,
  Viewport,
  ViewportAnimationOptions,
  ViewportBounds,
  ViewportOperationResult,
  ViewportLimits,
  ViewportPadding,
} from '@flow/core'
import {
  createFlowHistory,
  flowHistoryStatus,
  HandleIdSchema,
  NodeIdSchema,
  encodeSavedFlowSession,
  encodeVersionedFlowSession,
  decodeSavedFlowSession,
  decodeVersionedFlowSession,
  FlowHandleConnectionsQuerySchema,
  selectHandleConnections,
  selectNodeConnections,
  diffNodeConnections,
  selectNodesData,
  prepareFlowDeleteCandidate,
  finalizeFlowDeleteCandidate,
  FlowDeleteRevisionConflict,
  FlowDeleteInvalidCandidate,
  FlowDeleteInProgress,
  FlowDeleteCancelled,
  FlowDeleteApprovalFailed,
  FlowEditDisposed,
  FlowEditDisposedSchema,
  defaultFlowAriaLabelConfig,
  getIntersectingNodes,
  getNodesBounds,
  isNodeIntersecting,
  toFlowObject,
} from '@flow/core'
import { Effect, Predicate, Schema as S } from 'effect'
import { computed, inject, onScopeDispose, toRaw, watch } from 'vue'
import type { ComputedRef, DeepReadonly, InjectionKey, ShallowRef } from 'vue'

import type { FlowKeyCode, FlowKeyPressOptions } from './key-press-observer.ts'

const prepareRestoreSession = (
  saved: SavedFlowSession
): Promise<FlowSnapshot> => Effect.runPromise(decodeSavedFlowSession(saved))

const encodePatch = (
  patch: Partial<FlowNode> | Partial<FlowEdge>
): typeof S.JsonObject.Type =>
  S.decodeUnknownSync(S.JsonObject)(
    Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined)
    )
  )

type NodeListInput =
  | readonly (typeof FlowNodeSchema.Encoded)[]
  | ((nodes: readonly FlowNode[]) => readonly FlowNode[])

type EdgeListInput =
  | readonly (typeof FlowEdgeSchema.Encoded)[]
  | ((edges: readonly FlowEdge[]) => readonly FlowEdge[])

type NodePatchInput =
  | Partial<FlowNode>
  | ((node: FlowNode) => Partial<FlowNode>)

type EdgePatchInput =
  | Partial<FlowEdge>
  | ((edge: FlowEdge) => Partial<FlowEdge>)

type NodeDataInput =
  | NonNullable<FlowNode['data']>
  | ((data: NonNullable<FlowNode['data']>) => NonNullable<FlowNode['data']>)

type EdgeDataInput =
  | NonNullable<FlowEdge['data']>
  | ((data: NonNullable<FlowEdge['data']>) => NonNullable<FlowEdge['data']>)

const isNodeListUpdater = (
  input: NodeListInput
): input is (nodes: readonly FlowNode[]) => readonly FlowNode[] =>
  // eslint-disable-next-line anti-slop/no-runtime-typeof -- callback discrimination is the public adapter boundary; functions stay out of serialized core operations.
  typeof input === 'function'

const isEdgeListUpdater = (
  input: EdgeListInput
): input is (edges: readonly FlowEdge[]) => readonly FlowEdge[] =>
  // eslint-disable-next-line anti-slop/no-runtime-typeof -- callback discrimination is the public adapter boundary; functions stay out of serialized core operations.
  typeof input === 'function'

const isNodePatchUpdater = (
  input: NodePatchInput
): input is (node: FlowNode) => Partial<FlowNode> =>
  // eslint-disable-next-line anti-slop/no-runtime-typeof -- callback discrimination is the public adapter boundary; functions stay out of serialized core operations.
  typeof input === 'function'

const isEdgePatchUpdater = (
  input: EdgePatchInput
): input is (edge: FlowEdge) => Partial<FlowEdge> =>
  // eslint-disable-next-line anti-slop/no-runtime-typeof -- callback discrimination is the public adapter boundary; functions stay out of serialized core operations.
  typeof input === 'function'

const isNodeDataUpdater = (
  input: NodeDataInput
): input is (
  data: NonNullable<FlowNode['data']>
) => NonNullable<FlowNode['data']> =>
  // eslint-disable-next-line anti-slop/no-runtime-typeof -- callback discrimination is the public adapter boundary; functions stay out of serialized core operations.
  typeof input === 'function'

const isEdgeDataUpdater = (
  input: EdgeDataInput
): input is (
  data: NonNullable<FlowEdge['data']>
) => NonNullable<FlowEdge['data']> =>
  // eslint-disable-next-line anti-slop/no-runtime-typeof -- callback discrimination is the public adapter boundary; functions stay out of serialized core operations.
  typeof input === 'function'

/**
 * Where a failure reported through FlowCanvas's `error` event happened:
 * a throwing `isValidConnection`, a rejected edit, a failed delete approval or
 * delete callback, a throwing state subscriber or a throwing connection
 * observer callback.
 */
export type FlowErrorBoundary =
  | 'connection-validator'
  | 'edit'
  | 'delete'
  | 'state-listener'
  | 'connection-observer'

/** Payload of FlowCanvas's `error` event, as React Flow's `onError`. */
export interface FlowErrorReport {
  readonly name: string
  readonly message: string
  readonly boundary: FlowErrorBoundary
}

/**
 * React Flow `FitViewOptions`. `nodes` also takes Flow's `all`/`selected`
 * shorthands and plain id lists.
 */
export type FlowCanvasFitViewOptions = ViewportAnimationOptions & {
  padding?: ViewportPadding
  includeHiddenNodes?: boolean
  minZoom?: number
  maxZoom?: number
  nodes?: 'all' | 'selected' | readonly string[] | readonly { id: string }[]
}

export interface FlowEditor {
  readonly copySelection?: FlowClipboardActions['copySelection']
  readonly pasteSelection?: FlowClipboardActions['pasteSelection']
  readonly setClipboardFragment?: FlowClipboardActions['setClipboardFragment']
  readonly history?: ComputedRef<FlowHistoryStatus>
  readonly undo?: () => Promise<void>
  readonly redo?: () => Promise<void>
  readonly rejectHistory?: (transactionId: string) => void
  readonly document: ComputedRef<DeepReadonly<FlowDocument>>
  readonly viewport: ComputedRef<DeepReadonly<Viewport>>
  readonly snapshot: ComputedRef<DeepReadonly<FlowSnapshot>>
  readonly getDocumentRevision: () => number
  readonly beginDeleteApproval: () => boolean
  readonly endDeleteApproval: () => void
  readonly withEditMutation: (mutation: () => void) => void
  readonly connectionPreview: ComputedRef<
    DeepReadonly<ConnectionPreviewSnapshot>
  >
  /** React Flow `ConnectionState` of the canvas's connection gesture. */
  readonly connectionState: ComputedRef<FlowConnectionState>
  /** Current interaction switches; the latest prop change or setter call wins. */
  readonly interactivity: Readonly<ShallowRef<FlowInteractivity>>
  readonly setInteractivity: (next: FlowInteractivityInput) => void
  /** Report a failure through the canvas `error` event. */
  readonly reportError: (error: Error, boundary: FlowErrorBoundary) => void
  readonly subscribeState: (
    listener: (change: FlowStateChange) => void
  ) => () => void
  readonly subscribeSelection: (
    listener: (selection: FlowSelection) => void
  ) => () => void
  readonly observeKeyPress: (
    keyCode: FlowKeyCode,
    options: FlowKeyPressOptions,
    listener: (pressed: boolean) => void
  ) => () => void
  readonly dispatch: (command: FlowCommand) => void
  readonly updateDocument: (
    document: FlowDocument,
    context?: FlowTransactionContext
  ) => void
  readonly applyEdit: (
    transaction: FlowEditTransactionInput
  ) => Promise<FlowEditResult>
  readonly applyEditResolved: (
    resolve: (document: FlowDocument) => FlowEditTransactionInput
  ) => Promise<FlowEditResult>
  readonly updateViewport: (viewport: Viewport) => void
  readonly getViewport: () => Viewport
  /** Zoom limits of the providing canvas. Optional for custom providers. */
  readonly getViewportLimits?: () => ViewportLimits
  readonly getZoom: () => number
  readonly viewportInitialized: () => boolean
  readonly screenToFlowPosition: (position: { x: number; y: number }) => {
    x: number
    y: number
  }
  readonly flowToScreenPosition: (position: { x: number; y: number }) => {
    x: number
    y: number
  }
  readonly setViewport: (
    viewport: Viewport,
    options?: ViewportAnimationOptions
  ) => Promise<ViewportOperationResult>
  readonly zoomIn: (
    options?: ViewportAnimationOptions
  ) => Promise<ViewportOperationResult>
  readonly zoomOut: (
    options?: ViewportAnimationOptions
  ) => Promise<ViewportOperationResult>
  readonly zoomTo: (
    zoom: number,
    options?: ViewportAnimationOptions
  ) => Promise<ViewportOperationResult>
  readonly setCenter: (
    x: number,
    y: number,
    options?: ViewportAnimationOptions & { zoom?: number }
  ) => Promise<ViewportOperationResult>
  readonly fitBounds: (
    bounds: ViewportBounds,
    options?: ViewportAnimationOptions & { padding?: ViewportPadding }
  ) => Promise<ViewportOperationResult>
  readonly fitView: (
    options?: FlowCanvasFitViewOptions
  ) => Promise<ViewportOperationResult>
  readonly getViewportForBounds: (
    bounds: ViewportBounds,
    options?: { padding?: ViewportPadding }
  ) => Viewport | undefined
  readonly publish: (change: FlowChange) => void
  readonly getInternalNode: (id: string) => FlowInternalNode | undefined
  readonly nodesInitialized: (options?: { includeHidden?: boolean }) => boolean
  readonly updateNodeInternals: (
    nodeIds: string | readonly string[]
  ) => Promise<readonly NodeInternalsRefreshResult[]>
  /** Every internal node by id; optional for custom providers. */
  readonly getInternalNodes?: () => ReadonlyMap<string, FlowInternalNode>
  /** Last DOM sizes by node id (React `node.measured`); reactive. */
  readonly measuredSizes?: ComputedRef<
    ReadonlyMap<string, { readonly width: number; readonly height: number }>
  >
  /** Resolved `ariaLabelConfig` of the canvas. */
  readonly ariaLabelConfig?: ComputedRef<FlowAriaLabelConfig>
}

export type FlowDeleteLifecycleOptions = FlowDeleteLifecycle & {
  readonly signal?: AbortSignal | undefined
}

export const FlowEditorKey: InjectionKey<FlowEditor> = Symbol('FlowEditor')

export const FlowNodeIdKey: InjectionKey<string> = Symbol('FlowNodeId')

/** Read the ID provided by a custom node renderer, when called below one. */
export const useNodeId = (): string | undefined => inject(FlowNodeIdKey)

export interface FlowNodeSlot {
  readonly node: FlowNode
}

export interface FlowActions extends FlowClipboardActions {
  readonly history: ComputedRef<FlowHistoryStatus>
  readonly undo: () => Promise<void>
  readonly redo: () => Promise<void>
  readonly rejectHistory: (transactionId: string) => void
  readonly document: ComputedRef<DeepReadonly<FlowDocument>>
  readonly nodes: ComputedRef<readonly DeepReadonly<FlowNode>[]>
  readonly edges: ComputedRef<readonly DeepReadonly<FlowEdge>[]>
  readonly getNodesData: (
    nodeIds: readonly string[]
  ) => ComputedRef<readonly ReturnType<typeof selectNodesData>[number][]>
  readonly getNodeConnections: (options: {
    readonly nodeId: string
    readonly type?: 'source' | 'target'
    readonly handleId?: string | null
  }) => ComputedRef<ReturnType<typeof selectNodeConnections>>
  readonly getHandleConnections: (
    query: FlowHandleConnectionsQuery
  ) => ReturnType<typeof selectHandleConnections>
  readonly viewport: ComputedRef<DeepReadonly<Viewport>>
  readonly snapshot: FlowEditor['snapshot']
  readonly connectionPreview: FlowEditor['connectionPreview']
  readonly connectionState: FlowEditor['connectionState']
  readonly interactivity: FlowEditor['interactivity']
  readonly setInteractivity: FlowEditor['setInteractivity']
  /** The canvas's resolved `ariaLabelConfig`. */
  readonly ariaLabelConfig: ComputedRef<FlowAriaLabelConfig>
  readonly getSnapshot: () => DeepReadonly<FlowSnapshot>
  readonly getVersionedSavedSession: () => SavedVersionedFlowSession
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- Public persistence input is decoded by the versioned session boundary.
  readonly prepareVersionedRestore: (saved: unknown) => Promise<FlowSnapshot>
  readonly getSavedSession: () => SavedFlowSession
  readonly prepareRestore: (saved: SavedFlowSession) => Promise<FlowSnapshot>
  /** The accepted node with `measured` set from the last DOM measurement. */
  readonly getNode: (id: string) => DeepReadonly<FlowNode> | undefined
  /** React Flow `getNodes()`: accepted nodes with `measured` set. */
  readonly getNodes: () => readonly DeepReadonly<FlowNode>[]
  /** React Flow `getEdges()`. */
  readonly getEdges: () => readonly DeepReadonly<FlowEdge>[]
  /** React Flow `toObject()`: detached nodes, edges and viewport. */
  readonly toObject: () => FlowObject
  /**
   * React Flow `getIntersectingNodes(nodeOrRect, partially, nodes)`: nodes
   * whose measured bounds intersect the node (by id) or flow rectangle.
   */
  readonly getIntersectingNodes: (
    nodeOrRect: FlowNodeReference | FlowRect,
    partially?: boolean,
    nodes?: readonly FlowNodeReference[]
  ) => readonly DeepReadonly<FlowNode>[]
  /** React Flow `isNodeIntersecting(nodeOrRect, area, partially)`. */
  readonly isNodeIntersecting: (
    nodeOrRect: FlowNodeReference | FlowRect,
    area: FlowRect,
    partially?: boolean
  ) => boolean
  /** React Flow `getNodesBounds(nodes)` over measured absolute bounds. */
  readonly getNodesBounds: (
    nodes: readonly (FlowNodeReference | string)[]
  ) => FlowRect
  readonly getEdge: (id: string) => DeepReadonly<FlowEdge> | undefined
  readonly subscribeState: FlowEditor['subscribeState']
  readonly subscribeSelection: FlowEditor['subscribeSelection']
  readonly observeKeyPress: FlowEditor['observeKeyPress']
  readonly dispatch: FlowEditor['dispatch']
  readonly updateDocument: FlowEditor['updateDocument']
  readonly applyEdit: FlowEditor['applyEdit']
  readonly setNodes: (
    nodes:
      | readonly (typeof FlowNodeSchema.Encoded)[]
      | ((nodes: readonly FlowNode[]) => readonly FlowNode[])
  ) => Promise<FlowEditResult>
  readonly addNodes: (
    nodes:
      | typeof FlowNodeSchema.Encoded
      | readonly (typeof FlowNodeSchema.Encoded)[]
  ) => Promise<FlowEditResult>
  readonly setEdges: (
    edges:
      | readonly (typeof FlowEdgeSchema.Encoded)[]
      | ((edges: readonly FlowEdge[]) => readonly FlowEdge[])
  ) => Promise<FlowEditResult>
  readonly addEdges: (
    edges:
      | typeof FlowEdgeSchema.Encoded
      | readonly (typeof FlowEdgeSchema.Encoded)[]
  ) => Promise<FlowEditResult>
  readonly updateNode: (
    id: string,
    patch: Partial<FlowNode> | ((node: FlowNode) => Partial<FlowNode>),
    options?: { replace?: boolean }
  ) => Promise<FlowEditResult>
  readonly updateNodeData: (
    id: string,
    data:
      | NonNullable<FlowNode['data']>
      | ((
          data: NonNullable<FlowNode['data']>
        ) => NonNullable<FlowNode['data']>),
    options?: { replace?: boolean }
  ) => Promise<FlowEditResult>
  readonly updateEdge: (
    id: string,
    patch: Partial<FlowEdge> | ((edge: FlowEdge) => Partial<FlowEdge>),
    options?: { replace?: boolean }
  ) => Promise<FlowEditResult>
  readonly updateEdgeData: (
    id: string,
    data:
      | NonNullable<FlowEdge['data']>
      | ((
          data: NonNullable<FlowEdge['data']>
        ) => NonNullable<FlowEdge['data']>),
    options?: { replace?: boolean }
  ) => Promise<FlowEditResult>
  readonly deleteElements: (
    input: {
      nodeIds?: readonly string[]
      edgeIds?: readonly string[]
    },
    options?: FlowDeleteLifecycleOptions
  ) => Promise<FlowDeleteResult>
  readonly updateViewport: FlowEditor['updateViewport']
  readonly getViewport: FlowEditor['getViewport']
  /** Zoom limits of the nearest FlowCanvas. */
  readonly getViewportLimits: () => ViewportLimits
  readonly getZoom: FlowEditor['getZoom']
  readonly viewportInitialized: FlowEditor['viewportInitialized']
  readonly screenToFlowPosition: FlowEditor['screenToFlowPosition']
  readonly flowToScreenPosition: FlowEditor['flowToScreenPosition']
  readonly setViewport: FlowEditor['setViewport']
  readonly zoomIn: FlowEditor['zoomIn']
  readonly zoomOut: FlowEditor['zoomOut']
  readonly zoomTo: FlowEditor['zoomTo']
  readonly setCenter: FlowEditor['setCenter']
  readonly fitBounds: FlowEditor['fitBounds']
  readonly fitView: FlowEditor['fitView']
  readonly getViewportForBounds: FlowEditor['getViewportForBounds']
  readonly getInternalNode: FlowEditor['getInternalNode']
  readonly nodesInitialized: FlowEditor['nodesInitialized']
  readonly updateNodeInternals: FlowEditor['updateNodeInternals']
}

/** A node or anything carrying its id, as React instance methods accept. */
export interface FlowNodeReference {
  readonly id: string
}

export interface FlowNodeConnectionsOptions {
  readonly nodeId?: string
  readonly type?: 'source' | 'target'
  readonly handleId?: string | null
  readonly onConnect?: (connections: readonly FlowNodeConnection[]) => void
  readonly onDisconnect?: (connections: readonly FlowNodeConnection[]) => void
}

/** Directional connection observer for one handle; null or empty IDs aggregate handles. */
export interface FlowHandleConnectionsOptions {
  readonly nodeId?: string
  readonly type: 'source' | 'target'
  readonly id?: string | null
  readonly onConnect?: (connections: readonly FlowNodeConnection[]) => void
  readonly onDisconnect?: (connections: readonly FlowNodeConnection[]) => void
}

/** The internal node of a referenced node, or a rectangle as given. */
const intersectionSubject = (
  nodeOrRect: FlowNodeReference | FlowRect,
  lookup: ReadonlyMap<string, FlowInternalNode>
): FlowInternalNode | FlowRect | undefined =>
  'id' in nodeOrRect ? lookup.get(nodeOrRect.id) : nodeOrRect

export const useFlow = (): FlowActions => {
  const editor = inject(FlowEditorKey)

  if (editor === undefined) {
    throw new Error(
      'useFlow must be called in setup() below a mounted FlowCanvas provider'
    )
  }

  const { snapshot } = editor

  const getSnapshot = (): DeepReadonly<FlowSnapshot> => snapshot.value

  const getSavedSession = (): SavedFlowSession =>
    encodeSavedFlowSession(snapshot.value.document, snapshot.value.viewport)

  const withMeasured = (
    node: DeepReadonly<FlowNode>
  ): DeepReadonly<FlowNode> => {
    const size = editor.measuredSizes?.value.get(node.id)

    return size === undefined
      ? node
      : { ...node, measured: { width: size.width, height: size.height } }
  }

  const getNode = (id: string): DeepReadonly<FlowNode> | undefined => {
    const internal = editor.getInternalNode(id)

    if (internal === undefined) {
      return undefined
    }

    return internal.measurementStatus === 'measured'
      ? {
          ...internal.node,
          measured: { width: internal.width, height: internal.height },
        }
      : withMeasured(internal.node)
  }

  const internalNodes = (): ReadonlyMap<string, FlowInternalNode> =>
    editor.getInternalNodes?.() ??
    new Map(
      getSnapshot().document.nodes.flatMap((node) => {
        const internal = editor.getInternalNode(node.id)

        return internal === undefined ? [] : [[node.id, internal] as const]
      })
    )

  const getEdge = (id: string): DeepReadonly<FlowEdge> | undefined =>
    getSnapshot().document.edges.find((edge) => edge.id === id)

  const document = computed(() => snapshot.value.document)
  const viewport = computed(() => snapshot.value.viewport)
  let deleteSequence = 0
  let scopeDisposed = false
  const pendingDeleteRejectors = new Set<(error: Error) => void>()

  onScopeDispose(() => {
    scopeDisposed = true

    for (const reject of pendingDeleteRejectors) {
      reject(FlowEditDisposedSchema.make({}))
    }
  })

  const getNodesData: FlowActions['getNodesData'] = (nodeIds) =>
    computed(() =>
      selectNodesData(
        snapshot.value.document,
        nodeIds.map((id) => NodeIdSchema.make(id))
      )
    )

  const getNodeConnections: FlowActions['getNodeConnections'] = (query) =>
    computed(() => {
      const validatedOptions = {
        nodeId: NodeIdSchema.make(query.nodeId),
      }

      if (query.type !== undefined) {
        Object.assign(validatedOptions, { type: query.type })
      }

      if (query.handleId !== undefined) {
        Object.assign(validatedOptions, {
          handleId:
            query.handleId === null
              ? null
              : HandleIdSchema.make(query.handleId),
        })
      }

      return selectNodeConnections(snapshot.value.document, validatedOptions)
    })

  const getHandleConnections: FlowActions['getHandleConnections'] = (query) =>
    selectHandleConnections(
      snapshot.value.document,
      S.decodeUnknownSync(FlowHandleConnectionsQuerySchema)(query)
    )

  return {
    document,
    nodes: computed(() => snapshot.value.document.nodes.map(withMeasured)),
    edges: computed(() => snapshot.value.document.edges),
    getNodesData,
    getNodeConnections,
    getHandleConnections,
    viewport,
    snapshot,
    connectionPreview: editor.connectionPreview,
    connectionState: editor.connectionState,
    interactivity: editor.interactivity,
    setInteractivity: editor.setInteractivity,
    ariaLabelConfig:
      editor.ariaLabelConfig ?? computed(() => defaultFlowAriaLabelConfig),
    getSnapshot,
    getVersionedSavedSession: () =>
      encodeVersionedFlowSession(
        snapshot.value.document,
        snapshot.value.viewport
      ),
    prepareVersionedRestore: (saved) =>
      Effect.runPromise(decodeVersionedFlowSession(saved)),
    getSavedSession,
    prepareRestore: prepareRestoreSession,
    getNode,
    getEdge,
    getNodes: () =>
      getSnapshot().document.nodes.flatMap(({ id }) => {
        const node = getNode(id)

        return node === undefined ? [] : [node]
      }),
    getEdges: () => getSnapshot().document.edges,
    // SAFETY: the accepted snapshot is immutable data; toFlowObject deep-copies it.
    toObject: () => toFlowObject(toRaw(getSnapshot()) as FlowSnapshot),
    getIntersectingNodes: (nodeOrRect, partially, nodes) => {
      const lookup = internalNodes()
      const subject = intersectionSubject(nodeOrRect, lookup)

      if (subject === undefined) {
        return []
      }

      const candidates = (nodes ?? getSnapshot().document.nodes).flatMap(
        ({ id }) => {
          const internal = lookup.get(id)

          return internal === undefined ? [] : [internal]
        }
      )

      return getIntersectingNodes(
        subject,
        partially ?? true,
        candidates
      ).flatMap((internal) => getNode(internal.node.id) ?? [])
    },
    isNodeIntersecting: (nodeOrRect, area, partially = true) => {
      const subject = intersectionSubject(nodeOrRect, internalNodes())

      return (
        subject !== undefined && isNodeIntersecting(subject, area, partially)
      )
    },
    getNodesBounds: (nodes) => {
      const nodeLookup = internalNodes()

      return getNodesBounds(
        nodes.map((node) => (Predicate.isString(node) ? node : node.id)),
        { nodeLookup }
      )
    },
    getInternalNode: editor.getInternalNode,
    nodesInitialized: editor.nodesInitialized,
    updateNodeInternals: editor.updateNodeInternals,
    subscribeState: editor.subscribeState,
    subscribeSelection: editor.subscribeSelection,
    observeKeyPress: editor.observeKeyPress,
    dispatch: editor.dispatch,
    history:
      editor.history ??
      computed(() =>
        flowHistoryStatus(
          createFlowHistory({ nodes: [], edges: [] }, { capacity: 0 })
        )
      ),
    copySelection: () => editor.copySelection?.() ?? null,
    pasteSelection: (options) =>
      editor.pasteSelection?.(options) ??
      Promise.reject(new Error('FlowClipboardUnavailable')),
    setClipboardFragment: (input) => editor.setClipboardFragment?.(input),
    undo: () => editor.undo?.() ?? Promise.resolve(),
    redo: () => editor.redo?.() ?? Promise.resolve(),
    rejectHistory: (transactionId) => editor.rejectHistory?.(transactionId),
    updateDocument: editor.updateDocument,
    updateViewport: editor.updateViewport,
    getViewport: editor.getViewport,
    getViewportLimits: () =>
      editor.getViewportLimits?.() ?? { minZoom: 0.4, maxZoom: 2 },
    getZoom: editor.getZoom,
    viewportInitialized: editor.viewportInitialized,
    screenToFlowPosition: editor.screenToFlowPosition,
    flowToScreenPosition: editor.flowToScreenPosition,
    setViewport: editor.setViewport,
    zoomIn: editor.zoomIn,
    zoomOut: editor.zoomOut,
    zoomTo: editor.zoomTo,
    setCenter: editor.setCenter,
    fitBounds: editor.fitBounds,
    fitView: editor.fitView,
    getViewportForBounds: editor.getViewportForBounds,
    applyEdit: editor.applyEdit,
    setNodes: (nodes) =>
      isNodeListUpdater(nodes)
        ? editor.applyEditResolved((currentDocument) => ({
            operations: [
              { kind: 'set-nodes', nodes: nodes(currentDocument.nodes) },
            ],
          }))
        : editor.applyEdit({ operations: [{ kind: 'set-nodes', nodes }] }),
    addNodes: (nodes) =>
      editor.applyEdit({
        operations: [
          {
            kind: 'add-nodes',
            nodes: Array.isArray(nodes) ? nodes : [nodes],
          },
        ],
      }),
    setEdges: (edges) =>
      isEdgeListUpdater(edges)
        ? editor.applyEditResolved((currentDocument) => ({
            operations: [
              { kind: 'set-edges', edges: edges(currentDocument.edges) },
            ],
          }))
        : editor.applyEdit({ operations: [{ kind: 'set-edges', edges }] }),
    addEdges: (edges) =>
      editor.applyEdit({
        operations: [
          {
            kind: 'add-edges',
            edges: Array.isArray(edges) ? edges : [edges],
          },
        ],
      }),
    updateNode: (id, patch, options) =>
      editor.applyEditResolved((currentDocument) => {
        const node = currentDocument.nodes.find(
          (candidate) => candidate.id === id
        )

        if (node === undefined) {
          return { operations: [] }
        }

        const resolvedPatch = isNodePatchUpdater(patch) ? patch(node) : patch

        return {
          operations: [
            {
              kind: 'update-node',
              nodeId: id,
              patch: encodePatch(resolvedPatch),
              replace: options?.replace,
            },
          ],
        }
      }),
    updateNodeData: (id, data, options) =>
      editor.applyEditResolved((currentDocument) => {
        const node = currentDocument.nodes.find(
          (candidate) => candidate.id === id
        )

        if (node === undefined) {
          return { operations: [] }
        }

        const resolvedData = isNodeDataUpdater(data)
          ? data(node.data ?? {})
          : data

        return {
          operations: [
            {
              kind: 'update-node-data',
              nodeId: id,
              data: resolvedData,
              replace: options?.replace,
            },
          ],
        }
      }),
    updateEdge: (id, patch, options) =>
      editor.applyEditResolved((currentDocument) => {
        const edge = currentDocument.edges.find(
          (candidate) => candidate.id === id
        )

        if (edge === undefined) {
          return { operations: [] }
        }

        const resolvedPatch = isEdgePatchUpdater(patch) ? patch(edge) : patch

        return {
          operations: [
            {
              kind: 'update-edge',
              edgeId: id,
              patch: encodePatch(resolvedPatch),
              replace: options?.replace,
            },
          ],
        }
      }),
    updateEdgeData: (id, data, options) =>
      editor.applyEditResolved((currentDocument) => {
        const edge = currentDocument.edges.find(
          (candidate) => candidate.id === id
        )

        if (edge === undefined) {
          return { operations: [] }
        }

        const resolvedData = isEdgeDataUpdater(data)
          ? data(edge.data ?? {})
          : data

        return {
          operations: [
            {
              kind: 'update-edge-data',
              edgeId: id,
              data: resolvedData,
              replace: options?.replace,
            },
          ],
        }
      }),
    deleteElements: async (input, lifecycle) => {
      deleteSequence += 1

      const operationId = `vue-delete-${deleteSequence}`
      const capturedRevision = editor.getDocumentRevision()
      const capturedDocument = getSnapshot().document
      let reportedDeleteFailure: Error | undefined

      const prepared = await Effect.runPromise(
        prepareFlowDeleteCandidate(capturedDocument, input)
      )

      if (
        prepared.candidate.nodes.length === 0 &&
        prepared.candidate.edges.length === 0
      ) {
        return prepared.result.deletion
      }

      if (lifecycle?.signal?.aborted) {
        throw new FlowDeleteCancelled({ operationId })
      }

      const assertDeleteCanPublish = (): void => {
        if (scopeDisposed) {
          throw FlowEditDisposedSchema.make({})
        }

        if (lifecycle?.signal?.aborted) {
          throw new FlowDeleteCancelled({ operationId })
        }

        const actualRevision = editor.getDocumentRevision()

        if (
          lifecycle?.onBeforeDelete !== undefined &&
          actualRevision !== capturedRevision
        ) {
          throw new FlowDeleteRevisionConflict({
            operationId,
            expectedRevision: capturedRevision,
            actualRevision,
          })
        }
      }

      const assertDeleteNotCancelled = (): void => {
        if (lifecycle?.signal?.aborted) {
          throw new FlowDeleteCancelled({ operationId })
        }
      }

      const notifyDeleteCandidate = (candidate: {
        readonly nodes: readonly FlowNode[]
        readonly edges: readonly FlowEdge[]
      }): Error | undefined => {
        try {
          if (candidate.edges.length > 0) {
            lifecycle?.onEdgesDelete?.(candidate.edges)
          }

          assertDeleteNotCancelled()

          if (candidate.nodes.length > 0) {
            lifecycle?.onNodesDelete?.(candidate.nodes)
          }

          assertDeleteNotCancelled()
          lifecycle?.onDelete?.(candidate)
          assertDeleteNotCancelled()

          return undefined
        } catch (error) {
          return error instanceof Error ? error : new Error(String(error))
        }
      }

      const publishDeleteCandidate = (candidate: {
        readonly nodes: readonly FlowNode[]
        readonly edges: readonly FlowEdge[]
      }): Promise<FlowEditResult> => {
        interface DeleteCallbackOutcome {
          failure: Error | undefined
          ready: boolean
        }

        const callbackOutcome: DeleteCallbackOutcome = {
          failure: undefined,
          ready: false,
        }

        let result: Promise<FlowEditResult> | undefined

        editor.withEditMutation(() => {
          assertDeleteCanPublish()

          result = editor.applyEditResolved(() => {
            if (callbackOutcome.failure !== undefined) {
              throw callbackOutcome.failure
            }

            if (!callbackOutcome.ready) {
              throw new FlowDeleteCancelled({ operationId })
            }

            assertDeleteCanPublish()

            return {
              operations: [
                {
                  kind: 'delete-elements',
                  nodeIds: candidate.nodes.map(({ id }) => id),
                  edgeIds: candidate.edges.map(({ id }) => id),
                },
              ],
            }
          })

          callbackOutcome.failure = notifyDeleteCandidate(candidate)
          callbackOutcome.ready = callbackOutcome.failure === undefined

          if (
            callbackOutcome.failure !== undefined &&
            !(callbackOutcome.failure instanceof FlowDeleteCancelled)
          ) {
            reportedDeleteFailure = callbackOutcome.failure
            editor.reportError(callbackOutcome.failure, 'delete')
          }
        })

        if (result === undefined) {
          throw new Error('FlowDeletePublicationUnavailable')
        }

        return result
      }

      if (lifecycle?.onBeforeDelete === undefined) {
        const finalized = Effect.runSync(
          finalizeFlowDeleteCandidate(
            capturedDocument,
            prepared.candidate,
            true,
            operationId
          )
        )

        const candidate = {
          nodes: capturedDocument.nodes.filter(({ id }) =>
            finalized.deletion.deletedNodeIds.includes(id)
          ),
          edges: capturedDocument.edges.filter(({ id }) =>
            finalized.deletion.deletedEdgeIds.includes(id)
          ),
        }

        if (candidate.nodes.length === 0 && candidate.edges.length === 0) {
          return finalized.deletion
        }

        const published = await publishDeleteCandidate(candidate)

        return published.deletion
      }

      if (scopeDisposed) {
        throw FlowEditDisposedSchema.make({})
      }

      if (!editor.beginDeleteApproval()) {
        throw new FlowDeleteInProgress({ operationId })
      }

      const pending = Promise.withResolvers<FlowDeleteResult>()
      let settled = false

      let rejectPending = (error: Error): void => {
        pending.reject(error)
      }

      let onAbort = (): void => {
        rejectPending(new FlowDeleteCancelled({ operationId }))
      }

      const finish = (error?: Error, result?: FlowDeleteResult): void => {
        if (settled) {
          return
        }

        settled = true
        editor.endDeleteApproval()
        pendingDeleteRejectors.delete(rejectPending)
        lifecycle.signal?.removeEventListener('abort', onAbort)

        if (error === undefined) {
          pending.resolve(result ?? { deletedNodeIds: [], deletedEdgeIds: [] })
        } else {
          pending.reject(error)
        }
      }

      rejectPending = (error: Error): void => finish(error)
      onAbort = (): void => finish(new FlowDeleteCancelled({ operationId }))

      pendingDeleteRejectors.add(rejectPending)
      lifecycle.signal?.addEventListener('abort', onAbort, { once: true })

      // eslint-disable-next-line complexity -- one boundary owns cancellation, approval, revision, and candidate checks.
      void (async () => {
        try {
          const { onBeforeDelete } = lifecycle

          if (onBeforeDelete === undefined) {
            throw new Error('FlowDeleteBeforeDeleteUnavailable')
          }

          const decision: FlowDeleteDecision = await onBeforeDelete(
            structuredClone(prepared.candidate)
          )

          if (settled) {
            return
          }

          if (scopeDisposed) {
            throw FlowEditDisposedSchema.make({})
          }

          if (lifecycle.signal?.aborted) {
            throw new FlowDeleteCancelled({ operationId })
          }

          const actualRevision = editor.getDocumentRevision()

          if (actualRevision !== capturedRevision) {
            throw new FlowDeleteRevisionConflict({
              operationId,
              expectedRevision: capturedRevision,
              actualRevision: editor.getDocumentRevision(),
            })
          }

          const finalized = Effect.runSync(
            finalizeFlowDeleteCandidate(
              capturedDocument,
              prepared.candidate,
              decision,
              operationId
            )
          )

          const candidate = {
            nodes: capturedDocument.nodes.filter(({ id }) =>
              finalized.deletion.deletedNodeIds.includes(id)
            ),
            edges: capturedDocument.edges.filter(({ id }) =>
              finalized.deletion.deletedEdgeIds.includes(id)
            ),
          }

          if (candidate.nodes.length === 0 && candidate.edges.length === 0) {
            finish(undefined, finalized.deletion)

            return
          }

          const result = await publishDeleteCandidate(candidate)

          finish(undefined, result.deletion)
        } catch (error) {
          if (
            error instanceof FlowDeleteInvalidCandidate ||
            error instanceof FlowDeleteRevisionConflict ||
            error instanceof FlowDeleteCancelled ||
            error instanceof FlowDeleteInProgress ||
            error instanceof FlowEditDisposed
          ) {
            finish(error)
          } else {
            const failure = new FlowDeleteApprovalFailed({
              operationId,
              reason: error instanceof Error ? error.message : String(error),
            })

            if (error !== reportedDeleteFailure) {
              editor.reportError(failure, 'delete')
            }

            finish(failure)
          }
        }
      })()

      return pending.promise
    },
  }
}

export const useNodes = (): FlowActions['nodes'] => useFlow().nodes

export const useEdges = (): FlowActions['edges'] => useFlow().edges

export const useViewport = (): FlowActions['viewport'] => useFlow().viewport

/** React Flow `useConnection`: the live connection state of the nearest canvas. */
export const useConnection = (): FlowActions['connectionState'] =>
  useFlow().connectionState

/** Reactive connections with callbacks for changes in accepted graph state. */
export const useNodeConnections = (
  options: FlowNodeConnectionsOptions = {}
): ComputedRef<ReturnType<typeof selectNodeConnections>> => {
  const nodeId = options.nodeId ?? useNodeId()

  if (nodeId === undefined) {
    throw new Error(
      'useNodeConnections requires nodeId or a FlowNodeIdKey provider'
    )
  }

  const query = { nodeId }

  if (options.type !== undefined) {
    Object.assign(query, { type: options.type })
  }

  if (options.handleId !== undefined) {
    Object.assign(query, { handleId: options.handleId })
  }

  const connections = useFlow().getNodeConnections(query)
  const editor = inject(FlowEditorKey)

  watch(connections, (next, previous) => {
    const delta = diffNodeConnections(previous, next)
    const callbackErrors: unknown[] = []

    if (delta.disconnected.length > 0) {
      try {
        options.onDisconnect?.(delta.disconnected)
      } catch (error) {
        callbackErrors.push(error)
        editor?.reportError(
          error instanceof Error ? error : new Error(String(error)),
          'connection-observer'
        )
      }
    }

    if (delta.connected.length > 0) {
      try {
        options.onConnect?.(delta.connected)
      } catch (error) {
        callbackErrors.push(error)
        editor?.reportError(
          error instanceof Error ? error : new Error(String(error)),
          'connection-observer'
        )
      }
    }

    if (callbackErrors.length === 1) {
      throw callbackErrors[0]
    }

    if (callbackErrors.length > 1) {
      throw new AggregateError(
        callbackErrors,
        'Node connection observer callbacks failed'
      )
    }
  })

  return connections
}

/** Reactive accepted-state connections for one directional handle. */
export const useHandleConnections = (
  options: FlowHandleConnectionsOptions
): ComputedRef<ReturnType<typeof selectNodeConnections>> => {
  const nodeOptions: FlowNodeConnectionsOptions = { type: options.type }

  if (options.nodeId !== undefined) {
    Object.assign(nodeOptions, { nodeId: options.nodeId })
  }

  // React Flow treats absent, null, and empty handle IDs as all handles.
  if (options.id !== undefined && options.id !== null && options.id !== '') {
    Object.assign(nodeOptions, { handleId: HandleIdSchema.make(options.id) })
  }

  if (options.onConnect !== undefined) {
    Object.assign(nodeOptions, { onConnect: options.onConnect })
  }

  if (options.onDisconnect !== undefined) {
    Object.assign(nodeOptions, { onDisconnect: options.onDisconnect })
  }

  return useNodeConnections(nodeOptions)
}

export const useFlowHistory = (): Pick<
  FlowActions,
  'history' | 'undo' | 'redo' | 'rejectHistory'
> => {
  const { history, undo, redo, rejectHistory } = useFlow()

  return { history, undo, redo, rejectHistory }
}

export const useFlowClipboard = (): FlowClipboardActions => {
  const { copySelection, pasteSelection, setClipboardFragment } = useFlow()

  return { copySelection, pasteSelection, setClipboardFragment }
}
