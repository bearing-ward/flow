import {
  calculateFlowExpandParent,
  FlowAttribute,
  flowResizeHandlePositions,
  flowResizeLinePositions,
  FlowSpan,
  graphResizeChildExtent,
  nodeAnchorToTopLeft,
  NodeIdSchema,
  resolveNodeOrigin,
  snapPosition,
  startFlowNodeResize,
  stepFlowNodeResize,
} from '@flow/core'
import type {
  FlowChange,
  FlowGraphView,
  FlowNodeResizeConstraints,
  FlowNodeResizeSession,
  FlowNodeResizeStart,
  FlowResizeControlDirection,
  FlowResizeControlPosition,
  FlowResizeControlVariant,
  FlowResizeParams,
  FlowResizeParamsWithDirection,
  NodeExtent,
  NodeId,
  SnapGrid,
  XYPosition,
} from '@flow/core'
import { Effect } from 'effect'
import {
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  watch,
} from 'vue'
import type { InjectionKey, PropType, StyleValue } from 'vue'

import { useNodeId } from './use-flow.ts'

/** What a FlowCanvas lends the resizer components rendered inside its nodes. */
export interface FlowNodeResizerHost {
  /** Mark a node as rendering its own resizer; returns the release. */
  readonly register: (nodeId: string) => () => void
  /** The accepted graph with measured sizes. */
  readonly graph: () => FlowGraphView
  readonly zoom: () => number
  readonly pointerToFlow: (clientX: number, clientY: number) => XYPosition
  /** The grid while `snapToGrid` is on. */
  readonly snapGrid: () => SnapGrid | undefined
  /** Commit changes together, as one owner proposal or accepted state. */
  readonly publish: (changes: readonly FlowChange[]) => void
}

export const FlowNodeResizerRegistryKey: InjectionKey<FlowNodeResizerHost> =
  Symbol('FlowNodeResizerHost')

const recordResize = (
  message: string,
  span: string,
  nodeId: string,
  status: string
): void =>
  Effect.runSync(
    Effect.logDebug(message).pipe(
      Effect.annotateLogs({
        [FlowAttribute.nodeId]: nodeId,
        [FlowAttribute.inputKind]: 'resizer',
      }),
      Effect.withSpan(span, {
        attributes: {
          [FlowAttribute.nodeId]: nodeId,
          [FlowAttribute.inputKind]: 'resizer',
          [FlowAttribute.changeKind]: status,
        },
      })
    )
  )

/* eslint-disable anti-slop/require-safety-comment-for-type-assertion -- SAFETY: Vue requires PropType assertions to retain generic runtime prop contracts. */

/** Props shared by FlowNodeResizer and FlowNodeResizeControl (React `ResizeControlProps`). */
const sharedProps = {
  /** Defaults to the id of the custom node the control renders in. */
  nodeId: { type: String, default: undefined },
  color: { type: String, default: undefined },
  minWidth: { type: Number, default: 10 },
  minHeight: { type: Number, default: 10 },
  maxWidth: { type: Number, default: Number.MAX_VALUE },
  maxHeight: { type: Number, default: Number.MAX_VALUE },
  keepAspectRatio: { type: Boolean, default: false },
  /** Keep handle controls the same screen size at every zoom. */
  autoScale: { type: Boolean, default: true },
  /** Return false to skip a step; the gesture continues, as React. */
  shouldResize: {
    type: Function as PropType<
      (params: FlowResizeParamsWithDirection, event: PointerEvent) => boolean
    >,
    default: undefined,
  },
} as const

const resizeEmits = {
  resizeStart: (_params: FlowResizeParams, _event: PointerEvent) => true,
  resize: (_params: FlowResizeParamsWithDirection, _event: PointerEvent) =>
    true,
  resizeEnd: (_params: FlowResizeParams, _event: PointerEvent) => true,
}

const defaultPositions: Readonly<
  Record<FlowResizeControlVariant, FlowResizeControlPosition>
> = {
  line: 'right',
  handle: 'bottom-right',
}

interface ActiveResize {
  readonly pointerId: number
  readonly nodeId: NodeId
  readonly pointerStart: XYPosition
  session: FlowNodeResizeSession
}

/**
 * React Flow `NodeResizeControl`: one resize handle or line for the node it
 * renders in. Gestures follow React `XYResizer` through the core resize
 * session; each step commits the node bounds, as React does.
 */
export const FlowNodeResizeControl = defineComponent({
  name: 'FlowNodeResizeControl',
  inheritAttrs: false,
  props: {
    ...sharedProps,
    position: {
      type: String as PropType<FlowResizeControlPosition>,
      default: undefined,
    },
    variant: {
      type: String as PropType<FlowResizeControlVariant>,
      default: 'handle',
    },
    /** Restrict resizing to one axis. */
    resizeDirection: {
      type: String as PropType<FlowResizeControlDirection>,
      default: undefined,
    },
    className: { type: String, default: '' },
    style: { type: [String, Object, Array] as PropType<StyleValue> },
  },
  emits: resizeEmits,
  setup(props, { attrs, emit, slots }) {
    const host = inject(FlowNodeResizerRegistryKey, null)
    const contextNodeId = useNodeId()
    const id = computed(() => props.nodeId ?? contextNodeId)
    let release: (() => void) | undefined
    let active: ActiveResize | undefined

    if (host === null) {
      throw new Error(
        'FlowNodeResizeControl must be rendered inside a FlowCanvas node'
      )
    }

    watch(
      id,
      (nodeId) => {
        release?.()
        release = nodeId === undefined ? undefined : host.register(nodeId)
      },
      { immediate: true }
    )

    onBeforeUnmount(() => {
      release?.()
      active = undefined
    })

    const controlPosition = computed(
      () => props.position ?? defaultPositions[props.variant]
    )

    const constraints = computed((): FlowNodeResizeConstraints => ({
      minWidth: props.minWidth,
      minHeight: props.minHeight,
      maxWidth: props.maxWidth,
      maxHeight: props.maxHeight,
      keepAspectRatio: props.keepAspectRatio,
    }))

    /** React `getPointerPosition`: snapped to the grid while `snapToGrid` is on. */
    const pointer = (event: PointerEvent): XYPosition => {
      const position = host.pointerToFlow(event.clientX, event.clientY)
      const grid = host.snapGrid()

      return grid === undefined ? position : snapPosition(position, grid)
    }

    const start = (event: PointerEvent): void => {
      const nodeId = id.value

      if (event.button !== 0 || nodeId === undefined || active !== undefined) {
        return
      }

      const graph = host.graph()
      const node = graph.nodes.get(NodeIdSchema.make(nodeId))

      if (node === undefined) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      // SAFETY: the listener is bound on the control element.
      const element = event.currentTarget as HTMLElement
      element.setPointerCapture(event.pointerId)

      const parent =
        node.parentId === undefined ? undefined : graph.nodes.get(node.parentId)

      const extent: NodeExtent | undefined =
        node.node.extent === 'parent' && parent !== undefined
          ? {
              minX: 0,
              minY: 0,
              maxX: parent.dimensions.width,
              maxY: parent.dimensions.height,
            }
          : undefined

      const childExtent = graphResizeChildExtent(graph, node.id)

      const startInput: FlowNodeResizeStart = {
        controlPosition: controlPosition.value,
        start: { ...node.node.position, ...node.dimensions },
        constraints: constraints.value,
        nodeOrigin: resolveNodeOrigin(node.node, graph.document),
        children: (graph.children.get(node.id) ?? []).flatMap((childId) => {
          const child = graph.nodes.get(childId)

          return child === undefined
            ? []
            : [{ id: childId, position: child.node.position }]
        }),
        expandParent:
          node.parentId !== undefined && node.node.expandParent === true,
      }

      if (props.resizeDirection !== undefined) {
        Object.assign(startInput, { resizeDirection: props.resizeDirection })
      }

      if (extent !== undefined) {
        Object.assign(startInput, { extent })
      }

      if (childExtent !== undefined) {
        Object.assign(startInput, { childExtent })
      }

      const session = startFlowNodeResize(startInput)

      active = {
        pointerId: event.pointerId,
        nodeId: node.id,
        pointerStart: pointer(event),
        session,
      }

      recordResize(
        'Started Vue node resizer gesture',
        FlowSpan.nodeDragStart,
        node.id,
        'resize-start'
      )
      emit('resizeStart', session.previous, event)
    }

    /** Commit one step and, for `expandParent`, the parent growth. */
    const commit = (
      nodeId: NodeId,
      params: FlowResizeParamsWithDirection,
      proposed: XYPosition | undefined,
      childPositions: readonly { id: NodeId; position: XYPosition }[]
    ): void => {
      const graph = host.graph()
      const node = graph.nodes.get(nodeId)

      const own: FlowChange = {
        kind: 'node-bounds',
        nodeId,
        position: { x: params.x, y: params.y },
        size: { width: params.width, height: params.height },
        childPositions: childPositions.map((child) => ({
          nodeId: child.id,
          position: child.position,
        })),
      }

      const parentId = node?.parentId

      const parent =
        parentId === undefined || node?.node.expandParent !== true
          ? undefined
          : graph.nodes.get(parentId)

      if (
        node === undefined ||
        parentId === undefined ||
        parent === undefined
      ) {
        host.publish([own])

        return
      }

      const size = { width: params.width, height: params.height }

      const topLeft = nodeAnchorToTopLeft(
        proposed ?? params,
        size,
        resolveNodeOrigin(node.node, graph.document)
      )

      const changes = calculateFlowExpandParent(graph, [
        {
          id: nodeId,
          parentId,
          rect: {
            x: parent.absolutePosition.x + topLeft.x,
            y: parent.absolutePosition.y + topLeft.y,
            ...size,
          },
        },
      ])

      const parentPosition = changes.find(
        (change) => change.kind === 'position' && change.nodeId === parentId
      )

      const parentSize = changes.find(
        (change) => change.kind === 'size' && change.nodeId === parentId
      )

      if (parentPosition === undefined && parentSize === undefined) {
        host.publish([own])

        return
      }

      // The child and its parent growth commit together, so a controlled
      // owner receives one proposal holding both.
      host.publish([
        own,
        {
          kind: 'node-bounds',
          nodeId: parentId,
          position:
            parentPosition?.kind === 'position'
              ? parentPosition.position
              : parent.node.position,
          size:
            parentSize?.kind === 'size' ? parentSize.size : parent.dimensions,
          childPositions: changes.flatMap((change) =>
            change.kind === 'position' && change.nodeId !== parentId
              ? [{ nodeId: change.nodeId, position: change.position }]
              : []
          ),
        },
      ])
    }

    const move = (event: PointerEvent): void => {
      const current = active

      if (current?.pointerId !== event.pointerId) {
        return
      }

      event.stopPropagation()

      const point = pointer(event)

      const result = stepFlowNodeResize(current.session, {
        x: point.x - current.pointerStart.x,
        y: point.y - current.pointerStart.y,
      })

      if (result.step === undefined) {
        return
      }

      if (props.shouldResize?.(result.step.params, event) === false) {
        return
      }

      current.session = result.session

      commit(
        current.nodeId,
        result.step.params,
        result.step.position,
        result.step.childPositions
      )
      emit('resize', result.step.params, event)
    }

    const end = (event: PointerEvent): void => {
      const current = active

      if (current?.pointerId !== event.pointerId) {
        return
      }

      event.stopPropagation()
      active = undefined
      recordResize(
        'Finished Vue node resizer gesture',
        FlowSpan.nodeDragComplete,
        current.nodeId,
        event.type === 'pointerup' ? 'resize-end' : 'resize-cancel'
      )

      const { previous } = current.session

      emit(
        'resizeEnd',
        {
          x: previous.x,
          y: previous.y,
          width: previous.width,
          height: previous.height,
        },
        event
      )
    }

    return () => {
      const isHandle = props.variant === 'handle'

      const scale =
        isHandle && props.autoScale
          ? `${Math.max(1 / host.zoom(), 1)}`
          : undefined

      return h(
        'div',
        {
          ...attrs,
          class: [
            'flow-vue-resize-control',
            'flow-vue-no-drag',
            ...controlPosition.value.split('-'),
            props.variant,
            props.className,
            attrs.class,
          ],
          'data-flow-no-drag': '',
          'data-testid': 'flow-node-resize-control',
          'data-position': controlPosition.value,
          'data-variant': props.variant,
          style: [
            props.style,
            attrs.style,
            scale === undefined ? undefined : { scale },
            props.color === undefined
              ? undefined
              : { [isHandle ? 'backgroundColor' : 'borderColor']: props.color },
          ],
          onPointerdown: start,
          onPointermove: move,
          onPointerup: end,
          onPointercancel: end,
          onLostpointercapture: end,
          onClick: (event: MouseEvent) => event.stopPropagation(),
        },
        slots.default?.()
      )
    }
  },
})

/**
 * React Flow `NodeResizer`: four line controls and four handle controls
 * around the node it renders in, shown while `isVisible`.
 */
export const FlowNodeResizer = defineComponent({
  name: 'FlowNodeResizer',
  props: {
    ...sharedProps,
    isVisible: { type: Boolean, default: true },
    handleClassName: { type: String, default: '' },
    handleStyle: { type: [String, Object, Array] as PropType<StyleValue> },
    lineClassName: { type: String, default: '' },
    lineStyle: { type: [String, Object, Array] as PropType<StyleValue> },
  },
  emits: resizeEmits,
  setup(props, { emit }) {
    const host = inject(FlowNodeResizerRegistryKey, null)
    const contextNodeId = useNodeId()
    let release: (() => void) | undefined

    // A hidden resizer still owns its node, so the canvas switch stays off.
    watch(
      () => props.nodeId ?? contextNodeId,
      (nodeId) => {
        release?.()
        release =
          nodeId === undefined || host === null
            ? undefined
            : host.register(nodeId)
      },
      { immediate: true }
    )

    onBeforeUnmount(() => release?.())

    return () => {
      if (!props.isVisible) {
        return null
      }

      const shared = {
        minWidth: props.minWidth,
        minHeight: props.minHeight,
        maxWidth: props.maxWidth,
        maxHeight: props.maxHeight,
        keepAspectRatio: props.keepAspectRatio,
        autoScale: props.autoScale,
        onResizeStart: (params: FlowResizeParams, event: PointerEvent) =>
          emit('resizeStart', params, event),
        onResize: (
          params: FlowResizeParamsWithDirection,
          event: PointerEvent
        ) => emit('resize', params, event),
        onResizeEnd: (params: FlowResizeParams, event: PointerEvent) =>
          emit('resizeEnd', params, event),
      }

      if (props.nodeId !== undefined) {
        Object.assign(shared, { nodeId: props.nodeId })
      }

      if (props.color !== undefined) {
        Object.assign(shared, { color: props.color })
      }

      if (props.shouldResize !== undefined) {
        Object.assign(shared, { shouldResize: props.shouldResize })
      }

      return [
        ...flowResizeLinePositions.map((position) =>
          h(FlowNodeResizeControl, {
            ...shared,
            key: `line-${position}`,
            position,
            variant: 'line',
            className: props.lineClassName,
            style: props.lineStyle ?? '',
          })
        ),
        ...flowResizeHandlePositions.map((position) =>
          h(FlowNodeResizeControl, {
            ...shared,
            key: `handle-${position}`,
            position,
            variant: 'handle',
            className: props.handleClassName,
            style: props.handleStyle ?? '',
          })
        ),
      ]
    }
  },
})
