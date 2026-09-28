import type {
  FlowChange,
  FlowCommand,
  FlowDeleteResult,
  FlowDocument,
  FlowEdge,
  FlowEdgeSchema,
  FlowEditResult,
  FlowEditTransactionInput,
  FlowNode,
  FlowInternalNode,
  FlowNodeSchema,
  FlowSnapshot,
  FlowStateChange,
  Viewport,
  ViewportAnimationOptions,
  ViewportBounds,
  ViewportOperationResult,
  ViewportPadding,
} from '@flow/core'
import { Schema as S } from 'effect'
import { computed, inject } from 'vue'
import type { ComputedRef, DeepReadonly, InjectionKey } from 'vue'

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
  readonly subscribeState: (
    listener: (change: FlowStateChange) => void
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

export const FlowEditorKey: InjectionKey<FlowEditor> = Symbol('FlowEditor')

export interface FlowNodeSlot {
  readonly node: FlowNode
}

export interface FlowActions {
  readonly document: ComputedRef<DeepReadonly<FlowDocument>>
  readonly nodes: ComputedRef<readonly DeepReadonly<FlowNode>[]>
  readonly edges: ComputedRef<readonly DeepReadonly<FlowEdge>[]>
  readonly viewport: ComputedRef<DeepReadonly<Viewport>>
  readonly snapshot: FlowEditor['snapshot']
  readonly getSnapshot: () => DeepReadonly<FlowSnapshot>
  readonly getNode: (id: string) => DeepReadonly<FlowNode> | undefined
  readonly getEdge: (id: string) => DeepReadonly<FlowEdge> | undefined
  readonly subscribeState: FlowEditor['subscribeState']
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
  readonly deleteElements: (input: {
    nodeIds?: readonly string[]
    edgeIds?: readonly string[]
  }) => Promise<FlowDeleteResult>
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

export const useFlow = (): FlowActions => {
  const editor = inject(FlowEditorKey)

  if (editor === undefined) {
    throw new Error(
      'useFlow must be called in setup() below a mounted FlowCanvas provider'
    )
  }

  const { snapshot } = editor

  const getSnapshot = (): DeepReadonly<FlowSnapshot> => snapshot.value

  const getNode = (id: string): DeepReadonly<FlowNode> | undefined =>
    getSnapshot().document.nodes.find((node) => node.id === id)

  const getEdge = (id: string): DeepReadonly<FlowEdge> | undefined =>
    getSnapshot().document.edges.find((edge) => edge.id === id)

  const document = computed(() => snapshot.value.document)
  const viewport = computed(() => snapshot.value.viewport)

  return {
    document,
    nodes: computed(() => snapshot.value.document.nodes),
    edges: computed(() => snapshot.value.document.edges),
    viewport,
    snapshot,
    getSnapshot,
    getNode,
    getEdge,
    getInternalNode: editor.getInternalNode,
    nodesInitialized: editor.nodesInitialized,
    updateNodeInternals: editor.updateNodeInternals,
    subscribeState: editor.subscribeState,
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
    deleteElements: async (input) => {
      const result = await editor.applyEdit({
        operations: [
          {
            kind: 'delete-elements',
            nodeIds: input.nodeIds,
            edgeIds: input.edgeIds,
          },
        ],
      })

      return result.deletion
    },
  }
}

export const useNodes = (): FlowActions['nodes'] => useFlow().nodes

export const useEdges = (): FlowActions['edges'] => useFlow().edges

export const useViewport = (): FlowActions['viewport'] => useFlow().viewport
