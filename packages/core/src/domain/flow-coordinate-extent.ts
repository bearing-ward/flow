import { Schema as S, SchemaGetter as G } from 'effect'

import { PanExtentSchema } from './flow-pan-extent.schema.ts'
import type { PanExtent } from './flow-pan-extent.schema.ts'

/**
 * React Flow `CoordinateExtent`: `[[minX, minY], [maxX, maxY]]`. Bounds must
 * be finite; omit `nodeExtent`/`translateExtent` for an unbounded canvas.
 */
export const CoordinateExtentSchema = S.Tuple([
  S.Tuple([S.Finite, S.Finite]),
  S.Tuple([S.Finite, S.Finite]),
]).check(
  S.makeFilter(([[minX, minY], [maxX, maxY]]) =>
    minX <= maxX && minY <= maxY
      ? undefined
      : 'coordinate extent minimums must be less than or equal to maximums'
  )
)

export type CoordinateExtent = typeof CoordinateExtentSchema.Type

export const coordinateExtentToPanExtent = ([
  [minX, minY],
  [maxX, maxY],
]: CoordinateExtent): PanExtent => ({ minX, minY, maxX, maxY })

export const panExtentToCoordinateExtent = ({
  minX,
  minY,
  maxX,
  maxY,
}: PanExtent): CoordinateExtent => [
  [minX, minY],
  [maxX, maxY],
]

/**
 * Host option boundary for `nodeExtent` and `translateExtent`: accepts the
 * React tuple or the Flow `{ minX, minY, maxX, maxY }` record and decodes to
 * the record every core extent helper takes.
 */
export const FlowExtentInputSchema = S.Union([
  PanExtentSchema,
  CoordinateExtentSchema.pipe(
    S.decodeTo(PanExtentSchema, {
      decode: G.transform(coordinateExtentToPanExtent),
      encode: G.transform(panExtentToCoordinateExtent),
    })
  ),
])
