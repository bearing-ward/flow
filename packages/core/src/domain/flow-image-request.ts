import { Effect } from 'effect'

import { flowMeasurementsFromInternalNodes } from './flow-edge-geometry.ts'
import {
  prepareFlowImageExport,
  FlowImageExportFailure,
  flowImageDocumentRevision,
} from './flow-image-export.ts'
import type { FlowImageExportRequest } from './flow-image-export.ts'
import type { FlowObject } from './flow-instance.ts'
import type { FlowInternalNode } from './flow-measurement.schema.ts'

export type FlowImageExportOptions = Omit<
  FlowImageExportRequest,
  'version' | 'host' | 'scene'
> &
  Pick<FlowImageExportRequest['scene'], 'edgeRouting'>

/** Public adapters snapshot accepted state and measured bounds without loading a server dependency. */
export const createFlowImageExportRequest = (
  object: FlowObject,
  internals: Iterable<FlowInternalNode | undefined>,
  host: FlowImageExportRequest['host'],
  options: FlowImageExportOptions
): FlowImageExportRequest => {
  const { viewport: _viewport, ...document } = structuredClone(object)
  const samples = [...internals]
  const nodes = new Map(document.nodes.map((node) => [node.id, node]))

  for (const sample of samples) {
    if (sample === undefined) {
      continue
    }

    const original = nodes.get(sample.node.id)

    if (
      original === undefined ||
      flowImageDocumentRevision({ nodes: [original], edges: [] }) !==
        flowImageDocumentRevision({ nodes: [sample.node], edges: [] })
    ) {
      throw new FlowImageExportFailure({
        reason: 'invalid-request',
        message:
          'Document changed while reading export geometry; request a fresh snapshot',
      })
    }
  }

  const { edgeRouting, ...settings } = options

  const prepared = Effect.runSync(
    prepareFlowImageExport({
      ...settings,
      version: 1,
      host,
      scene: {
        document,
        measurements: [...flowMeasurementsFromInternalNodes(samples).values()],
        edgeRouting,
      },
    })
  )

  return prepared.request
}
