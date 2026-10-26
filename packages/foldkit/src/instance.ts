import {
  FlowAttribute,
  FlowEditDisposedSchema,
  FlowSpan,
  flowMeasurementsFromInternalNodes,
  getEdgesGeometry as coreEdgesGeometry,
  getIntersectingNodes as coreIntersectingNodes,
  getNodesBounds as coreNodesBounds,
  isNodeIntersecting as coreIsNodeIntersecting,
  toFlowObject,
} from '@flow/core'
import type {
  FlowEdge,
  FlowEdgeRenderGeometry,
  FlowEditTransactionInput,
  FlowInternalNode,
  FlowNode,
  FlowObject,
  FlowRect,
  FlowSnapshot,
  Viewport,
  XYPosition,
} from '@flow/core'
import { Effect, Exit, Predicate } from 'effect'
import type { Schema } from 'effect'
import type { Runtime } from 'foldkit'

import type {
  EditResponse,
  ports,
  VersionedSnapshotResponse,
  ViewportClient,
} from './application.ts'
import { createFoldkitSnapshotClient } from './snapshot-client.ts'
import type { SnapshotQuery } from './snapshot-client.ts'

type RuntimePorts = Runtime.EmbedHandle<typeof ports>['ports']

/** The Runtime ports the instance reads and edits through. */
export type FoldkitFlowInstancePorts = Pick<
  RuntimePorts,
  | 'snapshotRequests'
  | 'snapshots'
  | 'snapshotFailures'
  | 'versionedSnapshotRequests'
  | 'versionedSnapshots'
  | 'editRequests'
  | 'editResults'
>

type EditOperation = FlowEditTransactionInput['operations'][number]

type NodeInput = Extract<EditOperation, { kind: 'add-nodes' }>['nodes'][number]

type EdgeInput = Extract<EditOperation, { kind: 'add-edges' }>['edges'][number]

type JsonObject = typeof Schema.JsonObject.Type

/** A node by id, a node object, an internal node or a flow-space rectangle. */
export type FoldkitNodeOrRect =
  | string
  | { readonly id: string }
  | FlowInternalNode
  | FlowRect

export interface FoldkitFlowInstanceOptions {
  /** Viewport client for the same Runtime; enables the viewport methods. */
  readonly viewport?: ViewportClient
}

export interface FoldkitUpdateOptions {
  /** Replace instead of merging into the current value. */
  readonly replace?: boolean
}

/**
 * React Flow's `useReactFlow()`/`ReactFlowInstance` for one Foldkit Runtime.
 * The Runtime owns all state, so every read is an asynchronous port round
 * trip and returns a Promise; edits resolve with the Runtime's edit result.
 * Reads see an active drag's live positions, as React Flow's do.
 */
export interface FoldkitFlowInstance {
  readonly getNodes: () => Promise<readonly FlowNode[]>
  readonly getEdges: () => Promise<readonly FlowEdge[]>
  readonly getNode: (id: string) => Promise<FlowNode | undefined>
  readonly getEdge: (id: string) => Promise<FlowEdge | undefined>
  readonly getInternalNode: (
    id: string
  ) => Promise<FlowInternalNode | undefined>
  /** Every node's internal projection in document order (`nodeLookup`). */
  readonly getInternalNodes: () => Promise<readonly FlowInternalNode[]>
  readonly setNodes: (
    nodes:
      | readonly NodeInput[]
      | ((nodes: readonly FlowNode[]) => readonly NodeInput[])
  ) => Promise<EditResponse>
  readonly setEdges: (
    edges:
      | readonly EdgeInput[]
      | ((edges: readonly FlowEdge[]) => readonly EdgeInput[])
  ) => Promise<EditResponse>
  readonly addNodes: (
    nodes: NodeInput | readonly NodeInput[]
  ) => Promise<EditResponse>
  readonly addEdges: (
    edges: EdgeInput | readonly EdgeInput[]
  ) => Promise<EditResponse>
  readonly updateNode: (
    id: string,
    update: JsonObject | ((node: FlowNode) => JsonObject),
    options?: FoldkitUpdateOptions
  ) => Promise<EditResponse>
  readonly updateNodeData: (
    id: string,
    update: JsonObject | ((node: FlowNode) => JsonObject),
    options?: FoldkitUpdateOptions
  ) => Promise<EditResponse>
  readonly updateEdge: (
    id: string,
    update: JsonObject | ((edge: FlowEdge) => JsonObject),
    options?: FoldkitUpdateOptions
  ) => Promise<EditResponse>
  readonly updateEdgeData: (
    id: string,
    update: JsonObject | ((edge: FlowEdge) => JsonObject),
    options?: FoldkitUpdateOptions
  ) => Promise<EditResponse>
  readonly deleteElements: (elements: {
    readonly nodes?: readonly { readonly id: string }[]
    readonly edges?: readonly { readonly id: string }[]
  }) => Promise<EditResponse>
  /** Send one edit transaction of several operations. */
  readonly applyEdit: (
    operations: readonly EditOperation[]
  ) => Promise<EditResponse>
  /** Nodes overlapping a node or rectangle; a node never intersects itself. */
  readonly getIntersectingNodes: (
    nodeOrRect: FoldkitNodeOrRect,
    partially?: boolean
  ) => Promise<readonly FlowNode[]>
  readonly isNodeIntersecting: (
    nodeOrRect: FoldkitNodeOrRect,
    area: FlowRect,
    partially?: boolean
  ) => Promise<boolean>
  /** Smallest rectangle around nodes, ids or internal nodes, measured sizes first. */
  readonly getNodesBounds: (
    nodes: readonly (FlowNode | FlowInternalNode | string)[]
  ) => Promise<FlowRect>
  /** Detached nodes, edges and viewport, restorable as a document. */
  readonly toObject: () => Promise<FlowObject>
  /** Every built-in edge's rendered path and endpoints. */
  readonly getEdgesGeometry: () => Promise<readonly FlowEdgeRenderGeometry[]>
  readonly getViewport: () => Promise<Viewport>
  readonly getZoom: () => Promise<number>
  /** The viewport client, when one was passed in the options. */
  readonly viewport: ViewportClient | undefined
  readonly setViewport: ViewportClient['setViewport']
  readonly zoomIn: ViewportClient['zoomIn']
  readonly zoomOut: ViewportClient['zoomOut']
  readonly zoomTo: ViewportClient['zoomTo']
  readonly setCenter: ViewportClient['setCenter']
  readonly fitView: ViewportClient['fitView']
  readonly fitBounds: ViewportClient['fitBounds']
  readonly screenToFlowPosition: (point: XYPosition) => Promise<XYPosition>
  readonly flowToScreenPosition: (point: XYPosition) => Promise<XYPosition>
  /** Settle pending edits as disposed and stop listening. */
  readonly dispose: () => void
}

let nextOwnerId = 0

const reportFailure = (reason: string): void => {
  Effect.runFork(
    Effect.logError('Foldkit instance request failed').pipe(
      Effect.annotateLogs({
        [FlowAttribute.inputKind]: 'instance-request',
        [FlowAttribute.failureName]: reason,
      }),
      Effect.withSpan(FlowSpan.controllerUpdate)
    )
  )
}

const isList = <Item>(
  items: Item | readonly Item[]
): items is readonly Item[] => Array.isArray(items)

const asList = <Item>(items: Item | readonly Item[]): readonly Item[] =>
  isList(items) ? items : [items]

const isRect = (value: FoldkitNodeOrRect): value is FlowRect =>
  !Predicate.isString(value) &&
  !('id' in value) &&
  !('absolutePosition' in value) &&
  'width' in value

/** A rectangle or internal node as given; ids and nodes through the lookup. */
const resolveNode = (
  nodeOrRect: FoldkitNodeOrRect,
  internals: readonly FlowInternalNode[]
): FlowInternalNode | FlowRect | undefined => {
  if (isRect(nodeOrRect)) {
    return nodeOrRect
  }

  if (!Predicate.isString(nodeOrRect) && 'absolutePosition' in nodeOrRect) {
    return nodeOrRect
  }

  const id = Predicate.isString(nodeOrRect) ? nodeOrRect : nodeOrRect.id

  return internals.find((internal) => internal.node.id === id)
}

const pointOf = async (
  response: Promise<{ readonly point?: XYPosition | undefined }>
): Promise<XYPosition> => {
  const { point } = await response

  if (point === undefined) {
    throw new Error('Foldkit viewport conversion returned no point')
  }

  return point
}

/**
 * An update value, or the result of an updater over the current element. A
 * missing element gives an empty update, so the Runtime reports the missing
 * id through its edit result.
 */
const resolveUpdate = async <Item>(
  update: JsonObject | ((item: Item) => JsonObject),
  current: () => Promise<Item | undefined>
): Promise<JsonObject> => {
  if (!Predicate.isFunction(update)) {
    return update
  }

  const item = await current()

  return item === undefined ? {} : update(item)
}

const disposedEdit = (requestId: string): EditResponse => ({
  requestId,
  error: FlowEditDisposedSchema.make({}),
})

/** Create the typed facade over one Runtime's snapshot and edit ports. */
export const createFoldkitFlowInstance = (
  runtimePorts: FoldkitFlowInstancePorts,
  options: FoldkitFlowInstanceOptions = {}
): FoldkitFlowInstance => {
  nextOwnerId += 1
  const ownerId = nextOwnerId
  const snapshots = createFoldkitSnapshotClient(runtimePorts)
  const pending = new Map<string, (response: EditResponse) => void>()
  let requestNumber = 0
  let disposed = false

  const stopEdits = runtimePorts.editResults.subscribe((response) => {
    const resolve = pending.get(response.requestId)
    pending.delete(response.requestId)
    resolve?.(response)
  })

  // The versioned protocol reads documents with presentation fields (v3),
  // which the legacy saved-session format rejects.
  const read = async (
    query: SnapshotQuery = {}
  ): Promise<VersionedSnapshotResponse> => {
    const result = await snapshots.requestVersioned(query)

    if (result.status !== 'succeeded') {
      throw new Error(`Foldkit snapshot read ${result.status}`)
    }

    return result.response
  }

  const snapshot = async (): Promise<FlowSnapshot> => {
    const response = await read()

    return response.snapshot
  }

  const currentDocument = async () => {
    const current = await snapshot()

    return current.document
  }

  const nodeById = async (id: string): Promise<FlowNode | undefined> => {
    const response = await read({ nodeId: id })

    return response.node
  }

  const edgeById = async (id: string): Promise<FlowEdge | undefined> => {
    const response = await read({ edgeId: id })

    return response.edge
  }

  const withInternalNodes = async () => {
    const response = await read({ internalNodes: true })

    return {
      edgeRouting: response.edgeRouting,
      document: response.snapshot.document,
      internals: response.internalNodes ?? [],
    }
  }

  const internalNodes = async (): Promise<readonly FlowInternalNode[]> => {
    const { internals } = await withInternalNodes()

    return internals
  }

  const applyEdit = (
    operations: readonly EditOperation[]
  ): Promise<EditResponse> => {
    requestNumber += 1
    const requestId = `foldkit-instance-${ownerId}-${requestNumber}`
    const { promise, resolve } = Promise.withResolvers<EditResponse>()

    if (disposed) {
      resolve(disposedEdit(requestId))

      return promise
    }

    pending.set(requestId, resolve)

    const sent = runtimePorts.editRequests.send({
      requestId,
      transaction: { operations },
    })

    if (Exit.isFailure(sent)) {
      pending.delete(requestId)
      reportFailure('edit-send-failed')
      resolve(disposedEdit(requestId))
    }

    return promise
  }

  const requireViewport = (): ViewportClient => {
    if (options.viewport === undefined) {
      throw new Error('Pass a viewport client to use Foldkit viewport methods')
    }

    return options.viewport
  }

  const getViewport = async (): Promise<Viewport> => {
    if (options.viewport === undefined) {
      const current = await snapshot()

      return current.viewport
    }

    const response = await options.viewport.getViewport()

    return response.viewport
  }

  return {
    // React `getNodes`: each node carries `measured` from the host's last
    // measurement, as `getNode` does.
    getNodes: async () => {
      const response = await read({ internalNodes: true })

      const measured = new Map(
        (response.internalNodes ?? []).flatMap((internal) =>
          internal.measurementStatus === 'measured'
            ? [
                [
                  internal.node.id,
                  { width: internal.width, height: internal.height },
                ] as const,
              ]
            : []
        )
      )

      return response.snapshot.document.nodes.map((node) => {
        const size = measured.get(node.id)

        return size === undefined ? node : { ...node, measured: size }
      })
    },
    getEdges: async () => {
      const current = await currentDocument()

      return current.edges
    },
    getNode: nodeById,
    getEdge: edgeById,
    getInternalNode: async (id) => {
      const response = await read({ nodeId: id })

      return response.internalNode ?? undefined
    },
    getInternalNodes: internalNodes,
    setNodes: async (nodes) => {
      if (!Predicate.isFunction(nodes)) {
        return applyEdit([{ kind: 'set-nodes', nodes }])
      }

      const current = await currentDocument()

      return applyEdit([{ kind: 'set-nodes', nodes: nodes(current.nodes) }])
    },
    setEdges: async (edges) => {
      if (!Predicate.isFunction(edges)) {
        return applyEdit([{ kind: 'set-edges', edges }])
      }

      const current = await currentDocument()

      return applyEdit([{ kind: 'set-edges', edges: edges(current.edges) }])
    },
    addNodes: (nodes) =>
      applyEdit([{ kind: 'add-nodes', nodes: asList(nodes) }]),
    addEdges: (edges) =>
      applyEdit([{ kind: 'add-edges', edges: asList(edges) }]),
    updateNode: async (id, update, updateOptions = {}) =>
      applyEdit([
        {
          kind: 'update-node',
          nodeId: id,
          patch: await resolveUpdate(update, () => nodeById(id)),
          replace: updateOptions.replace === true,
        },
      ]),
    updateNodeData: async (id, update, updateOptions = {}) =>
      applyEdit([
        {
          kind: 'update-node-data',
          nodeId: id,
          data: await resolveUpdate(update, () => nodeById(id)),
          replace: updateOptions.replace === true,
        },
      ]),
    updateEdge: async (id, update, updateOptions = {}) =>
      applyEdit([
        {
          kind: 'update-edge',
          edgeId: id,
          patch: await resolveUpdate(update, () => edgeById(id)),
          replace: updateOptions.replace === true,
        },
      ]),
    updateEdgeData: async (id, update, updateOptions = {}) =>
      applyEdit([
        {
          kind: 'update-edge-data',
          edgeId: id,
          data: await resolveUpdate(update, () => edgeById(id)),
          replace: updateOptions.replace === true,
        },
      ]),
    deleteElements: ({ nodes = [], edges = [] }) =>
      applyEdit([
        {
          kind: 'delete-elements',
          nodeIds: nodes.map(({ id }) => id),
          edgeIds: edges.map(({ id }) => id),
        },
      ]),
    applyEdit,
    getIntersectingNodes: async (nodeOrRect, partially = true) => {
      const internals = await internalNodes()
      const target = resolveNode(nodeOrRect, internals)

      return target === undefined
        ? []
        : coreIntersectingNodes(target, partially, internals).map(
            ({ node }) => node
          )
    },
    isNodeIntersecting: async (nodeOrRect, area, partially = true) => {
      const internals = isRect(nodeOrRect) ? [] : await internalNodes()
      const target = resolveNode(nodeOrRect, internals)

      return (
        target !== undefined && coreIsNodeIntersecting(target, area, partially)
      )
    },
    getNodesBounds: async (nodes) => {
      const state = await withInternalNodes()

      return coreNodesBounds(nodes, {
        nodeLookup: new Map(
          state.internals.map((internal) => [internal.node.id, internal])
        ),
        nodeOrigin: state.document.nodeOrigin,
      })
    },
    toObject: async () => {
      const current = await snapshot()

      return toFlowObject(current)
    },
    getEdgesGeometry: async () => {
      const state = await withInternalNodes()

      return coreEdgesGeometry(state.document, {
        edgeRouting: state.edgeRouting,
        measurements: flowMeasurementsFromInternalNodes(state.internals),
      })
    },
    getViewport,
    getZoom: async () => {
      const viewport = await getViewport()

      return viewport.zoom
    },
    viewport: options.viewport,
    setViewport: (...args) => requireViewport().setViewport(...args),
    zoomIn: (...args) => requireViewport().zoomIn(...args),
    zoomOut: (...args) => requireViewport().zoomOut(...args),
    zoomTo: (...args) => requireViewport().zoomTo(...args),
    setCenter: (...args) => requireViewport().setCenter(...args),
    fitView: (...args) => requireViewport().fitView(...args),
    fitBounds: (...args) => requireViewport().fitBounds(...args),
    screenToFlowPosition: (point) =>
      pointOf(requireViewport().screenToFlow(point)),
    flowToScreenPosition: (point) =>
      pointOf(requireViewport().flowToScreen(point)),
    dispose: () => {
      if (disposed) {
        return
      }

      disposed = true
      stopEdits()
      snapshots.dispose()

      for (const [requestId, resolve] of pending) {
        resolve(disposedEdit(requestId))
      }

      pending.clear()
    },
  }
}
