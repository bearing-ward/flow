import { Schema as S } from 'effect'

import { MeasuredHandleSchema } from './flow-edge.schema.ts'
import { createFlowGraph } from './flow-graph.ts'
import type { MeasuredNode } from './flow-runtime.schema.ts'
import { MeasuredNodeSchema } from './flow-runtime.schema.ts'
import type { FlowDocument, NodeId } from './flow.schema.ts'
import {
  FlowDocumentSchema,
  FlowHandleSchema,
  FlowNodeSchema,
  flowNodeHandles,
  NodeIdSchema,
  XYPositionSchema,
} from './flow.schema.ts'

export const FlowInternalNodeSchema = S.Struct({
  absolutePosition: XYPositionSchema,
  handles: S.Array(MeasuredHandleSchema),
  height: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
  measurementStatus: S.Literals(['hidden', 'measured', 'unmeasured']),
  node: FlowNodeSchema,
  width: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
})

export type FlowInternalNode = typeof FlowInternalNodeSchema.Type

export const MeasuredNodeGenerationSchema = S.Struct({
  generation: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
  measurement: MeasuredNodeSchema,
  handleDeclarations: S.optional(S.Array(FlowHandleSchema)),
})

export type MeasuredNodeGeneration = typeof MeasuredNodeGenerationSchema.Type

export const NodeMeasurementGenerationSchema = S.Struct({
  generation: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
  nodeId: NodeIdSchema,
})

export type NodeMeasurementGeneration =
  typeof NodeMeasurementGenerationSchema.Type

export const FlowMeasurementStateSchema = S.Struct({
  generations: S.Array(NodeMeasurementGenerationSchema),
  nodes: S.Array(MeasuredNodeGenerationSchema),
  revision: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
})

export type FlowMeasurementState = typeof FlowMeasurementStateSchema.Type

export const NodeMeasurementInputSchema = S.Struct({
  handles: S.optional(S.Array(MeasuredHandleSchema)),
  generation: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
  height: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
  nodeId: NodeIdSchema,
  width: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
})

export type NodeMeasurementInput = typeof NodeMeasurementInputSchema.Type

export const emptyFlowMeasurementState = (): FlowMeasurementState => ({
  generations: [],
  nodes: [],
  revision: 0,
})

/** Advance a renderer generation before mounting or replacing a node element. */
export const advanceNodeMeasurementGeneration = (
  state: FlowMeasurementState,
  nodeId: NodeId
): FlowMeasurementState => {
  const validState = S.decodeUnknownSync(FlowMeasurementStateSchema)(state)
  const previous = validState.generations.find((item) => item.nodeId === nodeId)
  const generation = (previous?.generation ?? -1) + 1

  return {
    ...validState,
    generations: [
      ...validState.generations.filter((item) => item.nodeId !== nodeId),
      { generation, nodeId },
    ],
  }
}

/** Register renderer generations in one adapter batch before observer delivery. */
export const setNodeMeasurementGenerations = (
  state: FlowMeasurementState,
  inputs: readonly NodeMeasurementGeneration[]
): FlowMeasurementState => {
  const validState = S.decodeUnknownSync(FlowMeasurementStateSchema)(state)

  const validInputs = inputs.map((input) =>
    S.decodeUnknownSync(NodeMeasurementGenerationSchema)(input)
  )

  const generations = new Map(
    validState.generations.map(({ nodeId, generation }) => [nodeId, generation])
  )

  let changed = false

  for (const { generation, nodeId } of validInputs) {
    if (generations.get(nodeId) !== generation) {
      generations.set(nodeId, generation)
      changed = true
    }
  }

  return changed
    ? {
        ...validState,
        generations: [...generations].map(([nodeId, generation]) => ({
          generation,
          nodeId,
        })),
      }
    : validState
}

/** Apply a decoded DOM measurement only while its node and generation are current. */
/** Apply one observer batch with a single boundary decode and indexed lookup. */
export const applyNodeMeasurements = (
  document: FlowDocument,
  state: FlowMeasurementState,
  inputs: readonly NodeMeasurementInput[]
): FlowMeasurementState => {
  const validDocument = S.decodeUnknownSync(FlowDocumentSchema)(document)
  const validState = S.decodeUnknownSync(FlowMeasurementStateSchema)(state)

  const validInputs = inputs.map((input) =>
    S.decodeUnknownSync(NodeMeasurementInputSchema)(input)
  )

  const nodesById = new Map(validDocument.nodes.map((node) => [node.id, node]))

  const nodes = new Map(
    validState.nodes.map((record) => [record.measurement.nodeId, record])
  )

  const generations = new Map(
    validState.generations.map(({ nodeId, generation }) => [nodeId, generation])
  )

  let { revision } = validState
  let changed = false

  for (const measurement of validInputs) {
    if (!nodesById.has(measurement.nodeId)) {
      continue
    }

    const previous = nodes.get(measurement.nodeId)
    const latestGeneration = generations.get(measurement.nodeId)

    if (
      (latestGeneration !== undefined &&
        measurement.generation !== latestGeneration) ||
      (previous !== undefined && measurement.generation < previous.generation)
    ) {
      continue
    }

    const declaringNode = nodesById.get(measurement.nodeId)

    const handleDeclarations =
      declaringNode === undefined ? [] : flowNodeHandles(declaringNode)

    const nextMeasurement: MeasuredNode = {
      nodeId: measurement.nodeId,
      width: measurement.width,
      height: measurement.height,
      handles: measurement.handles ?? [],
    }

    if (
      previous !== undefined &&
      previous.generation === measurement.generation &&
      previous.measurement.width === nextMeasurement.width &&
      previous.measurement.height === nextMeasurement.height &&
      JSON.stringify(previous.measurement.handles) ===
        JSON.stringify(nextMeasurement.handles) &&
      JSON.stringify(previous.handleDeclarations) ===
        JSON.stringify(handleDeclarations)
    ) {
      continue
    }

    nodes.set(measurement.nodeId, {
      generation: measurement.generation,
      measurement: nextMeasurement,
      handleDeclarations,
    })
    generations.set(measurement.nodeId, measurement.generation)
    revision += 1
    changed = true
  }

  if (!changed) {
    return validState
  }

  return {
    generations: [...generations].map(([nodeId, generation]) => ({
      generation,
      nodeId,
    })),
    nodes: [...nodes.values()],
    revision,
  }
}

export const applyNodeMeasurement = (
  document: FlowDocument,
  state: FlowMeasurementState,
  input: NodeMeasurementInput
): FlowMeasurementState => applyNodeMeasurements(document, state, [input])

/** Remove runtime geometry for nodes no longer in the accepted document. */
export const pruneFlowMeasurements = (
  document: FlowDocument,
  state: FlowMeasurementState
): FlowMeasurementState => {
  const validDocument = S.decodeUnknownSync(FlowDocumentSchema)(document)
  const validState = S.decodeUnknownSync(FlowMeasurementStateSchema)(state)
  const ids = new Set(validDocument.nodes.map((node) => node.id))

  const nodes = validState.nodes.filter(({ measurement }) =>
    ids.has(measurement.nodeId)
  )

  return nodes.length === validState.nodes.length
    ? validState
    : { ...validState, nodes, revision: validState.revision + 1 }
}

/** Project only current generation geometry; handle IDs and visibility remain graph-owned. */
export const getFlowMeasuredNodes = (
  document: FlowDocument,
  state: FlowMeasurementState
): ReadonlyMap<NodeId, MeasuredNode> => {
  const generations = new Map(
    state.generations.map(({ nodeId, generation }) => [nodeId, generation])
  )

  const current = new Map(
    state.nodes
      .filter(
        ({ generation, measurement }) =>
          generations.get(measurement.nodeId) === generation
      )
      .map(({ measurement }) => [measurement.nodeId, measurement])
  )

  const declarations = new Map(
    state.nodes.map((record) => [
      record.measurement.nodeId,
      record.handleDeclarations,
    ])
  )

  const graph = createFlowGraph(document, current)

  return new Map(
    graph.orderedNodes.flatMap(({ node, hidden }) => {
      const measurement = current.get(node.id)

      if (measurement === undefined) {
        return []
      }

      const handles = hidden
        ? []
        : (measurement.handles ?? []).filter(
            (handle) =>
              handle.nodeId === node.id &&
              flowNodeHandles(node).some(
                ({ id, kind, side }) =>
                  id === handle.handleId &&
                  declarations
                    .get(node.id)
                    ?.some(
                      (declared) =>
                        declared.id === id &&
                        declared.kind === kind &&
                        declared.side === side
                    )
              )
          )

      return [
        [
          node.id,
          Object.freeze({
            ...measurement,
            handles: Object.freeze(
              handles.map((handle) =>
                Object.freeze({
                  ...handle,
                  offset: Object.freeze({ ...handle.offset }),
                })
              )
            ),
          }),
        ],
      ]
    })
  )
}

/** Readiness uses live measurements for mounted, visible nodes only. */
export const areFlowNodesInitialized = (
  document: FlowDocument,
  state: FlowMeasurementState,
  options: {
    readonly includeHidden?: boolean
    readonly mountedNodeIds?: ReadonlySet<NodeId>
  } = {}
): boolean => {
  const validDocument = S.decodeUnknownSync(FlowDocumentSchema)(document)
  const validState = S.decodeUnknownSync(FlowMeasurementStateSchema)(state)

  const measurements = getFlowMeasuredNodes(validDocument, validState)

  const graph = createFlowGraph(validDocument, measurements)

  return graph.orderedNodes
    .filter(
      ({ hidden, id }) =>
        (options.includeHidden === true || !hidden) &&
        (options.mountedNodeIds === undefined ||
          options.mountedNodeIds.has(id) ||
          (options.includeHidden === true && hidden))
    )
    .every(({ id }) => measurements.has(id))
}

/** Return a detached, frozen projection of one accepted node and its runtime geometry. */
export const getFlowInternalNode = (
  document: FlowDocument,
  state: FlowMeasurementState,
  nodeId: NodeId
): FlowInternalNode | undefined => {
  const validDocument = S.decodeUnknownSync(FlowDocumentSchema)(document)
  const validState = S.decodeUnknownSync(FlowMeasurementStateSchema)(state)

  const measurements = getFlowMeasuredNodes(validDocument, validState)

  const graph = createFlowGraph(validDocument, measurements)
  const item = graph.nodes.get(nodeId)

  if (item === undefined) {
    return undefined
  }

  const measured = measurements.get(nodeId)

  let measurementStatus: FlowInternalNode['measurementStatus'] = 'measured'

  if (item.hidden) {
    measurementStatus = 'hidden'
  } else if (measured === undefined) {
    measurementStatus = 'unmeasured'
  }

  const snapshot = S.decodeUnknownSync(FlowInternalNodeSchema)({
    absolutePosition: item.absolutePosition,
    handles: item.hidden ? [] : (measured?.handles ?? []),
    height: measured?.height ?? item.dimensions.height,
    measurementStatus,
    node: item.node,
    width: measured?.width ?? item.dimensions.width,
  })

  return Object.freeze({
    ...snapshot,
    absolutePosition: Object.freeze({ ...snapshot.absolutePosition }),
    handles: Object.freeze(
      snapshot.handles.map((handle) =>
        Object.freeze({
          ...handle,
          offset: Object.freeze({ ...handle.offset }),
        })
      )
    ),
    node: Object.freeze(structuredClone(snapshot.node)),
  })
}

export const NodeInternalsRefreshResultSchema = S.Struct({
  nodeId: NodeIdSchema,
  status: S.Literals(['requested', 'missing', 'disposed', 'failed']),
})

export type NodeInternalsRefreshResult =
  typeof NodeInternalsRefreshResultSchema.Type
