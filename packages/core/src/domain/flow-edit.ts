import { Effect, Schema as S } from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import {
  FlowDeleteCandidateSchema,
  FlowDeleteDecisionSchema,
} from './flow-delete.schema.ts'
import type {
  FlowDeleteCandidate,
  FlowDeleteDecision,
} from './flow-delete.schema.ts'
import {
  FlowDeleteInvalidCandidate,
  ProtectedDeletionConflict,
} from './flow-edit-error.ts'
import type {
  FlowEditOperation,
  FlowEditResult,
  FlowEditTransaction,
} from './flow-edit.schema.ts'
import { FlowEditTransactionSchema } from './flow-edit.schema.ts'
import { refitFlowGroups } from './flow-grouping-actions.ts'
import type {
  EdgeId,
  FlowDocument,
  FlowDocumentIntegrityError,
  FlowEdge,
  FlowNode,
  NodeId,
} from './flow.schema.ts'
import {
  FlowEdgeSchema,
  FlowNodeSchema,
  decodeFlowDocument,
} from './flow.schema.ts'

interface MutableDeletion {
  deletedNodeIds: NodeId[]
  deletedEdgeIds: EdgeId[]
}

const emptyDeletion = (): MutableDeletion => ({
  deletedNodeIds: [],
  deletedEdgeIds: [],
})

const deleteElements = (
  document: FlowDocument,
  operation: Extract<FlowEditOperation, { kind: 'delete-elements' }>,
  deletion: ReturnType<typeof emptyDeletion>
): Effect.Effect<FlowDocument, ProtectedDeletionConflict> =>
  Effect.gen(function* deleteElementsWorkflow() {
    const nodeMap = new Map(document.nodes.map((node) => [node.id, node]))
    const removedNodes = new Set<NodeId>()

    const visit = (id: NodeId): void => {
      if (removedNodes.has(id) || !nodeMap.has(id)) {
        return
      }

      removedNodes.add(id)

      for (const child of document.nodes) {
        if (child.parentId === id) {
          visit(child.id)
        }
      }
    }

    for (const id of operation.nodeIds ?? []) {
      visit(id)
    }

    const removedEdges = new Set<EdgeId>()

    for (const id of operation.edgeIds ?? []) {
      removedEdges.add(id)
    }

    for (const edge of document.edges) {
      if (removedNodes.has(edge.source) || removedNodes.has(edge.target)) {
        removedEdges.add(edge.id)
      }
    }

    const protectedNodes = document.nodes.filter(
      (node) => removedNodes.has(node.id) && node.deletable === false
    )

    const protectedEdges = document.edges.filter(
      (edge) => removedEdges.has(edge.id) && edge.deletable === false
    )

    if (protectedNodes.length > 0 || protectedEdges.length > 0) {
      return yield* Effect.fail(
        new ProtectedDeletionConflict({
          nodeIds: protectedNodes.map(({ id }) => id),
          edgeIds: protectedEdges.map(({ id }) => id),
        })
      )
    }

    deletion.deletedNodeIds.push(
      ...document.nodes
        .filter((node) => removedNodes.has(node.id))
        .map(({ id }) => id)
    )
    deletion.deletedEdgeIds.push(
      ...document.edges
        .filter((edge) => removedEdges.has(edge.id))
        .map(({ id }) => id)
    )

    return {
      ...document,
      nodes: document.nodes.filter((node) => !removedNodes.has(node.id)),
      edges: document.edges.filter((edge) => !removedEdges.has(edge.id)),
    }
  })

const applyOperation = (
  document: FlowDocument,
  operation: FlowEditOperation,
  deletion: ReturnType<typeof emptyDeletion>
): Effect.Effect<
  FlowDocument,
  S.SchemaError | FlowDocumentIntegrityError | ProtectedDeletionConflict
> =>
  Effect.gen(function* applyOperationWorkflow() {
    switch (operation.kind) {
      case 'set-nodes': {
        return { ...document, nodes: [...operation.nodes] }
      }

      case 'add-nodes': {
        return { ...document, nodes: [...document.nodes, ...operation.nodes] }
      }

      case 'set-edges': {
        return { ...document, edges: [...operation.edges] }
      }

      case 'add-edges': {
        return { ...document, edges: [...document.edges, ...operation.edges] }
      }

      case 'update-node': {
        const node = document.nodes.find((item) => item.id === operation.nodeId)

        if (node === undefined) {
          return document
        }

        const candidate = operation.replace
          ? { ...operation.patch, id: operation.nodeId }
          : { ...node, ...operation.patch, id: operation.nodeId }

        const replacement: FlowNode =
          yield* S.decodeUnknownEffect(FlowNodeSchema)(candidate)

        return {
          ...document,
          nodes: document.nodes.map((item) =>
            item.id === operation.nodeId ? replacement : item
          ),
        }
      }

      case 'update-edge': {
        const edge = document.edges.find((item) => item.id === operation.edgeId)

        if (edge === undefined) {
          return document
        }

        const candidate = operation.replace
          ? { ...operation.patch, id: operation.edgeId }
          : { ...edge, ...operation.patch, id: operation.edgeId }

        const replacement: FlowEdge =
          yield* S.decodeUnknownEffect(FlowEdgeSchema)(candidate)

        return {
          ...document,
          edges: document.edges.map((item) =>
            item.id === operation.edgeId ? replacement : item
          ),
        }
      }

      case 'update-node-data': {
        const node = document.nodes.find((item) => item.id === operation.nodeId)

        if (node === undefined) {
          return document
        }

        const data = operation.replace
          ? operation.data
          : { ...node.data, ...operation.data }

        return {
          ...document,
          nodes: document.nodes.map((item) =>
            item.id === operation.nodeId ? { ...item, data } : item
          ),
        }
      }

      case 'update-edge-data': {
        const edge = document.edges.find((item) => item.id === operation.edgeId)

        if (edge === undefined) {
          return document
        }

        const data = operation.replace
          ? operation.data
          : { ...edge.data, ...operation.data }

        return {
          ...document,
          edges: document.edges.map((item) =>
            item.id === operation.edgeId ? { ...item, data } : item
          ),
        }
      }

      case 'delete-elements': {
        return yield* deleteElements(document, operation, deletion)
      }

      default: {
        const exhaustive: never = operation

        return exhaustive
      }
    }
  })

/** Construct one candidate and validate only its final graph, allowing temporarily incomplete collections. */
export const prepareFlowEdit = (
  document: FlowDocument,
  input: FlowEditTransaction | typeof FlowEditTransactionSchema.Encoded
) =>
  Effect.gen(function* prepareFlowEditWorkflow() {
    const transaction = yield* S.decodeUnknownEffect(FlowEditTransactionSchema)(
      input
    )

    yield* Effect.annotateCurrentSpan({
      [FlowAttribute.editOperationCount]: transaction.operations.length,
    })
    const deletion = emptyDeletion()
    let candidate = document

    for (const operation of transaction.operations) {
      candidate = yield* applyOperation(candidate, operation, deletion)
    }

    yield* decodeFlowDocument(candidate)
    candidate = refitFlowGroups(candidate)
    const validated = yield* decodeFlowDocument(candidate)

    const result: FlowEditResult = {
      document: {
        ...validated,
        nodes: validated.nodes.map((node) => {
          const original = document.nodes.find((item) => item.id === node.id)

          const candidateNode = candidate.nodes.find(
            (item) => item.id === node.id
          )

          return original !== undefined && candidateNode === original
            ? original
            : node
        }),
        edges: validated.edges.map((edge) => {
          const original = document.edges.find((item) => item.id === edge.id)

          const candidateEdge = candidate.edges.find(
            (item) => item.id === edge.id
          )

          return original !== undefined && candidateEdge === original
            ? original
            : edge
        }),
      },
      deletion,
      ...(transaction.context === undefined
        ? undefined
        : { context: transaction.context }),
    }

    return result
  }).pipe(
    Effect.withSpan(FlowSpan.editPrepare, {
      attributes: { [FlowAttribute.inputKind]: 'graph-edit-transaction' },
    })
  )

export const prepareFlowDeleteCandidate = (
  document: FlowDocument,
  request: {
    readonly nodeIds?: readonly string[]
    readonly edgeIds?: readonly string[]
  }
) =>
  Effect.gen(function* prepareFlowDeleteCandidateWorkflow() {
    const result = yield* prepareFlowEdit(document, {
      operations: [
        {
          kind: 'delete-elements',
          nodeIds: request.nodeIds,
          edgeIds: request.edgeIds,
        },
      ],
    })

    const nodeIds = new Set(result.deletion.deletedNodeIds)

    const edgeIds = new Set(result.deletion.deletedEdgeIds)

    const candidate: FlowDeleteCandidate = {
      nodes: document.nodes.filter(({ id }) => nodeIds.has(id)),
      edges: document.edges.filter(({ id }) => edgeIds.has(id)),
    }

    return { candidate, result }
  }).pipe(
    Effect.withSpan(FlowSpan.editPrepare, {
      attributes: { [FlowAttribute.inputKind]: 'flow-delete-candidate' },
    })
  )

export const finalizeFlowDeleteCandidate = (
  document: FlowDocument,
  eligible: FlowDeleteCandidate,
  decisionInput: FlowDeleteDecision,
  operationId: string
) =>
  Effect.gen(function* finalizeFlowDeleteCandidateWorkflow() {
    const decision = yield* S.decodeUnknownEffect(FlowDeleteDecisionSchema)(
      decisionInput
    )

    if (decision === false) {
      return {
        document,
        deletion: { deletedNodeIds: [], deletedEdgeIds: [] },
      } satisfies FlowEditResult
    }

    const selected =
      decision === true
        ? eligible
        : yield* S.decodeUnknownEffect(FlowDeleteCandidateSchema)(decision)

    const eligibleNodeIds = new Set(eligible.nodes.map(({ id }) => id))

    const eligibleEdgeIds = new Set(eligible.edges.map(({ id }) => id))

    const selectedNodeIds = [...new Set(selected.nodes.map(({ id }) => id))]
    const selectedEdgeIds = [...new Set(selected.edges.map(({ id }) => id))]

    const widenedNodeIds = selectedNodeIds.filter(
      (id) => !eligibleNodeIds.has(id)
    )

    const widenedEdgeIds = selectedEdgeIds.filter(
      (id) => !eligibleEdgeIds.has(id)
    )

    if (widenedNodeIds.length > 0 || widenedEdgeIds.length > 0) {
      return yield* Effect.fail(
        new FlowDeleteInvalidCandidate({
          operationId,
          nodeIds: widenedNodeIds,
          edgeIds: widenedEdgeIds,
        })
      )
    }

    const result = yield* prepareFlowEdit(document, {
      operations: [
        {
          kind: 'delete-elements',
          nodeIds: selectedNodeIds,
          edgeIds: selectedEdgeIds,
        },
      ],
    })

    const unapprovedNodeIds = result.deletion.deletedNodeIds.filter(
      (id) => !selectedNodeIds.includes(id)
    )

    const unapprovedEdgeIds = result.deletion.deletedEdgeIds.filter(
      (id) => !selectedEdgeIds.includes(id)
    )

    if (unapprovedNodeIds.length > 0 || unapprovedEdgeIds.length > 0) {
      return yield* Effect.fail(
        new FlowDeleteInvalidCandidate({
          operationId,
          nodeIds: unapprovedNodeIds,
          edgeIds: unapprovedEdgeIds,
        })
      )
    }

    return result
  }).pipe(
    Effect.withSpan(FlowSpan.editPrepare, {
      attributes: { [FlowAttribute.inputKind]: 'flow-delete-finalize' },
    })
  )
