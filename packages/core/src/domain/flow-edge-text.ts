import type { XYPosition } from './flow.schema.ts'

export interface FlowEdgeTextBounds {
  /** Flow-space point the label is centered on. */
  readonly x: number
  readonly y: number
  /** Measured text box size, for example from SVG `getBBox`. */
  readonly width: number
  readonly height: number
}

export interface FlowEdgeTextLayout {
  /** Translation applied to the label group. */
  readonly translate: XYPosition
  /** Background rectangle in group coordinates. */
  readonly background: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
  /** Text baseline offset inside the group; renderers add `dy="0.3em"`. */
  readonly textY: number
  /** False until the text has been measured with a non-zero width. */
  readonly visible: boolean
}

/**
 * Lays out an edge label like xyflow's `EdgeText`: centered on the point,
 * with a background padded by `[horizontal, vertical]` (default `[2, 4]`).
 */
export const edgeTextLayout = (
  bounds: FlowEdgeTextBounds,
  padding: readonly [number, number] = [2, 4]
): FlowEdgeTextLayout => ({
  translate: {
    x: bounds.x - bounds.width / 2,
    y: bounds.y - bounds.height / 2,
  },
  background: {
    x: -padding[0],
    y: -padding[1],
    width: bounds.width + 2 * padding[0],
    height: bounds.height + 2 * padding[1],
  },
  textY: bounds.height / 2,
  visible: bounds.width > 0,
})
