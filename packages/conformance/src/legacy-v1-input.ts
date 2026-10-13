import type { FlowDocument } from '../../core/src/domain/flow.schema.ts'
import type * as frozen from './fixtures/legacy-v1-persistence/baseline-reader-writer.js'

type FrozenDocument = Parameters<typeof frozen.encodeSavedFlowDocument>[0]

const isMarkerKind = (marker: FlowDocument['edges'][number]['markerStart']) =>
  marker === undefined || marker === 'arrow' || marker === 'arrowclosed'

const isFrozenDocument = (
  document: FlowDocument
): document is FlowDocument & FrozenDocument =>
  document.edges.every(
    (edge) => isMarkerKind(edge.markerStart) && isMarkerKind(edge.markerEnd)
  )

/**
 * Pass a live document to the frozen de36b4f reader/writer unchanged. Live
 * edges also accept marker configurations; the frozen type only knows kinds.
 */
export const legacyV1Input = (document: FlowDocument): FrozenDocument => {
  if (!isFrozenDocument(document)) {
    throw new Error('Frozen v1 input cannot carry marker configurations')
  }

  return document
}
