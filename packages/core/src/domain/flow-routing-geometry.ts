import { getBundleRouteGeometry } from './flow-bundle-geometry.ts'
import type { FlowEdgeGeometryOptions } from './flow-edge-geometry.ts'
import { getManualRouteGeometry } from './flow-route-geometry.ts'
import type { FlowDocument, FlowEdge, XYPosition } from './flow.schema.ts'

export const flowRoutingRevision = (
  document: FlowDocument,
  options: FlowEdgeGeometryOptions = {}
): string =>
  JSON.stringify({
    bundles: document.bundles,
    nodes: document.nodes.map((node) => [
      node.id,
      node.position.x,
      node.position.y,
      node.parentId,
      node.origin,
      node.size?.width,
      node.size?.height,
      node.handles?.map((handle) => [handle.id, handle.kind, handle.side]),
      node.hidden,
      node.sourcePosition,
      node.targetPosition,
    ]),
    nodeOrigin: document.nodeOrigin,
    edges: document.edges.map((edge) => [
      edge.id,
      edge.source,
      edge.target,
      edge.sourceHandle,
      edge.targetHandle,
      edge.hidden,
      edge.route?.mode,
    ]),
    measurements: document.nodes.map(({ id }) => {
      const measurement = options.measurements?.get(id)

      return [
        id,
        measurement?.width,
        measurement?.height,
        measurement?.handles?.map((handle) => [
          handle.handleId,
          handle.offset.x,
          handle.offset.y,
          handle.width,
          handle.height,
        ]),
      ]
    }),
    positions: document.nodes.flatMap(({ id, position }) => {
      const next = options.positionOverrides?.get(id)

      return next !== undefined &&
        (next.x !== position.x || next.y !== position.y)
        ? [[id, next.x, next.y]]
        : []
    }),
  })

/** Generated paths never become authored route points. A stale result cannot render. */
export const getAutomaticRouteGeometry = (
  document: FlowDocument,
  edge: FlowEdge,
  source: XYPosition,
  target: XYPosition,
  options: FlowEdgeGeometryOptions
) => {
  const result = options.edgeRouting

  const current =
    result !== null &&
    result !== undefined &&
    result.revision === flowRoutingRevision(document, options)

  const bundled = getBundleRouteGeometry(
    document,
    edge,
    source,
    target,
    options
  )

  if (bundled !== undefined) {
    return (
      (current
        ? result.bundlePaths?.find(({ id }) => id === edge.id)
        : undefined) ?? bundled
    )
  }

  if (edge.route?.mode === 'manual' || !current) {
    return
  }

  const route = result.paths.find(({ id }) => id === edge.id)

  return route?.kind === 'routed' &&
    route.points[0]?.x === source.x &&
    route.points[0]?.y === source.y &&
    route.points.at(-1)?.x === target.x &&
    route.points.at(-1)?.y === target.y
    ? getManualRouteGeometry(source, target, route.points.slice(1, -1))
    : undefined
}
