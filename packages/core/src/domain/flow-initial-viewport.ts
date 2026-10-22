import { Effect, Schema as S } from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import { clampViewport, ViewportLimitsSchema } from './flow-runtime.schema.ts'

const InitialViewportSchema = S.Struct({
  x: S.Finite,
  y: S.Finite,
  zoom: S.Finite,
})

const decodeUnknownInitialViewport = S.decodeUnknownEffect(
  InitialViewportSchema
)

const decodeUnknownViewportLimits = S.decodeUnknownEffect(ViewportLimitsSchema)

type InitialViewportInput = Parameters<typeof decodeUnknownInitialViewport>[0]

type ViewportLimitsInput = Parameters<typeof decodeUnknownViewportLimits>[0]

/** Clamp finite mount input before it enters positive-zoom runtime state. */
export const decodeInitialViewport = (
  input: InitialViewportInput,
  limits: ViewportLimitsInput
) =>
  Effect.gen(function* decodeInitialViewportInput() {
    const viewport = yield* decodeUnknownInitialViewport(input)

    const decodedLimits = yield* decodeUnknownViewportLimits(limits)

    const clamped = clampViewport(viewport, decodedLimits)

    yield* Effect.logDebug('Decoded initial viewport').pipe(
      Effect.annotateLogs({
        [FlowAttribute.viewportZoom]: clamped.zoom,
        [FlowAttribute.viewportZoomClamped]: viewport.zoom !== clamped.zoom,
      })
    )

    return clamped
  }).pipe(
    Effect.tapError((issue) =>
      Effect.logWarning('Initial viewport decode failed', issue).pipe(
        Effect.annotateLogs({ [FlowAttribute.failureName]: issue._tag })
      )
    ),
    Effect.withSpan(FlowSpan.hostMount)
  )
