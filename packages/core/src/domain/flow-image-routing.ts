import type { FlowEdgeRenderGeometry } from './flow-edge-geometry.ts'
import {
  flowMeasurementsFromInternalNodes,
  getEdgesGeometry,
} from './flow-edge-geometry.ts'
import type { PreparedFlowImageExport } from './flow-image-export.ts'
import type { FlowInternalNode } from './flow-measurement.schema.ts'
import { flowRoutingRevision } from './flow-routing-geometry.ts'
import type { FlowRoutingResult } from './flow-routing.schema.ts'

/** Preserve a current route while adapting endpoint anchors to native CSS measurement precision. */
export const getFlowImageCaptureRouting = (
  prepared: PreparedFlowImageExport,
  internals: Iterable<FlowInternalNode | undefined>
): FlowRoutingResult | null => {
  const supplied = prepared.request.scene.edgeRouting
  const original = prepared.request.scene.document

  const measurements = new Map(
    prepared.request.scene.measurements.map((item) => [item.nodeId, item])
  )

  if (
    supplied === null ||
    supplied.revision !== flowRoutingRevision(original, { measurements })
  ) {
    return null
  }

  const expected = new Map<string, FlowEdgeRenderGeometry>(
    getEdgesGeometry(original, { measurements }).map((edge) => [edge.id, edge])
  )

  const actualMeasurements = flowMeasurementsFromInternalNodes(internals)

  const actual = new Map<string, FlowEdgeRenderGeometry>(
    getEdgesGeometry(prepared.document, {
      measurements: actualMeasurements,
    }).map((edge) => [edge.id, edge])
  )

  return {
    ...supplied,
    revision: flowRoutingRevision(prepared.document, {
      measurements: actualMeasurements,
    }),
    paths: supplied.paths.map((path) => {
      const before = expected.get(path.id)
      const after = actual.get(path.id)
      const first = path.kind === 'routed' ? path.points[0] : undefined
      const last = path.kind === 'routed' ? path.points.at(-1) : undefined

      if (
        path.kind !== 'routed' ||
        before === undefined ||
        after === undefined ||
        first?.x !== before.source.x ||
        first.y !== before.source.y ||
        last?.x !== before.target.x ||
        last.y !== before.target.y
      ) {
        return path
      }

      return {
        ...path,
        points: [after.source, ...path.points.slice(1, -1), after.target],
      }
    }),
  }
}
