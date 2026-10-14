import { Predicate, Schema as S } from 'effect'

import { graphBounds } from './flow-graph.ts'
import type { FlowGraphView } from './flow-graph.ts'
import { FlowPanelPositionSchema } from './flow-panel-position.ts'
import type { FlowStyle } from './flow-style.schema.ts'
import type { FlowNode } from './flow.schema.ts'

/** React `GetMiniMapNodeAttribute`: a constant or a per-node function. */
export type FlowMiniMapNodeAttribute =
  | string
  | ((node: FlowNode) => string | undefined)

/**
 * Serializable React `MiniMapProps` subset. Function-valued node attributes
 * and the custom node renderer are host-typed (`FlowMiniMapOptions`).
 */
export const FlowMiniMapOptionsSchema = S.Struct({
  nodeColor: S.optional(S.String),
  nodeStrokeColor: S.optional(S.String),
  nodeClassName: S.optional(S.String),
  nodeBorderRadius: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  nodeStrokeWidth: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  bgColor: S.optional(S.String),
  maskColor: S.optional(S.String),
  maskStrokeColor: S.optional(S.String),
  maskStrokeWidth: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  position: S.optional(FlowPanelPositionSchema),
  pannable: S.optional(S.Boolean),
  zoomable: S.optional(S.Boolean),
  inversePan: S.optional(S.Boolean),
  zoomStep: S.optional(S.Finite.check(S.isGreaterThan(0))),
  /** `null` removes the accessible title, as React. */
  ariaLabel: S.optional(S.NullOr(S.String)),
})

export type FlowMiniMapOptions = Omit<
  typeof FlowMiniMapOptionsSchema.Type,
  'nodeColor' | 'nodeStrokeColor' | 'nodeClassName'
> & {
  readonly nodeColor?: FlowMiniMapNodeAttribute
  readonly nodeStrokeColor?: FlowMiniMapNodeAttribute
  readonly nodeClassName?: FlowMiniMapNodeAttribute
}

/** React MiniMap defaults. */
export const flowMiniMapDefaults = {
  nodeBorderRadius: 5,
  position: 'bottom-right',
  pannable: false,
  zoomable: false,
  inversePan: false,
  zoomStep: 1,
} as const

/**
 * React `MiniMapNodeProps` without the event handler: what a custom minimap
 * node renderer receives, in minimap pixel coordinates.
 */
export interface FlowMiniMapNodeProps {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly borderRadius: number
  readonly className: string
  /** Resolved `nodeColor`; undefined means the theme default. */
  readonly color: string | undefined
  /** React's rendered fill: `color`, then `style.background`, then `style.backgroundColor`. */
  readonly fill: string | undefined
  readonly strokeColor: string | undefined
  readonly strokeWidth: number | undefined
  readonly style: FlowStyle | undefined
  readonly selected: boolean
}

const nodeAttribute = (
  attribute: FlowMiniMapNodeAttribute | undefined,
  node: FlowNode
): string | undefined => {
  if (attribute === undefined || Predicate.isString(attribute)) {
    return attribute
  }

  return attribute(node)
}

const styleText = (
  style: FlowStyle | undefined,
  key: string
): string | undefined => {
  const value = style?.[key]

  return value === undefined || value === '' ? undefined : String(value)
}

export interface FlowMiniMapSize {
  readonly width: number
  readonly height: number
}

export interface FlowMiniMapViewport {
  readonly x: number
  readonly y: number
  readonly zoom: number
}

export interface FlowMiniMapProjection {
  readonly bounds: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
  /** Visible nodes with React `MiniMapNodeProps` presentation. */
  readonly nodes: readonly FlowMiniMapNodeProps[]
  readonly viewport: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
  readonly scale: number
  readonly offsetX: number
  readonly offsetY: number
  readonly pointToGraph: (point: {
    readonly x: number
    readonly y: number
  }) => { readonly x: number; readonly y: number }
  readonly graphCenter: { readonly x: number; readonly y: number }
}

/** Project one accepted aggregate graph and viewport into bounded minimap coordinates. */
export const selectFlowMiniMapProjection = (input: {
  readonly graph: FlowGraphView
  readonly viewport: FlowMiniMapViewport
  readonly canvas: FlowMiniMapSize
  readonly size: FlowMiniMapSize
  readonly inset?: number
  /** Node presentation options; omitted values use React defaults. */
  readonly options?: Pick<
    FlowMiniMapOptions,
    | 'nodeColor'
    | 'nodeStrokeColor'
    | 'nodeClassName'
    | 'nodeBorderRadius'
    | 'nodeStrokeWidth'
  >
}): FlowMiniMapProjection | undefined => {
  const bounds = graphBounds(input.graph)

  if (bounds === undefined || input.viewport.zoom <= 0) {
    return undefined
  }

  const inset = input.inset ?? 8
  const options = input.options ?? {}
  const graphWidth = Math.max(bounds.width, 1)
  const graphHeight = Math.max(bounds.height, 1)

  const scale = Math.min(
    (input.size.width - inset * 2) / graphWidth,
    (input.size.height - inset * 2) / graphHeight
  )

  const renderedWidth = graphWidth * scale
  const renderedHeight = graphHeight * scale
  const offsetX = (input.size.width - renderedWidth) / 2
  const offsetY = (input.size.height - renderedHeight) / 2
  const pointX = (x: number): number => offsetX + (x - bounds.x) * scale
  const pointY = (y: number): number => offsetY + (y - bounds.y) * scale

  return {
    bounds,
    nodes: input.graph.orderedNodes
      .filter((node) => !node.hidden)
      .map((node) => {
        const color = nodeAttribute(options.nodeColor, node.node)
        const { style } = node.node

        return {
          id: node.id,
          x: pointX(node.absolutePosition.x),
          y: pointY(node.absolutePosition.y),
          width: Math.max(node.dimensions.width * scale, 1),
          height: Math.max(node.dimensions.height * scale, 1),
          borderRadius:
            options.nodeBorderRadius ?? flowMiniMapDefaults.nodeBorderRadius,
          className: nodeAttribute(options.nodeClassName, node.node) ?? '',
          color,
          fill:
            color ??
            styleText(style, 'background') ??
            styleText(style, 'backgroundColor'),
          strokeColor: nodeAttribute(options.nodeStrokeColor, node.node),
          strokeWidth: options.nodeStrokeWidth,
          style,
          selected: node.node.selected === true,
        }
      }),
    viewport: {
      x: pointX(-input.viewport.x / input.viewport.zoom),
      y: pointY(-input.viewport.y / input.viewport.zoom),
      width: (input.canvas.width / input.viewport.zoom) * scale,
      height: (input.canvas.height / input.viewport.zoom) * scale,
    },
    scale,
    offsetX,
    offsetY,
    pointToGraph: (point) => ({
      x: bounds.x + (point.x - offsetX) / scale,
      y: bounds.y + (point.y - offsetY) / scale,
    }),
    graphCenter: {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    },
  }
}

/**
 * React `XYMinimap` drag pan: the viewport translation after the pointer
 * moved `delta` minimap pixels. `scale` is the projection scale (minimap
 * pixels per flow unit). Hosts constrain the result to `translateExtent`.
 */
export const flowMiniMapPanViewport = (input: {
  readonly viewport: FlowMiniMapViewport
  readonly delta: { readonly x: number; readonly y: number }
  readonly scale: number
  readonly inversePan?: boolean
}): FlowMiniMapViewport => {
  const { zoom } = input.viewport

  const moveScale =
    (1 / input.scale) *
    Math.max(zoom, Math.log(zoom)) *
    (input.inversePan === true ? -1 : 1)

  return {
    x: input.viewport.x - input.delta.x * moveScale,
    y: input.viewport.y - input.delta.y * moveScale,
    zoom,
  }
}

/**
 * React `XYMinimap` wheel zoom: the next zoom for one wheel event. Hosts
 * zoom around the pane center and clamp to the zoom limits.
 */
export const flowMiniMapWheelZoom = (input: {
  readonly zoom: number
  readonly deltaY: number
  /** `WheelEvent.deltaMode`: 0 pixels, 1 lines, 2 pages. */
  readonly deltaMode: number
  readonly zoomStep?: number
  /** Pinch on macOS (ctrl+wheel) zooms ten times faster, as React. */
  readonly macPinch?: boolean
}): number => {
  let modeFactor = 0.002

  if (input.deltaMode === 1) {
    modeFactor = 0.05
  } else if (input.deltaMode !== 0) {
    modeFactor = 1
  }

  const pinchDelta =
    -input.deltaY *
    modeFactor *
    (input.zoomStep ?? flowMiniMapDefaults.zoomStep)

  return input.zoom * 2 ** (pinchDelta * (input.macPinch === true ? 10 : 1))
}
