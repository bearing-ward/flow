import { graphBounds } from './flow-graph.ts'
import type { FlowGraphView } from './flow-graph.ts'

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
  readonly nodes: readonly {
    readonly id: string
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }[]
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
}): FlowMiniMapProjection | undefined => {
  const bounds = graphBounds(input.graph)

  if (bounds === undefined || input.viewport.zoom <= 0) {
    return undefined
  }

  const inset = input.inset ?? 8
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
      .map((node) => ({
        id: node.id,
        x: pointX(node.absolutePosition.x),
        y: pointY(node.absolutePosition.y),
        width: Math.max(node.dimensions.width * scale, 1),
        height: Math.max(node.dimensions.height * scale, 1),
      })),
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
