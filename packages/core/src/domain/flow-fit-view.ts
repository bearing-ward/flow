import { Schema as S } from 'effect'

import { createFlowGraph, graphBounds } from './flow-graph.ts'
import type {
  MeasuredNode,
  Viewport,
  ViewportLimits,
} from './flow-runtime.schema.ts'
import type { XYPosition } from './flow-values.ts'
import {
  getViewportForBounds,
  ViewportPaddingSchema,
} from './flow-viewport-operation.schema.ts'
import type { ViewportPadding } from './flow-viewport-operation.schema.ts'
import type { FlowDocument, NodeId } from './flow.schema.ts'

export interface FitViewInput {
  readonly document: FlowDocument
  readonly nodeIds?: ReadonlySet<NodeId> | undefined
  readonly measurements: ReadonlyMap<NodeId, MeasuredNode>
  readonly currentViewport: Viewport
  readonly paneWidth: number
  readonly paneHeight: number
  readonly limits: ViewportLimits
  /** Uniform pane fraction or per-side pixel padding. */
  readonly padding?: ViewportPadding | undefined
  /** Dimensions used until a visible node has a positive DOM measurement. */
  readonly fallbackDimensions?: FitViewNodeDimensions | undefined
  readonly positionOverrides?: ReadonlyMap<NodeId, XYPosition> | undefined
}

export const FitViewPaddingSchema = ViewportPaddingSchema

export type FitViewPadding = typeof FitViewPaddingSchema.Type

export const FitViewNodeDimensionsSchema = S.Struct({
  width: S.Finite.check(S.isGreaterThan(0)),
  height: S.Finite.check(S.isGreaterThan(0)),
})

export type FitViewNodeDimensions = typeof FitViewNodeDimensionsSchema.Type

/** Center visible nodes with measured or fallback dimensions within the pane. */
export const fitViewportToNodes = ({
  document,
  nodeIds,
  measurements,
  currentViewport,
  paneWidth,
  paneHeight,
  limits,
  padding = 0.1,
  fallbackDimensions,
  positionOverrides,
}: FitViewInput): Viewport => {
  if (paneWidth <= 0 || paneHeight <= 0) {
    return currentViewport
  }

  const graph = createFlowGraph(
    document,
    measurements,
    positionOverrides,
    fallbackDimensions ?? { width: 150, height: 44 }
  )

  const bounds = graphBounds(graph, nodeIds)

  if (bounds === undefined) {
    return currentViewport
  }

  return (
    getViewportForBounds({
      bounds,
      height: paneHeight,
      limits,
      padding,
      width: paneWidth,
    }) ?? currentViewport
  )
}
