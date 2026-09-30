import type {
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
  FlowNodeSchema,
  FlowSnapshot,
  ConnectionPreviewSnapshot,
  SavedFlowSession,
  FlowStateChange,
  FlowNodeConnection,
  FlowSelection,
  Viewport,
  ViewportAnimationOptions,
  ViewportBounds,
  ViewportOperationResult,
  ViewportPadding,
} from '@flow/core'
import {
  HandleIdSchema,
  NodeIdSchema,
  encodeSavedFlowSession,
  decodeSavedFlowSession,
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
} from '@flow/core'
import { Effect, Schema as S } from 'effect'
import { computed, inject, onScopeDispose, watch } from 'vue'
import type { ComputedRef, DeepReadonly, InjectionKey } from 'vue'

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

export interface FlowEditor {
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
  readonly updateDocument: (document: FlowDocument) => void
  readonly applyEdit: (
    transaction: FlowEditTransactionInput
  ) => Promise<FlowEditResult>
  readonly applyEditResolved: (
    resolve: (document: FlowDocument) => FlowEditTransactionInput
  ) => Promise<FlowEditResult>
  readonly updateViewport: (viewport: Viewport) => void
  readonly getViewport: () => Viewport
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
    options?: ViewportAnimationOptions & {
      padding?: ViewportPadding
      nodes?: 'all' | 'selected' | readonly string[]
    }
  ) => Promise<ViewportOperationResult>
  readonly getViewportForBounds: (
    bounds: ViewportBounds,
    options?: { padding?: ViewportPadding }
  ) => Viewport | undefined
  readonly publish: (change: FlowChange) => void
  readonly getInternalNode: (id: string) => FlowInternalNode | undefined
  readonly nodesInitialized: (options?: { includeHidden?: boolean }) => boolean
  readonly updateNodeInternals: (nodeIds: readonly string[]) => Promise<
    readonly {
      readonly nodeId: string
      readonly status: 'refreshed' | 'missing' | 'unrendered' | 'disposed'
    }[]
  >
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

export interface FlowActions {
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
  readonly getSnapshot: () => DeepReadonly<FlowSnapshot>
  readonly getSavedSession: () => SavedFlowSession
  readonly prepareRestore: (saved: SavedFlowSession) => Promise<FlowSnapshot>
  readonly getNode: (id: string) => DeepReadonly<FlowNode> | undefined
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

  const getNode = (id: string): DeepReadonly<FlowNode> | undefined =>
    getSnapshot().document.nodes.find((node) => node.id === id)

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
    nodes: computed(() => snapshot.value.document.nodes),
    edges: computed(() => snapshot.value.document.edges),
    getNodesData,
    getNodeConnections,
    getHandleConnections,
    viewport,
    snapshot,
    connectionPreview: editor.connectionPreview,
    getSnapshot,
    getSavedSession,
    prepareRestore: prepareRestoreSession,
    getNode,
    getEdge,
    getInternalNode: editor.getInternalNode,
    nodesInitialized: editor.nodesInitialized,
    updateNodeInternals: editor.updateNodeInternals,
    subscribeState: editor.subscribeState,
    subscribeSelection: editor.subscribeSelection,
    observeKeyPress: editor.observeKeyPress,
    dispatch: editor.dispatch,
    updateDocument: editor.updateDocument,
    updateViewport: editor.updateViewport,
    getViewport: editor.getViewport,
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
            finish(
              new FlowDeleteApprovalFailed({
                operationId,
                reason: error instanceof Error ? error.message : String(error),
              })
            )
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

  watch(connections, (next, previous) => {
    const delta = diffNodeConnections(previous, next)
    const callbackErrors: unknown[] = []

    if (delta.disconnected.length > 0) {
      try {
        options.onDisconnect?.(delta.disconnected)
      } catch (error) {
        callbackErrors.push(error)
      }
    }

    if (delta.connected.length > 0) {
      try {
        options.onConnect?.(delta.connected)
      } catch (error) {
        callbackErrors.push(error)
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
