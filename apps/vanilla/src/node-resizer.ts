import {
  FlowNodeResizeConstraintsSchema,
  FlowResizeControlDirectionSchema,
  FlowResizeControlPositionSchema,
  FlowResizeControlVariantSchema,
  FlowStyleSchema,
  flowNodeResizeDefaults,
  flowResizeHandlePositions,
  flowResizeLinePositions,
} from '@flow/core'
import type {
  FlowResizeControlPosition,
  FlowResizeControlVariant,
  FlowResizeParams,
  FlowResizeParamsWithDirection,
} from '@flow/core'
import * as S from 'effect/Schema'

import type { FlowController } from './mount-flow.ts'
import type {
  FlowNodeResizerHandle,
  FlowNodeResizerRegistration,
  FlowResizeCallback,
  FlowResizeControlSpec,
} from './resize-controls.ts'

const ResizerOptionsSchema = S.Struct({
  ...FlowNodeResizeConstraintsSchema.fields,
  isVisible: S.optional(S.Boolean),
  autoScale: S.optional(S.Boolean),
  color: S.optional(S.String),
  handleClassName: S.optional(S.String),
  handleStyle: S.optional(FlowStyleSchema),
  lineClassName: S.optional(S.String),
  lineStyle: S.optional(FlowStyleSchema),
})

const ResizeControlOptionsSchema = S.Struct({
  ...FlowNodeResizeConstraintsSchema.fields,
  position: S.optional(FlowResizeControlPositionSchema),
  variant: S.optional(FlowResizeControlVariantSchema),
  resizeDirection: S.optional(FlowResizeControlDirectionSchema),
  autoScale: S.optional(S.Boolean),
  color: S.optional(S.String),
  className: S.optional(S.String),
  style: S.optional(FlowStyleSchema),
})

/** React `NodeResizer` callbacks with the pointer event and `ResizeParams`. */
export interface FlowNodeResizerCallbacks {
  /** Return `false` to skip this step; the gesture continues. */
  readonly shouldResize?:
    | ((event: PointerEvent, params: FlowResizeParamsWithDirection) => boolean)
    | undefined
  readonly onResizeStart?: FlowResizeCallback<FlowResizeParams> | undefined
  readonly onResize?:
    | FlowResizeCallback<FlowResizeParamsWithDirection>
    | undefined
  readonly onResizeEnd?: FlowResizeCallback<FlowResizeParams> | undefined
}

/** React `NodeResizerProps` without `nodeId`, which is an argument here. */
export type FlowNodeResizerOptions = typeof ResizerOptionsSchema.Encoded &
  FlowNodeResizerCallbacks

/** React `ResizeControlProps` without `nodeId`; `content` is its children. */
export type FlowNodeResizeControlOptions =
  typeof ResizeControlOptionsSchema.Encoded &
    FlowNodeResizerCallbacks & {
      readonly content?: HTMLElement | undefined
    }

export interface FlowNodeResizerMount<Options> {
  /** Replace the options, as re-rendering React's component with new props. */
  readonly update: (options: Options) => void
  readonly destroy: () => void
}

type ResizerHost = Pick<FlowController, 'registerNodeResizer'>

const callbacksOf = (
  options: FlowNodeResizerCallbacks
): Pick<
  FlowNodeResizerRegistration,
  'shouldResize' | 'onResizeStart' | 'onResize' | 'onResizeEnd'
> => ({
  shouldResize: options.shouldResize,
  onResizeStart: options.onResizeStart,
  onResize: options.onResize,
  onResizeEnd: options.onResizeEnd,
})

const constraintsOf = (
  options: typeof FlowNodeResizeConstraintsSchema.Type
): FlowNodeResizerRegistration['constraints'] => ({
  minWidth: options.minWidth ?? flowNodeResizeDefaults.minWidth,
  minHeight: options.minHeight ?? flowNodeResizeDefaults.minHeight,
  maxWidth: options.maxWidth ?? flowNodeResizeDefaults.maxWidth,
  maxHeight: options.maxHeight ?? flowNodeResizeDefaults.maxHeight,
  keepAspectRatio:
    options.keepAspectRatio ?? flowNodeResizeDefaults.keepAspectRatio,
})

const resizerRegistration = (
  input: FlowNodeResizerOptions
): FlowNodeResizerRegistration => {
  const options = S.decodeUnknownSync(ResizerOptionsSchema)(input)

  const control = (
    position: FlowResizeControlPosition,
    variant: FlowResizeControlVariant
  ): FlowResizeControlSpec => ({
    position,
    variant,
    color: options.color,
    className:
      variant === 'line' ? options.lineClassName : options.handleClassName,
    style: variant === 'line' ? options.lineStyle : options.handleStyle,
  })

  return {
    controls: [
      ...flowResizeLinePositions.map((position) => control(position, 'line')),
      ...flowResizeHandlePositions.map((position) =>
        control(position, 'handle')
      ),
    ],
    isVisible: options.isVisible ?? true,
    autoScale: options.autoScale ?? true,
    constraints: constraintsOf(options),
    ...callbacksOf(input),
  }
}

/** React's default control position per variant. */
const defaultControlPosition: Record<
  FlowResizeControlVariant,
  FlowResizeControlPosition
> = {
  line: 'right',
  handle: 'bottom-right',
}

const controlRegistration = (
  input: FlowNodeResizeControlOptions
): FlowNodeResizerRegistration => {
  const { content, ...rest } = input
  const options = S.decodeUnknownSync(ResizeControlOptionsSchema)(rest)
  const variant = options.variant ?? 'handle'

  return {
    controls: [
      {
        position: options.position ?? defaultControlPosition[variant],
        variant,
        className: options.className,
        style: options.style,
        color: options.color,
        content,
      },
    ],
    isVisible: true,
    autoScale: options.autoScale ?? true,
    constraints: constraintsOf(options),
    resizeDirection: options.resizeDirection,
    ...callbacksOf(input),
  }
}

const mountRegistration = <Options>(
  host: ResizerHost,
  nodeId: string,
  options: Options,
  toRegistration: (options: Options) => FlowNodeResizerRegistration
): FlowNodeResizerMount<Options> => {
  const handle: FlowNodeResizerHandle = host.registerNodeResizer(
    nodeId,
    toRegistration(options)
  )

  let destroyed = false

  return {
    update: (next) => {
      if (!destroyed) {
        handle.update(toRegistration(next))
      }
    },
    destroy: () => {
      if (!destroyed) {
        destroyed = true
        handle.remove()
      }
    },
  }
}

/**
 * React `<NodeResizer />` for one node: four line controls and four corner
 * handles with min/max size, aspect ratio, visibility, colors, classes,
 * styles and resize callbacks. While a node has a resizer, the canvas
 * `nodesResizable` controls are not shown for it.
 */
export const createFlowNodeResizer = (
  controller: ResizerHost,
  nodeId: string,
  options: FlowNodeResizerOptions = {}
): FlowNodeResizerMount<FlowNodeResizerOptions> =>
  mountRegistration(controller, nodeId, options, resizerRegistration)

/**
 * React `<NodeResizeControl />`: one line or handle control at `position`,
 * optionally limited to one axis by `resizeDirection`, with custom content.
 */
export const createFlowNodeResizeControl = (
  controller: ResizerHost,
  nodeId: string,
  options: FlowNodeResizeControlOptions = {}
): FlowNodeResizerMount<FlowNodeResizeControlOptions> =>
  mountRegistration(controller, nodeId, options, controlRegistration)
