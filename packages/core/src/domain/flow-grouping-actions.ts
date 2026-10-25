import { Effect, Schema } from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import type { FlowEditTransaction } from './flow-edit.schema.ts'
import { createFlowGraph, graphNodeBounds } from './flow-graph.ts'
import { groupNodes, reparentNode } from './flow-grouping.ts'
import type { FlowNodeBoundsLookup } from './flow-grouping.ts'
import { resolveNodeOrigin } from './flow-origin.schema.ts'
import type { MeasuredNode } from './flow-runtime.schema.ts'
import { NodeIdSchema } from './flow.schema.ts'
import type { NodeId, FlowDocument, FlowNode } from './flow.schema.ts'

export const FlowGroupingActionSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal('group'),
    nodeIds: Schema.Array(NodeIdSchema),
    groupId: NodeIdSchema,
  }),
  Schema.Struct({ kind: Schema.Literal('ungroup'), groupId: NodeIdSchema }),
  Schema.Struct({
    kind: Schema.Literal('detach'),
    nodeIds: Schema.Array(NodeIdSchema),
  }),
])

export type FlowGroupingAction = typeof FlowGroupingActionSchema.Type

export type FlowGroupingActionInput = typeof FlowGroupingActionSchema.Encoded

export const FlowGroupSizingSchema = Schema.Struct({
  autoFit: Schema.Literal(true),
})

const autoFits = (node: FlowNode): boolean =>
  Schema.is(FlowGroupSizingSchema)(node.data?.flowGrouping)

/** Fit direct children from the inside out; reposition the wrapper, never its descendants. */
export const refitGroupNodes = (
  nodes: readonly FlowNode[],
  bounds: FlowNodeBoundsLookup,
  defaultOrigin: readonly [number, number] = [0, 0]
): readonly FlowNode[] => {
  let next = nodes
  const rects = new Map(bounds)
  const fitted = new Set<string>()
  const visiting = new Set<string>()

  const fit = (id: string): boolean => {
    if (fitted.has(id)) {
      return true
    }

    if (visiting.has(id)) {
      return false
    }

    visiting.add(id)
    const group = next.find((node) => node.id === id)
    const children = next.filter((node) => node.parentId === id)

    if (group === undefined) {
      return false
    }

    for (const child of children) {
      if (autoFits(child) && !fit(child.id)) {
        return false
      }
    }

    visiting.delete(id)
    fitted.add(id)

    if (children.length === 0) {
      return true
    }

    const own = rects.get(id)

    const parent =
      group.parentId === undefined ? { x: 0, y: 0 } : rects.get(group.parentId)

    const childRects = children.map((child) => rects.get(child.id))

    if (
      own === undefined ||
      parent === undefined ||
      childRects.some((rect) => rect === undefined)
    ) {
      return false
    }

    const complete = childRects.filter((rect) => rect !== undefined)
    const x = Math.min(...complete.map((rect) => rect.x)) - 20
    const y = Math.min(...complete.map((rect) => rect.y)) - 20

    const width =
      Math.max(...complete.map((rect) => rect.x + rect.width)) + 20 - x

    const height =
      Math.max(...complete.map((rect) => rect.y + rect.height)) + 20 - y

    const dx = x - own.x
    const dy = y - own.y
    rects.set(id, { x, y, width, height })

    if (
      dx === 0 &&
      dy === 0 &&
      group.size?.width === width &&
      group.size.height === height
    ) {
      return true
    }

    const origin = group.origin ?? defaultOrigin
    next = next.map((node) => {
      if (node.id === id) {
        return {
          ...node,
          position: {
            x: x - parent.x + width * origin[0],
            y: y - parent.y + height * origin[1],
          },
          size: { width, height },
        }
      }

      return node.parentId === id
        ? {
            ...node,
            position: { x: node.position.x - dx, y: node.position.y - dy },
          }
        : node
    })

    return true
  }

  for (const node of nodes) {
    if (autoFits(node) && !fit(node.id)) {
      return nodes
    }
  }

  return next
}

/** Authored sizes take precedence during a semantic edit; DOM sizes supply intrinsic dimensions. */
export const refitFlowGroups = (
  document: FlowDocument,
  measurements: ReadonlyMap<NodeId, MeasuredNode> = new Map()
): FlowDocument => {
  if (!document.nodes.some((node) => autoFits(node))) {
    return document
  }

  const intrinsic = new Map(
    [...measurements].filter(([id]) =>
      document.nodes.some((node) => node.id === id && node.size === undefined)
    )
  )

  const graph = createFlowGraph(document, intrinsic)

  const bounds = new Map(
    [...graph.nodes].flatMap(([id, node]) =>
      node.node.size !== undefined ||
      node.node.measured !== undefined ||
      intrinsic.has(id)
        ? [[id, graphNodeBounds(node)] as const]
        : []
    )
  )

  const nodes = refitGroupNodes(document.nodes, bounds, document.nodeOrigin)

  return nodes === document.nodes ? document : { ...document, nodes }
}

/** One decoded command produces one ordinary edit transaction, including edge preservation. */
export const prepareFlowGrouping = (
  document: FlowDocument,
  bounds: FlowNodeBoundsLookup,
  input: FlowGroupingActionInput
) =>
  Effect.gen(function* prepareFlowGroupingWorkflow() {
    const action = yield* Schema.decodeUnknownEffect(FlowGroupingActionSchema)(
      input
    )

    let { nodes } = document

    if (action.kind === 'group') {
      const grouped = groupNodes(nodes, bounds, {
        ...action,
        type: 'group',
        padding: 20,
      })

      if (grouped.kind === 'rejected') {
        return yield* Effect.fail(new Error(grouped.reason))
      }

      nodes = grouped.nodes.map((node) => {
        if (node.id === action.groupId) {
          return {
            ...node,
            origin: [0, 0] as const,
            data: { ...node.data, flowGrouping: { autoFit: true } },
          }
        }

        const rect = bounds.get(node.id)

        if (!action.nodeIds.includes(node.id) || rect === undefined) {
          return node
        }

        const origin = resolveNodeOrigin(node, document)

        return {
          ...node,
          position: {
            x: node.position.x + rect.width * origin[0],
            y: node.position.y + rect.height * origin[1],
          },
        }
      })
    } else if (action.kind === 'detach') {
      for (const id of action.nodeIds) {
        const node = nodes.find((item) => item.id === id)

        if (node?.parentId !== undefined) {
          if (!bounds.has(id)) {
            return yield* Effect.fail(new Error('missing-bounds'))
          }

          nodes = reparentNode(nodes, bounds, id).map((item) => {
            if (item.id !== id) {
              return item
            }

            const rect = bounds.get(id)
            const origin = resolveNodeOrigin(item, document)

            return rect === undefined
              ? item
              : {
                  ...item,
                  position: {
                    x: item.position.x + rect.width * origin[0],
                    y: item.position.y + rect.height * origin[1],
                  },
                }
          })
        }
      }
    } else {
      const group = nodes.find((node) => node.id === action.groupId)

      if (group === undefined || !bounds.has(group.id)) {
        return yield* Effect.fail(new Error('missing-bounds'))
      }

      for (const child of nodes.filter((node) => node.parentId === group.id)) {
        if (
          !bounds.has(child.id) ||
          (group.parentId !== undefined && !bounds.has(group.parentId))
        ) {
          return yield* Effect.fail(new Error('missing-bounds'))
        }

        nodes = reparentNode(nodes, bounds, child.id, group.parentId).map(
          (item) => {
            if (item.id !== child.id) {
              return item
            }

            const rect = bounds.get(child.id)
            const origin = resolveNodeOrigin(item, document)

            return rect === undefined
              ? item
              : {
                  ...item,
                  position: {
                    x: item.position.x + rect.width * origin[0],
                    y: item.position.y + rect.height * origin[1],
                  },
                }
          }
        )
      }

      // Remove only the wrapper. Incident edges remain attached to the surviving children.
      nodes = nodes.filter((node) => node.id !== group.id)
    }

    const surviving = new Set(nodes.map((node) => node.id))
    const fitted = refitFlowGroups({ ...document, nodes })

    const transaction: FlowEditTransaction = {
      operations: [
        { kind: 'set-nodes', nodes: fitted.nodes },
        {
          kind: 'set-edges',
          edges: document.edges.filter(
            (edge) => surviving.has(edge.source) && surviving.has(edge.target)
          ),
        },
      ],
    }

    yield* Effect.logDebug('Prepared grouping command').pipe(
      Effect.annotateLogs({
        [FlowAttribute.changeKind]: action.kind,
        [FlowAttribute.nodeCount]: nodes.length,
      })
    )

    return transaction
  }).pipe(
    Effect.tapError((failure) =>
      Effect.logWarning('Rejected grouping command').pipe(
        Effect.annotateLogs({
          [FlowAttribute.failureMessage]: String(failure),
          [FlowAttribute.inputKind]: 'grouping',
        }),
        Effect.withSpan(FlowSpan.editFailure)
      )
    ),
    Effect.withSpan(FlowSpan.editPrepare, {
      attributes: { [FlowAttribute.inputKind]: 'grouping' },
    })
  )
