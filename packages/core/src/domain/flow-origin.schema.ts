import { Schema as S } from 'effect'

import type { NodeDimensions } from './flow-node-extent.schema.ts'
import type { XYPosition } from './flow-values.ts'
import type { FlowDocument, FlowNode } from './flow.schema.ts'

/** Fractional anchor within node dimensions; finite values are not clamped. */
export const NodeOriginSchema = S.Tuple([S.Finite, S.Finite])

export type NodeOrigin = typeof NodeOriginSchema.Type

export const resolveNodeOrigin = (
  node: Pick<FlowNode, 'origin'>,
  document: Pick<FlowDocument, 'nodeOrigin'>
): NodeOrigin => node.origin ?? document.nodeOrigin ?? [0, 0]

export const nodeAnchorToTopLeft = (
  position: XYPosition,
  dimensions: NodeDimensions,
  origin: NodeOrigin
): XYPosition => ({
  x: position.x - dimensions.width * origin[0],
  y: position.y - dimensions.height * origin[1],
})

export const nodeTopLeftToAnchor = (
  position: XYPosition,
  dimensions: NodeDimensions,
  origin: NodeOrigin
): XYPosition => ({
  x: position.x + dimensions.width * origin[0],
  y: position.y + dimensions.height * origin[1],
})
