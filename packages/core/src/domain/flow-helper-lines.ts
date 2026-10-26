import { Schema } from 'effect'

import type { FlowGraphView, FlowGraphNode } from './flow-graph.ts'
import { snapGroupDelta } from './flow-snap-grid.schema.ts'
import type { SnapGrid } from './flow-snap-grid.schema.ts'
import { NodeIdSchema } from './flow.schema.ts'
import type { NodeId, XYPosition } from './flow.schema.ts'

export const FlowAlignmentGuideSchema = Schema.Struct({
  axis: Schema.Literals(['x', 'y']),
  coordinate: Schema.Finite,
  from: Schema.Finite,
  to: Schema.Finite,
  sourceId: NodeIdSchema,
  targetId: NodeIdSchema,
})

export type FlowAlignmentGuide = typeof FlowAlignmentGuideSchema.Type

export interface FlowAlignmentResult {
  readonly delta: XYPosition
  readonly guides: readonly FlowAlignmentGuide[]
}

interface Candidate {
  readonly correction: number
  readonly rank: number
  readonly guide: FlowAlignmentGuide
}

const anchors = (node: FlowGraphNode, axis: 'x' | 'y') => {
  const start = node.absolutePosition[axis]
  const size = axis === 'x' ? node.dimensions.width : node.dimensions.height

  return [start + size / 2, start, start + size]
}

const compareIds = (left: NodeId, right: NodeId): number => {
  if (left === right) {
    return 0
  }

  return left < right ? -1 : 1
}

/** Six CSS pixels, inclusive. Centers win equal distances, then edges and IDs. */
export const solveFlowAlignment = (input: {
  readonly graph: FlowGraphView
  readonly nodeIds: readonly NodeId[]
  readonly delta: XYPosition
  readonly zoom: number
  readonly snapGrid?: SnapGrid | undefined
}): FlowAlignmentResult => {
  const { graph, nodeIds, delta, zoom, snapGrid } = input
  const excluded = new Set(nodeIds)

  const excludeChildren = (id: NodeId): void => {
    for (const child of graph.children.get(id) ?? []) {
      excluded.add(child)
      excludeChildren(child)
    }
  }

  for (const id of nodeIds) {
    excludeChildren(id)
  }

  const moving = nodeIds.flatMap((id) => {
    const node = graph.nodes.get(id)

    return node === undefined || node.hidden ? [] : [node]
  })

  const targets = graph.orderedNodes.filter(
    (node) => !node.hidden && !excluded.has(node.id)
  )

  const [first] = moving

  const fallback =
    snapGrid === undefined || first === undefined
      ? delta
      : snapGroupDelta(first.absolutePosition, delta, snapGrid)

  const snapped = { ...fallback }
  const guides: FlowAlignmentGuide[] = []

  for (const axis of ['x', 'y'] satisfies readonly ('x' | 'y')[]) {
    const candidates: Candidate[] = []
    const other = axis === 'x' ? 'y' : 'x'

    for (const source of moving) {
      for (const target of targets) {
        for (const [sourceRank, sourceAnchor] of anchors(
          source,
          axis
        ).entries()) {
          for (const [targetRank, coordinate] of anchors(
            target,
            axis
          ).entries()) {
            const correction = coordinate - sourceAnchor - delta[axis]

            if (Math.abs(correction) * zoom > 6) {
              continue
            }

            candidates.push({
              correction,
              rank: sourceRank * 3 + targetRank,
              guide: {
                axis,
                coordinate,
                from: Math.min(
                  source.absolutePosition[other] + delta[other],
                  target.absolutePosition[other]
                ),
                to: Math.max(
                  source.absolutePosition[other] +
                    delta[other] +
                    (other === 'x'
                      ? source.dimensions.width
                      : source.dimensions.height),
                  target.absolutePosition[other] +
                    (other === 'x'
                      ? target.dimensions.width
                      : target.dimensions.height)
                ),
                sourceId: source.id,
                targetId: target.id,
              },
            })
          }
        }
      }
    }

    candidates.sort(
      (a, b) =>
        Math.abs(a.correction) - Math.abs(b.correction) ||
        a.rank - b.rank ||
        compareIds(a.guide.targetId, b.guide.targetId) ||
        compareIds(a.guide.sourceId, b.guide.sourceId)
    )
    const [best] = candidates

    if (best !== undefined) {
      snapped[axis] = delta[axis] + best.correction
      guides.push(best.guide)
    }
  }

  return {
    delta: snapped,
    guides: guides.map((guide) => {
      const source = graph.nodes.get(guide.sourceId)
      const target = graph.nodes.get(guide.targetId)

      if (source === undefined || target === undefined) {
        return guide
      }

      const other = guide.axis === 'x' ? 'y' : 'x'
      const size = other === 'x' ? 'width' : 'height'

      return {
        ...guide,
        from: Math.min(
          source.absolutePosition[other] + snapped[other],
          target.absolutePosition[other]
        ),
        to: Math.max(
          source.absolutePosition[other] +
            snapped[other] +
            source.dimensions[size],
          target.absolutePosition[other] + target.dimensions[size]
        ),
      }
    }),
  }
}

/** Keep guides only where the constrained rendered geometry still aligns. */
export const resolveFlowAlignmentGuides = (
  graph: FlowGraphView,
  guides: readonly FlowAlignmentGuide[]
): readonly FlowAlignmentGuide[] =>
  guides.flatMap((guide) => {
    const source = graph.nodes.get(guide.sourceId)
    const target = graph.nodes.get(guide.targetId)

    if (
      source === undefined ||
      target === undefined ||
      source.hidden ||
      target.hidden
    ) {
      return []
    }

    const matches = (node: FlowGraphNode) =>
      anchors(node, guide.axis).some(
        (value) => Math.abs(value - guide.coordinate) < 0.000001
      )

    if (!matches(source) || !matches(target)) {
      return []
    }

    const other = guide.axis === 'x' ? 'y' : 'x'
    const size = other === 'x' ? 'width' : 'height'

    return [
      {
        ...guide,
        from: Math.min(
          source.absolutePosition[other],
          target.absolutePosition[other]
        ),
        to: Math.max(
          source.absolutePosition[other] + source.dimensions[size],
          target.absolutePosition[other] + target.dimensions[size]
        ),
      },
    ]
  })
