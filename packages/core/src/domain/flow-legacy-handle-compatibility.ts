import type { FlowDocument } from './flow.schema.ts'
import { MissingEdgeHandle } from './missing-edge-handle.ts'

/** Frozen v1 capability invariant, separate from live physical-ID integrity. */
export const findLegacyEndpointKindIssue = (
  document: FlowDocument
): MissingEdgeHandle | undefined => {
  for (const edge of document.edges) {
    for (const endpoint of ['source', 'target'] as const) {
      const handleId =
        endpoint === 'source' ? edge.sourceHandle : edge.targetHandle

      if (handleId === undefined) {
        continue
      }

      const nodeId = edge[endpoint]

      const handle = document.nodes
        .find((node) => node.id === nodeId)
        ?.handles?.find((candidate) => candidate.id === handleId)

      // Missing nodes/identities remain ordinary live integrity failures.
      if (handle !== undefined && handle.kind !== endpoint) {
        return new MissingEdgeHandle({
          edgeId: edge.id,
          endpoint,
          handleId,
          nodeId,
        })
      }
    }
  }
}
