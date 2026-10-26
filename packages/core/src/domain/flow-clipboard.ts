import { Effect, Schema as S } from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import { pruneFlowBundles } from './flow-bundle-pruning.ts'
import { FlowBundleSchema } from './flow-bundle.schema.ts'
import { allocateFlowClipboardId } from './flow-clipboard-ids.ts'
import type { FlowEditTransaction } from './flow-edit.schema.ts'
import { createFlowGraph } from './flow-graph.ts'
import { flowHistoryDocument } from './flow-history.ts'
import { nodeTopLeftToAnchor, resolveNodeOrigin } from './flow-origin.schema.ts'
import {
  FlowDocumentSchema,
  NodeIdSchema,
  EdgeIdSchema,
  HandleIdSchema,
  XYPositionSchema,
  validateFlowDocument,
} from './flow.schema.ts'
import type {
  FlowDocument,
  FlowNode,
  FlowEdge,
  NodeId,
  EdgeId,
  HandleId,
} from './flow.schema.ts'

export const FlowGraphFragmentSchema = S.Struct({
  version: S.Literal(1),
  document: FlowDocumentSchema,
})

export type FlowGraphFragment = typeof FlowGraphFragmentSchema.Type

export const FlowClipboardStateSchema = S.Struct({
  fragment: S.NullOr(FlowGraphFragmentSchema),
  pasteCount: S.Int.check(S.isGreaterThanOrEqualTo(0)),
})

export type FlowClipboardState = typeof FlowClipboardStateSchema.Type

export const FlowPasteOptionsSchema = S.Struct({
  /** Fresh caller-owned namespace for concurrent room pastes. */
  idNamespace: S.optional(S.NonEmptyString),
  /** Place the copied root anchor at this graph-space point. */
  position: S.optional(XYPositionSchema),
})

export type FlowPasteOptions = typeof FlowPasteOptionsSchema.Type

/** Explicit reference ownership. Opaque JSON is never searched for strings. */
export interface FlowClipboardReferences {
  readonly nodeIds: ReadonlyMap<NodeId, NodeId>
  readonly edgeIds: ReadonlyMap<EdgeId, EdgeId>
  readonly handleIds: ReadonlyMap<NodeId, ReadonlyMap<HandleId, HandleId>>
}

export interface FlowClipboardExtension {
  readonly remapNode?: (
    node: FlowNode,
    references: FlowClipboardReferences
  ) => FlowNode
  readonly remapEdge?: (
    edge: FlowEdge,
    references: FlowClipboardReferences
  ) => FlowEdge
}

export const createFlowClipboard = (): FlowClipboardState => ({
  fragment: null,
  pasteCount: 0,
})

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- This is the schema boundary for untrusted graph fragments.
export const decodeFlowGraphFragment = (input: unknown) =>
  Effect.gen(function* decodeFragment() {
    const fragment = yield* S.decodeUnknownEffect(FlowGraphFragmentSchema)(
      input
    )

    const document = yield* validateFlowDocument(fragment.document)
    yield* Effect.logDebug('Decoded graph clipboard fragment').pipe(
      Effect.annotateLogs({
        [FlowAttribute.nodeCount]: document.nodes.length,
        [FlowAttribute.edgeCount]: document.edges.length,
      })
    )

    return structuredClone({ version: 1, document } satisfies FlowGraphFragment)
  }).pipe(
    Effect.tapError((failure) =>
      Effect.logWarning('Rejected graph clipboard fragment').pipe(
        Effect.annotateLogs({
          [FlowAttribute.failureMessage]: String(failure),
          [FlowAttribute.inputKind]: 'graph-clipboard',
        }),
        Effect.withSpan(FlowSpan.editFailure)
      )
    ),
    Effect.withSpan(FlowSpan.documentDecode, {
      attributes: { [FlowAttribute.inputKind]: 'graph-clipboard' },
    })
  )

/** Include every descendant and induced edge; detach roots at their absolute anchor. */
export const extractFlowGraphFragment = (
  document: FlowDocument
): FlowGraphFragment => {
  const included = new Set(
    document.nodes.filter((node) => node.selected).map((node) => node.id)
  )

  let changed = true

  while (changed) {
    changed = false

    for (const node of document.nodes) {
      if (
        node.parentId !== undefined &&
        included.has(node.parentId) &&
        !included.has(node.id)
      ) {
        included.add(node.id)
        changed = true
      }
    }
  }

  const graph = createFlowGraph(document)

  const nodes = document.nodes
    .filter((node) => included.has(node.id))
    .map((node) => {
      const { parentId, extent, expandParent: _expandParent, ...root } = node

      if (parentId !== undefined && included.has(parentId)) {
        return node
      }

      const physical = graph.nodes.get(node.id)

      return {
        ...root,
        origin: resolveNodeOrigin(node, document),
        extent: extent === 'parent' ? undefined : extent,
        position:
          physical === undefined
            ? node.position
            : nodeTopLeftToAnchor(
                physical.absolutePosition,
                physical.dimensions,
                resolveNodeOrigin(node, document)
              ),
      }
    })

  return {
    version: 1,
    document: flowHistoryDocument(
      pruneFlowBundles({
        ...document,
        nodes,
        edges: document.edges.filter(
          (edge) => included.has(edge.source) && included.has(edge.target)
        ),
      })
    ),
  }
}

interface FlowClipboardPaste {
  readonly state: FlowClipboardState
  readonly transaction: FlowEditTransaction
}

/** One reducer for all hosts. The host submits the returned edit through its accepted-state owner. */
export const pasteFlowGraphFragment = (
  state: FlowClipboardState,
  document: FlowDocument,
  options: FlowPasteOptions = {},
  extensions: readonly FlowClipboardExtension[] = []
): FlowClipboardPaste => {
  const fragment = state.fragment?.document ?? { nodes: [], edges: [] }

  if (fragment.nodes.length === 0) {
    return { state, transaction: { operations: [] } }
  }

  const pasteCount = state.pasteCount + 1
  const nodeUsed = new Set(document.nodes.map(({ id }) => String(id)))
  const edgeUsed = new Set(document.edges.map(({ id }) => String(id)))

  const nodeIds = new Map(
    fragment.nodes.map(({ id }) => [
      id,
      NodeIdSchema.make(
        allocateFlowClipboardId(id, nodeUsed, options.idNamespace)
      ),
    ])
  )

  const edgeIds = new Map(
    fragment.edges.map(({ id }) => [
      id,
      EdgeIdSchema.make(
        allocateFlowClipboardId(id, edgeUsed, options.idNamespace)
      ),
    ])
  )

  const handleIds = new Map(
    fragment.nodes.map((node) => [
      node.id,
      new Map(
        (node.handles ?? []).map(({ id }) => [
          id,
          HandleIdSchema.make(`${nodeIds.get(node.id)}-${id}`),
        ])
      ),
    ])
  )

  const references: FlowClipboardReferences = { nodeIds, edgeIds, handleIds }
  const roots = fragment.nodes.filter((node) => node.parentId === undefined)

  const offset =
    options.position === undefined
      ? { x: pasteCount * 20, y: pasteCount * 20 }
      : {
          x:
            options.position.x -
            Math.min(...roots.map((node) => node.position.x)),
          y:
            options.position.y -
            Math.min(...roots.map((node) => node.position.y)),
        }

  const nodes = fragment.nodes.map((node) => {
    const id = nodeIds.get(node.id) ?? node.id

    let remapped: FlowNode = {
      ...structuredClone(node),
      id,
      selected: true,
      origin: structuredClone(resolveNodeOrigin(node, fragment)),
      parentId:
        node.parentId === undefined ? undefined : nodeIds.get(node.parentId),
      position:
        node.parentId === undefined
          ? { x: node.position.x + offset.x, y: node.position.y + offset.y }
          : structuredClone(node.position),
      handles: node.handles?.map((handle) => ({
        ...handle,
        id: handleIds.get(node.id)?.get(handle.id) ?? handle.id,
      })),
    }

    for (const extension of extensions) {
      remapped = extension.remapNode?.(remapped, references) ?? remapped
    }

    return remapped
  })

  const edges = fragment.edges.map((edge) => {
    let remapped: FlowEdge = {
      ...structuredClone(edge),
      id: edgeIds.get(edge.id) ?? edge.id,
      selected: true,
      source: nodeIds.get(edge.source) ?? edge.source,
      target: nodeIds.get(edge.target) ?? edge.target,
      sourceHandle:
        edge.sourceHandle === undefined
          ? undefined
          : (handleIds.get(edge.source)?.get(edge.sourceHandle) ??
            edge.sourceHandle),
      targetHandle:
        edge.targetHandle === undefined
          ? undefined
          : (handleIds.get(edge.target)?.get(edge.targetHandle) ??
            edge.targetHandle),
    }

    if (edge.route?.mode === 'manual') {
      const [first, ...rest] = edge.route.points

      remapped = {
        ...remapped,
        route: {
          mode: 'manual',
          points: [
            { x: first.x + offset.x, y: first.y + offset.y },
            ...rest.map((point) => ({
              x: point.x + offset.x,
              y: point.y + offset.y,
            })),
          ],
        },
      }
    }

    for (const extension of extensions) {
      remapped = extension.remapEdge?.(remapped, references) ?? remapped
    }

    return remapped
  })

  const bundleUsed = new Set((document.bundles ?? []).map(({ id }) => id))

  const bundles = fragment.bundles?.map((bundle) =>
    S.decodeUnknownSync(FlowBundleSchema)({
      ...bundle,
      id: allocateFlowClipboardId(bundle.id, bundleUsed, options.idNamespace),
      edgeIds: bundle.edgeIds.map((id) => edgeIds.get(id) ?? id),
      ties: bundle.ties.map((point) => ({
        x: point.x + offset.x,
        y: point.y + offset.y,
      })),
    })
  )

  return {
    state: { ...state, pasteCount },
    transaction: {
      operations: [
        ...(bundles === undefined
          ? []
          : [
              {
                kind: 'set-bundles' as const,
                bundles: [...(document.bundles ?? []), ...bundles],
              },
            ]),
        {
          kind: 'set-nodes',
          nodes: [
            ...document.nodes.map((node) => ({ ...node, selected: false })),
            ...nodes,
          ],
        },
        {
          kind: 'set-edges',
          edges: [
            ...document.edges.map((edge) => ({ ...edge, selected: false })),
            ...edges,
          ],
        },
      ],
    },
  }
}

export const copyFlowSelection = (document: FlowDocument) =>
  decodeFlowGraphFragment(extractFlowGraphFragment(document)).pipe(
    Effect.map((fragment): FlowClipboardState => ({ fragment, pasteCount: 0 }))
  )
