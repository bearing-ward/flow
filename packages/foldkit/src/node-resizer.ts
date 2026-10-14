import {
  FlowAttribute,
  FlowNodeResizeConstraintsSchema,
  FlowResizeControlDirectionSchema,
  flowResizeHandlePositions,
  flowResizeLinePositions,
  FlowResizeParamsSchema,
  FlowSpan,
  NodeIdSchema,
  NodeOriginSchema,
  NodeResizeDirectionSchema,
  PanExtentSchema,
  XYPositionSchema,
} from '@flow/core'
import type {
  FlowResizeControlDirection,
  FlowResizeControlPosition,
  FlowResizeControlVariant,
  FlowResizeParams,
  FlowResizeParamsWithDirection,
  FlowStyle,
} from '@flow/core'
import { Effect, Option, Schema } from 'effect'
import type { Html } from 'foldkit'

import { foldkitStyle } from './presentation.ts'

type ControlBuilder<Message> = Html.HtmlBuilder<Message>

/**
 * The serializable part of one resize control, carried from its DOM element
 * into the Runtime's resize session.
 */
export const ResizerControlSchema = Schema.Struct({
  resizerId: Schema.String,
  constraints: FlowNodeResizeConstraintsSchema,
  resizeDirection: Schema.optional(FlowResizeControlDirectionSchema),
})

export type ResizerControl = typeof ResizerControlSchema.Type

/** Schema for core's `FlowNodeResizeSession`, so it can live in the model. */
export const FlowNodeResizeSessionSchema = Schema.Struct({
  controlPosition: NodeResizeDirectionSchema,
  start: FlowResizeParamsSchema,
  previous: FlowResizeParamsSchema,
  constraints: FlowNodeResizeConstraintsSchema,
  nodeOrigin: NodeOriginSchema,
  resizeDirection: Schema.UndefinedOr(FlowResizeControlDirectionSchema),
  extent: Schema.UndefinedOr(PanExtentSchema),
  childExtent: Schema.UndefinedOr(PanExtentSchema),
  children: Schema.Array(
    Schema.Struct({ id: NodeIdSchema, position: XYPositionSchema })
  ),
  expandParent: Schema.Boolean,
})

/** React `ResizeParams` and `ResizeParamsWithDirection` callbacks. */
export interface FoldkitResizeCallbacks {
  /** React `shouldResize`: return false to skip this step. Runs synchronously. */
  readonly shouldResize?: (
    nodeId: string,
    params: FlowResizeParamsWithDirection
  ) => boolean
  readonly onResizeStart?: (nodeId: string, params: FlowResizeParams) => void
  readonly onResize?: (
    nodeId: string,
    params: FlowResizeParamsWithDirection
  ) => void
  readonly onResizeEnd?: (nodeId: string, params: FlowResizeParams) => void
}

interface ResizeControlBase extends FoldkitResizeCallbacks {
  readonly minWidth?: number
  readonly minHeight?: number
  readonly maxWidth?: number
  readonly maxHeight?: number
  readonly keepAspectRatio?: boolean
  readonly color?: string
  /** Scale handle controls by `max(1 / zoom, 1)`, as React. Defaults to true. */
  readonly autoScale?: boolean
}

/** React `NodeResizer` props for a Foldkit node view. */
export interface FoldkitNodeResizerOptions extends ResizeControlBase {
  /** Defaults to true; React examples pass the node's `selected`. */
  readonly isVisible?: boolean
  readonly handleClassName?: string
  readonly handleStyle?: FlowStyle
  readonly lineClassName?: string
  readonly lineStyle?: FlowStyle
}

/** React `NodeResizeControl` props for a Foldkit node view. */
export interface FoldkitNodeResizeControlOptions extends ResizeControlBase {
  /** Defaults to `bottom-right` for handles and `right` for lines. */
  readonly position?: FlowResizeControlPosition
  readonly variant?: FlowResizeControlVariant
  /** Restrict the control to one axis. */
  readonly resizeDirection?: FlowResizeControlDirection
  readonly className?: string
  readonly style?: FlowStyle
}

const callbacks = new Map<string, FoldkitResizeCallbacks>()

let resizerNumber = 0

const report = (callback: string, failure: Error): void => {
  Effect.runSync(
    Effect.logError('Foldkit node resizer callback failed').pipe(
      Effect.annotateLogs({
        [FlowAttribute.failureName]: failure.name,
        [FlowAttribute.failureMessage]: failure.message,
        [FlowAttribute.inputKind]: callback,
      }),
      Effect.withSpan(FlowSpan.editFailure)
    )
  )
}

/** React `shouldResize`; a throwing callback vetoes the step. */
export const resizerAllows = (
  resizerId: string,
  nodeId: string,
  params: FlowResizeParamsWithDirection
): boolean => {
  const shouldResize = callbacks.get(resizerId)?.shouldResize

  if (shouldResize === undefined) {
    return true
  }

  try {
    return shouldResize(nodeId, params)
  } catch (error) {
    report(
      'shouldResize',
      error instanceof Error ? error : new Error(String(error))
    )

    return false
  }
}

/** Run one lifecycle callback of a resizer, isolating its failures. */
export const notifyResizer = (
  resizerId: string,
  name: 'onResizeStart' | 'onResize' | 'onResizeEnd',
  nodeId: string,
  params: FlowResizeParams | FlowResizeParamsWithDirection
): void => {
  const registered = callbacks.get(resizerId)

  try {
    if (name === 'onResize') {
      registered?.onResize?.(nodeId, {
        direction: [0, 0],
        ...params,
      })
    } else {
      registered?.[name]?.(nodeId, params)
    }
  } catch (error) {
    report(name, error instanceof Error ? error : new Error(String(error)))
  }
}

const positionClasses = (position: FlowResizeControlPosition) =>
  position.split('-').map((part) => `flow-foldkit-resize-control-${part}`)

/** One resolved control: React `ResizeControl` props after defaults. */
interface ControlSpec {
  readonly position: FlowResizeControlPosition
  readonly variant: FlowResizeControlVariant
  readonly resizeDirection: FlowResizeControlDirection | undefined
  readonly className: string | undefined
  readonly style: FlowStyle | undefined
  readonly color: string | undefined
  readonly autoScale: boolean
  readonly constraints: typeof FlowNodeResizeConstraintsSchema.Type
}

/** The size constraints a resizer's options set, decoded once. */
const resizeConstraints = (
  options: ResizeControlBase
): typeof FlowNodeResizeConstraintsSchema.Type =>
  Schema.decodeUnknownSync(FlowNodeResizeConstraintsSchema)(
    Object.fromEntries(
      [
        ['minWidth', options.minWidth],
        ['minHeight', options.minHeight],
        ['maxWidth', options.maxWidth],
        ['maxHeight', options.maxHeight],
        ['keepAspectRatio', options.keepAspectRatio],
      ].filter(([, value]) => value !== undefined)
    )
  )

const controlStyle = (spec: ControlSpec, zoom: number) => {
  const style = foldkitStyle(spec.style)
  const handle = spec.variant === 'handle'

  // React scales handle controls by `max(1 / zoom, 1)` with `autoScale`.
  if (handle && spec.autoScale) {
    const scale = Math.max(1 / zoom, 1)

    if (scale !== 1) {
      style['scale'] = String(scale)
    }
  }

  if (spec.color !== undefined) {
    style[handle ? 'background-color' : 'border-color'] = spec.color
  }

  return style
}

const control = <Message>(
  h: ControlBuilder<Message>,
  resizerId: string,
  spec: ControlSpec,
  zoom: number
): Html.Html => {
  const style = controlStyle(spec, zoom)

  const attribute =
    spec.resizeDirection === undefined
      ? { constraints: spec.constraints }
      : { constraints: spec.constraints, resizeDirection: spec.resizeDirection }

  return h.div(
    [
      h.Class(
        [
          'flow-foldkit-resize-control',
          'flow-foldkit-nodrag',
          ...positionClasses(spec.position),
          `flow-foldkit-resize-control-${spec.variant}`,
          spec.className ?? '',
        ]
          .filter((name) => name !== '')
          .join(' ')
      ),
      h.DataAttribute('resize-direction', spec.position),
      h.DataAttribute('resizer-id', resizerId),
      h.DataAttribute('resizer', JSON.stringify(attribute)),
      h.DataAttribute('resize-variant', spec.variant),
      h.AriaLabel(`Resize from ${spec.position.replaceAll('-', ' ')}`),
      ...(Object.keys(style).length === 0 ? [] : [h.Style(style)]),
    ],
    []
  )
}

const ResizerAttributeSchema = Schema.fromJsonString(
  Schema.Struct({
    constraints: FlowNodeResizeConstraintsSchema,
    resizeDirection: Schema.optional(FlowResizeControlDirectionSchema),
  })
)

/** Read the resizer a pointer-down target belongs to, if any. */
export const readResizerControl = (
  element: HTMLElement | null
): ResizerControl | undefined => {
  const resizerId = element?.dataset.resizerId
  const encoded = element?.dataset.resizer

  if (resizerId === undefined || encoded === undefined) {
    return undefined
  }

  const decoded = Option.getOrUndefined(
    Schema.decodeUnknownOption(ResizerAttributeSchema)(encoded)
  )

  return decoded === undefined ? undefined : { resizerId, ...decoded }
}

export interface FoldkitNodeResizer {
  readonly id: string
  /**
   * The resize controls for one node view: lines on the four sides and
   * handles on the four corners, as React `NodeResizer`. Pass the view's
   * props so handles can scale with the zoom.
   */
  readonly view: <Message>(
    h: ControlBuilder<Message>,
    props: {
      readonly zoom: number
      /** React `isVisible` for this render, e.g. the node's `selected`. */
      readonly isVisible?: boolean
    }
  ) => readonly Html.Html[]
  /** Stop receiving callbacks. */
  readonly dispose: () => void
}

export interface FoldkitNodeResizeControl {
  readonly id: string
  /** One React `NodeResizeControl` for a node view. */
  readonly view: <Message>(
    h: ControlBuilder<Message>,
    props: { readonly zoom: number }
  ) => Html.Html
  readonly dispose: () => void
}

const register = (options: FoldkitResizeCallbacks): string => {
  resizerNumber += 1
  const id = `flow-foldkit-resizer-${resizerNumber}`
  callbacks.set(id, options)

  return id
}

/**
 * React `NodeResizer` for Foldkit node views. Create it once with its
 * options and callbacks, then call `view(h, props)` inside a node renderer.
 * Gestures run in the Runtime with the core resize session; the callbacks
 * run on the host after each published step.
 */
export const createFoldkitNodeResizer = (
  options: FoldkitNodeResizerOptions = {}
): FoldkitNodeResizer => {
  const id = register(options)
  const constraints = resizeConstraints(options)

  const spec = (
    position: FlowResizeControlPosition,
    variant: FlowResizeControlVariant
  ): ControlSpec => ({
    position,
    variant,
    resizeDirection: undefined,
    className:
      variant === 'line' ? options.lineClassName : options.handleClassName,
    style: variant === 'line' ? options.lineStyle : options.handleStyle,
    color: options.color,
    autoScale: options.autoScale !== false,
    constraints,
  })

  return {
    id,
    view: (h, props) =>
      (props.isVisible ?? options.isVisible) === false
        ? []
        : [
            ...flowResizeLinePositions.map((position) =>
              control(h, id, spec(position, 'line'), props.zoom)
            ),
            ...flowResizeHandlePositions.map((position) =>
              control(h, id, spec(position, 'handle'), props.zoom)
            ),
          ],
    dispose: () => {
      callbacks.delete(id)
    },
  }
}

/** React `NodeResizeControl`: one configurable control for a node view. */
export const createFoldkitNodeResizeControl = (
  options: FoldkitNodeResizeControlOptions = {}
): FoldkitNodeResizeControl => {
  const id = register(options)
  const variant = options.variant ?? 'handle'

  const spec: ControlSpec = {
    position:
      options.position ?? (variant === 'line' ? 'right' : 'bottom-right'),
    variant,
    resizeDirection: options.resizeDirection,
    className: options.className,
    style: options.style,
    color: options.color,
    autoScale: options.autoScale !== false,
    constraints: resizeConstraints(options),
  }

  return {
    id,
    view: (h, props) => control(h, id, spec, props.zoom),
    dispose: () => {
      callbacks.delete(id)
    },
  }
}
