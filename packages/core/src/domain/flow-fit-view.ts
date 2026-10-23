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
import { NodeIdSchema } from './flow.schema.ts'
import type { FlowDocument, NodeId } from './flow.schema.ts'

export interface FitViewInput {
  readonly document: FlowDocument
  readonly nodeIds?: ReadonlySet<NodeId> | undefined
  readonly measurements: ReadonlyMap<NodeId, MeasuredNode>
  readonly currentViewport: Viewport
  readonly paneWidth: number
  readonly paneHeight: number
  readonly limits: ViewportLimits
  /** Upstream numeric padding, px/% strings, or per-side values. */
  readonly padding?: ViewportPadding | undefined
  /** Dimensions used until a visible node has a positive DOM measurement. */
  readonly fallbackDimensions?: FitViewNodeDimensions | undefined
  readonly positionOverrides?: ReadonlyMap<NodeId, XYPosition> | undefined
  /** React `fitViewOptions.includeHiddenNodes`; hidden nodes are skipped by default. */
  readonly includeHiddenNodes?: boolean | undefined
  /** React `fitViewOptions.minZoom`/`maxZoom`; override `limits` for this fit only. */
  readonly minZoom?: number | undefined
  readonly maxZoom?: number | undefined
}

export const FitViewPaddingSchema = ViewportPaddingSchema

export type FitViewPadding = typeof FitViewPaddingSchema.Type

/**
 * React Flow `FitViewOptions`, serializable subset. `nodes` takes the React
 * form (`{ id }` items) or the Flow shorthands `all` and `selected`.
 */
export const FlowFitViewOptionsSchema = S.Struct({
  padding: S.optional(ViewportPaddingSchema),
  includeHiddenNodes: S.optional(S.Boolean),
  minZoom: S.optional(S.Finite.check(S.isGreaterThan(0))),
  maxZoom: S.optional(S.Finite.check(S.isGreaterThan(0))),
  duration: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  easing: S.optional(S.Literals(['linear', 'ease-in-out'])),
  nodes: S.optional(
    S.Union([
      S.Literals(['all', 'selected']),
      S.Array(S.Struct({ id: NodeIdSchema })),
    ])
  ),
})

export type FlowFitViewOptions = typeof FlowFitViewOptionsSchema.Type

/** The node ids a fit covers, or `undefined` for every node. */
export const resolveFitViewNodeIds = (
  document: Pick<FlowDocument, 'nodes'>,
  nodes?: FlowFitViewOptions['nodes']
): ReadonlySet<NodeId> | undefined => {
  if (nodes === undefined || nodes === 'all') {
    return undefined
  }

  if (nodes === 'selected') {
    return new Set(
      document.nodes
        .filter((node) => node.selected === true)
        .map((node) => node.id)
    )
  }

  return new Set(nodes.map((node) => node.id))
}

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
  includeHiddenNodes = false,
  minZoom,
  maxZoom,
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

  const bounds = graphBounds(graph, nodeIds, {
    includeHidden: includeHiddenNodes,
  })

  if (bounds === undefined) {
    return currentViewport
  }

  return (
    getViewportForBounds({
      bounds,
      height: paneHeight,
      limits: {
        minZoom: minZoom ?? limits.minZoom,
        maxZoom: maxZoom ?? limits.maxZoom,
      },
      padding,
      width: paneWidth,
    }) ?? currentViewport
  )
}
