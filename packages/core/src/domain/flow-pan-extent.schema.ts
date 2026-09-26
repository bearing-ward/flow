import { Schema as S } from 'effect'

import type { Viewport } from './flow-runtime.schema.ts'

export const PanExtentSchema = S.Struct({
  minX: S.Finite,
  minY: S.Finite,
  maxX: S.Finite,
  maxY: S.Finite,
}).check(
  S.makeFilter((extent) =>
    extent.minX <= extent.maxX && extent.minY <= extent.maxY
      ? undefined
      : 'pan extent minimums must be less than or equal to maximums'
  )
)

export type PanExtent = typeof PanExtentSchema.Type

const constrainAxis = (
  translation: number,
  minimum: number,
  maximum: number,
  zoom: number,
  screenSize: number
): number => {
  const lowerTranslation = screenSize - maximum * zoom
  const upperTranslation = minimum === 0 ? 0 : -minimum * zoom

  if (lowerTranslation > upperTranslation) {
    return (lowerTranslation + upperTranslation) / 2
  }

  return Math.min(upperTranslation, Math.max(lowerTranslation, translation))
}

/** Keep the visible flow-space rectangle inside an extent at the given zoom. */
export const constrainViewportToExtent = (
  viewport: Viewport,
  extent: PanExtent,
  screenWidth: number,
  screenHeight: number
): Viewport => ({
  x: constrainAxis(
    viewport.x,
    extent.minX,
    extent.maxX,
    viewport.zoom,
    screenWidth
  ),
  y: constrainAxis(
    viewport.y,
    extent.minY,
    extent.maxY,
    viewport.zoom,
    screenHeight
  ),
  zoom: viewport.zoom,
})
