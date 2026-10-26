import { getEdgePolylines, getEdgesGeometry } from './flow-edge-geometry.ts'
import type {
  FlowEdgeGeometryOptions,
  FlowEdgeRenderGeometry,
} from './flow-edge-geometry.ts'
import type { FlowDocument, XYPosition } from './flow.schema.ts'

/** One hit per rendered edge, ordered by distance from the slash's start. */
export const intersectFlowWireSlash = (
  geometries: readonly Pick<FlowEdgeRenderGeometry, 'id' | 'path'>[],
  start: XYPosition,
  end: XYPosition
) => {
  const dx = end.x - start.x
  const dy = end.y - start.y

  return geometries
    .flatMap((geometry, order) => {
      let closest = Number.POSITIVE_INFINITY

      for (const line of getEdgePolylines(geometry, { curveSegments: 64 })) {
        for (let i = 1; i < line.length; i += 1) {
          const a = line[i - 1]
          const b = line[i]

          if (a === undefined || b === undefined) {
            continue
          }

          const sx = b.x - a.x
          const sy = b.y - a.y
          const denominator = dx * sy - dy * sx

          if (Math.abs(denominator) < 1e-12) {
            continue
          }

          const qx = a.x - start.x
          const qy = a.y - start.y
          const t = (qx * sy - qy * sx) / denominator
          const u = (qx * dy - qy * dx) / denominator

          if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            closest = Math.min(closest, t)
          }
        }
      }

      return Number.isFinite(closest)
        ? [
            {
              edgeId: geometry.id,
              distance: closest * Math.hypot(dx, dy),
              position: {
                x: start.x + dx * closest,
                y: start.y + dy * closest,
              },
              order,
            },
          ]
        : []
    })
    .toSorted((a, b) => a.distance - b.distance || a.order - b.order)
}

/** A ribbon can receive another tie only when every crossed edge is in that bundle. */
export const flowWireSlash = (
  document: FlowDocument,
  start: XYPosition,
  end: XYPosition,
  options: FlowEdgeGeometryOptions = {}
) => {
  const hits = intersectFlowWireSlash(
    getEdgesGeometry(document, options),
    start,
    end
  )

  const existing = document.bundles?.find(
    (bundle) =>
      hits.length >= 2 &&
      hits.every(({ edgeId }) => bundle.edgeIds.includes(edgeId))
  )

  const free = hits.filter(
    ({ edgeId }) =>
      !document.bundles?.some(({ edgeIds }) => edgeIds.includes(edgeId))
  )

  const crossed = existing === undefined ? free : hits

  const position =
    crossed.length === 0
      ? end
      : {
          x:
            crossed.reduce((sum, hit) => sum + hit.position.x, 0) /
            crossed.length,
          y:
            crossed.reduce((sum, hit) => sum + hit.position.y, 0) /
            crossed.length,
        }

  return {
    edgeIds: crossed.map(({ edgeId }) => edgeId),
    position,
    bundleId: existing?.id,
    label:
      existing === undefined ? `Tie ${free.length} wires` : 'Add a second tie',
  }
}
