import type { EdgeId, FlowDocument } from './flow.schema.ts'

/** A singleton is unbundled because D11 requires at least two lanes. */
export const pruneFlowBundles = (
  document: FlowDocument,
  removedEdges?: ReadonlySet<EdgeId>
): FlowDocument => {
  if (document.bundles === undefined) {
    return document
  }

  const edges = new Set(document.edges.map(({ id }) => id))

  return {
    ...document,
    bundles: document.bundles.flatMap((bundle) => {
      const edgeIds = bundle.edgeIds.filter(
        (id) =>
          edges.has(id) || (removedEdges !== undefined && !removedEdges.has(id))
      )

      return edgeIds.length < 2 ? [] : [{ ...bundle, edgeIds }]
    }),
  }
}

/** Only existing deleted edges may be pruned; newly invalid references still fail decoding. */
export const pruneDeletedFlowBundles = (
  before: FlowDocument,
  after: FlowDocument
): FlowDocument => {
  if (after.bundles === undefined) {
    return after
  }

  const remainingEdgeIds = new Set(after.edges.map(({ id }) => id))

  const removedEdgeIds = new Set(
    before.edges.flatMap(({ id }) => (remainingEdgeIds.has(id) ? [] : [id]))
  )

  return pruneFlowBundles(after, removedEdgeIds)
}
