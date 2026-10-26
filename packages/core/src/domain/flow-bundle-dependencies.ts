import type { FlowDocument, EdgeId, NodeId } from './flow.schema.ts'

/** A bundle's shared tangent changes when any member endpoint moves. */
export const flowBundleAffectedEdges = (
  document: FlowDocument,
  changed: ReadonlySet<EdgeId>
): ReadonlySet<EdgeId> => {
  const affected = new Set(changed)

  for (const bundle of document.bundles ?? []) {
    if (bundle.edgeIds.some((id) => affected.has(id))) {
      for (const id of bundle.edgeIds) {
        affected.add(id)
      }
    }
  }

  return affected
}

export const flowBundleEndpointNodeIds = (
  document: FlowDocument,
  edgeId: EdgeId
): readonly NodeId[] => {
  const bundle = document.bundles?.find(({ edgeIds }) =>
    edgeIds.includes(edgeId)
  )

  if (bundle === undefined) {
    return []
  }

  return [
    ...new Set(
      document.edges
        .filter(({ id }) => bundle.edgeIds.includes(id))
        .flatMap(({ source, target }) => [source, target])
    ),
  ]
}
