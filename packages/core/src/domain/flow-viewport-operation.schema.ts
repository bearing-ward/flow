import { Schema as S } from 'effect'

import * as RuntimeSchema from './flow-runtime.schema.ts'

/** Flow-space rectangle used by fitBounds and getViewportForBounds. */
export const ViewportBoundsSchema = S.Struct({
  height: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
  width: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
  x: S.Finite,
  y: S.Finite,
})

export type ViewportBounds = typeof ViewportBoundsSchema.Type

// Pinned xyflow 0a1f9575, packages/system/src/utils/general.ts:196-259.
const paddingWithUnitSchema = S.Union([
  S.Finite,
  S.String.check(
    S.makeFilter((value) =>
      (value.endsWith('px') || value.endsWith('%')) &&
      // eslint-disable-next-line unicorn/prefer-number-coercion -- Pinned parseFloat reads a numeric prefix before the unit.
      Number.isFinite(Number.parseFloat(value))
        ? undefined
        : 'padding requires a finite number with px or % units'
    )
  ),
])

/** Upstream numeric padding, px/% strings, or sides with x/y fallbacks. */
export const ViewportPaddingSchema = S.Union([
  paddingWithUnitSchema,
  S.Struct({
    bottom: S.optional(paddingWithUnitSchema),
    left: S.optional(paddingWithUnitSchema),
    right: S.optional(paddingWithUnitSchema),
    top: S.optional(paddingWithUnitSchema),
    x: S.optional(paddingWithUnitSchema),
    y: S.optional(paddingWithUnitSchema),
  }),
])

export type ViewportPadding = typeof ViewportPaddingSchema.Type

export const ViewportAnimationOptionsSchema = S.Struct({
  duration: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  easing: S.optional(S.Literals(['linear', 'ease-in-out'])),
})

export type ViewportAnimationOptions =
  typeof ViewportAnimationOptionsSchema.Type

const easeInOut = (value: number): number =>
  value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2

/** Pure viewport interpolation; host adapters own frame scheduling. */
export const interpolateViewport = (
  from: RuntimeSchema.Viewport,
  to: RuntimeSchema.Viewport,
  progress: number,
  easing: NonNullable<ViewportAnimationOptions['easing']> = 'linear'
): RuntimeSchema.Viewport => {
  const boundedProgress = Math.min(1, Math.max(0, progress))

  const t =
    easing === 'ease-in-out' ? easeInOut(boundedProgress) : boundedProgress

  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    zoom: from.zoom + (to.zoom - from.zoom) * t,
  }
}

export const ViewportOperationStatusSchema = S.Literals([
  'accepted',
  'proposed',
  'unchanged',
  'rejected',
  'superseded',
  'disposed',
  'unavailable',
])

export type ViewportOperationStatus = typeof ViewportOperationStatusSchema.Type

/** Terminal operation result. A controlled host reports `proposed`, never `accepted`. */
export const ViewportOperationResultSchema = S.Struct({
  requestId: S.Finite.check(
    S.isGreaterThan(0),
    S.makeFilter((value) =>
      Number.isInteger(value) ? undefined : 'requestId must be an integer'
    )
  ),
  status: ViewportOperationStatusSchema,
  viewport: RuntimeSchema.ViewportSchema,
})

export type ViewportOperationResult = typeof ViewportOperationResultSchema.Type

export interface GetViewportForBoundsInput {
  readonly bounds: ViewportBounds
  readonly width: number
  readonly height: number
  readonly limits: typeof RuntimeSchema.ViewportLimitsSchema.Type
  readonly padding?: ViewportPadding | undefined
}

interface NormalizedViewportPadding {
  readonly bottom: number
  readonly left: number
  readonly right: number
  readonly top: number
}

// Preserve the pinned arithmetic and flooring, including numeric side values.
const paddingPixels = (
  padding: typeof paddingWithUnitSchema.Type,
  size: number
): number => {
  if (S.is(S.Finite)(padding)) {
    return Math.floor((size - size / (1 + padding)) * 0.5)
  }

  // eslint-disable-next-line unicorn/prefer-number-coercion -- Preserve pinned numeric-prefix parsing for px/% strings.
  const value = Number.parseFloat(padding)

  return padding.endsWith('px')
    ? Math.floor(value)
    : Math.floor(size * value * 0.01)
}

const normalizePadding = (
  padding: ViewportPadding,
  width: number,
  height: number
): NormalizedViewportPadding => {
  if (S.is(S.Finite)(padding) || S.is(S.String)(padding)) {
    return {
      bottom: paddingPixels(padding, height),
      left: paddingPixels(padding, width),
      right: paddingPixels(padding, width),
      top: paddingPixels(padding, height),
    }
  }

  return {
    bottom: paddingPixels(padding.bottom ?? padding.y ?? 0, height),
    left: paddingPixels(padding.left ?? padding.x ?? 0, width),
    right: paddingPixels(padding.right ?? padding.x ?? 0, width),
    top: paddingPixels(padding.top ?? padding.y ?? 0, height),
  }
}

/**
 * Calculate the pinned xyflow viewport, including asymmetric padding correction.
 * Invalid/empty panes and zero-area bounds have no viewport result.
 */
export const getViewportForBounds = ({
  bounds,
  width,
  height,
  limits,
  padding = 0.1,
}: GetViewportForBoundsInput): RuntimeSchema.Viewport | undefined => {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(bounds.x) ||
    !Number.isFinite(bounds.y) ||
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    width <= 0 ||
    height <= 0 ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    return undefined
  }

  const p = normalizePadding(padding, width, height)
  const usableWidth = width - (p.left + p.right)
  const usableHeight = height - (p.top + p.bottom)

  const zoom = Math.min(
    limits.maxZoom,
    Math.max(
      limits.minZoom,
      Math.min(usableWidth / bounds.width, usableHeight / bounds.height)
    )
  )

  const x = width / 2 - (bounds.x + bounds.width / 2) * zoom
  const y = height / 2 - (bounds.y + bounds.height / 2) * zoom

  const actual = {
    bottom: Math.floor(height - ((bounds.y + bounds.height) * zoom + y)),
    left: Math.floor(bounds.x * zoom + x),
    right: Math.floor(width - ((bounds.x + bounds.width) * zoom + x)),
    top: Math.floor(bounds.y * zoom + y),
  }

  const offset = {
    bottom: Math.min(actual.bottom - p.bottom, 0),
    left: Math.min(actual.left - p.left, 0),
    right: Math.min(actual.right - p.right, 0),
    top: Math.min(actual.top - p.top, 0),
  }

  return {
    x: x - offset.left + offset.right,
    y: y - offset.top + offset.bottom,
    zoom,
  }
}
