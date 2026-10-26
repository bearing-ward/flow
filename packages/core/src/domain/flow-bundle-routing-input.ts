import { getEdgesGeometry } from './flow-edge-geometry.ts'
import type { FlowEdgeGeometryOptions } from './flow-edge-geometry.ts'
import type { FlowDocument } from './flow.schema.ts'

/** Hidden members still own lanes; project their ports without changing saved visibility. */
export const getFlowRoutingEdges = (
  document: FlowDocument,
  options: FlowEdgeGeometryOptions
) => {
  const visible = getEdgesGeometry(document, options)

  if ((document.bundles?.length ?? 0) === 0) {
    return visible
  }

  const present = new Set(visible.map(({ id }) => id))

  const missing = new Set(
    document.bundles?.flatMap(({ edgeIds }) =>
      edgeIds.filter((id) => !present.has(id))
    )
  )

  if (missing.size === 0) {
    return visible
  }

  const projected = getEdgesGeometry(
    {
      ...document,
      nodes: document.nodes.map((node) => ({ ...node, hidden: false })),
      edges: document.edges.map((edge) => ({ ...edge, hidden: false })),
    },
    options
  ).filter(({ id }) => missing.has(id))

  const byId = new Map(
    [...visible, ...projected].map((geometry) => [geometry.id, geometry])
  )

  return document.edges.flatMap(({ id }) => {
    const geometry = byId.get(id)

    return geometry === undefined ? [] : [geometry]
  })
}
