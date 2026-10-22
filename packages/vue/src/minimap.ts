import {
  flowMiniMapDefaults,
  flowMiniMapPanViewport,
  flowMiniMapWheelZoom,
  flowPanelPlacement,
  selectFlowMiniMapProjection,
} from '@flow/core'
import type {
  FlowGraphView,
  FlowMiniMapNodeAttribute,
  FlowMiniMapNodeProps,
  FlowPanelPosition,
} from '@flow/core'
import { computed, defineComponent, h, inject, useId } from 'vue'
import type {
  Component,
  ComputedRef,
  InjectionKey,
  PropType,
  SlotsType,
  StyleValue,
  VNode,
} from 'vue'

import { flowVueStyle } from './canvas-presentation.ts'
import { useFlow } from './use-flow.ts'

interface FlowMiniMapContext {
  readonly graph: ComputedRef<FlowGraphView>
  readonly canvasSize: ComputedRef<{
    readonly width: number
    readonly height: number
  }>
}

export const FlowMiniMapContextKey: InjectionKey<FlowMiniMapContext> =
  Symbol('FlowMiniMapContext')

const width = 180

const height = 120

const stopCanvasEvent = (event: Event): void => {
  event.stopPropagation()
}

const isMac = (): boolean =>
  globalThis.navigator?.userAgent.includes('Mac') === true

/** Client pixels to minimap units. */
const svgScale = (element: Element) => {
  const rect = element.getBoundingClientRect()

  return {
    x: rect.width === 0 ? 1 : width / rect.width,
    y: rect.height === 0 ? 1 : height / rect.height,
  }
}

/** React `MiniMapNode`: the default rectangle for one projected node. */
const renderMiniMapNode = (node: FlowMiniMapNodeProps): VNode =>
  h('rect', {
    key: node.id,
    class: [
      'flow-vue-minimap-node',
      { selected: node.selected },
      node.className,
    ],
    'data-minimap-node': node.id,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    rx: node.borderRadius,
    ry: node.borderRadius,
    style: [
      flowVueStyle(node.style),
      node.fill === undefined ? undefined : { fill: node.fill },
      node.strokeColor === undefined ? undefined : { stroke: node.strokeColor },
      node.strokeWidth === undefined
        ? undefined
        : { strokeWidth: node.strokeWidth },
    ],
  })

/* eslint-disable anti-slop/require-safety-comment-for-type-assertion -- SAFETY: Vue requires PropType assertions to retain generic runtime prop contracts. */

const nodeAttributeProp = {
  type: [String, Function] as PropType<FlowMiniMapNodeAttribute>,
  default: undefined,
} as const

/**
 * React Flow `MiniMap`: a graph overview with React's node colour, stroke,
 * class, mask and placement options, optional drag panning and wheel
 * zooming, pointer recentering and keyboard graph centering. A `node` slot
 * or `nodeComponent` draws custom nodes from `FlowMiniMapNodeProps`.
 */
export const FlowMiniMap = defineComponent({
  name: 'FlowMiniMap',
  inheritAttrs: false,
  props: {
    nodeColor: nodeAttributeProp,
    nodeStrokeColor: nodeAttributeProp,
    nodeClassName: nodeAttributeProp,
    nodeBorderRadius: {
      type: Number,
      default: flowMiniMapDefaults.nodeBorderRadius,
    },
    nodeStrokeWidth: { type: Number, default: undefined },
    /** Custom node renderer; receives `FlowMiniMapNodeProps`. */
    nodeComponent: {
      type: [Object, Function] as PropType<Component>,
      default: undefined,
    },
    bgColor: { type: String, default: undefined },
    maskColor: { type: String, default: undefined },
    maskStrokeColor: { type: String, default: undefined },
    maskStrokeWidth: { type: Number, default: undefined },
    position: {
      type: String as PropType<FlowPanelPosition>,
      default: flowMiniMapDefaults.position,
    },
    pannable: { type: Boolean, default: flowMiniMapDefaults.pannable },
    zoomable: { type: Boolean, default: flowMiniMapDefaults.zoomable },
    inversePan: { type: Boolean, default: flowMiniMapDefaults.inversePan },
    zoomStep: { type: Number, default: flowMiniMapDefaults.zoomStep },
    /** Accessible title; `null` removes it. Defaults to `ariaLabelConfig`. */
    ariaLabel: {
      type: [String, null] as PropType<string | null>,
      default: undefined,
    },
    className: { type: String, default: '' },
    style: { type: [String, Object, Array] as PropType<StyleValue> },
  },
  slots: Object as SlotsType<{ node: FlowMiniMapNodeProps }>,
  setup(props, { attrs, slots }) {
    const context = inject(FlowMiniMapContextKey)

    if (context === undefined) {
      throw new Error('FlowMiniMap must be rendered inside FlowCanvas')
    }

    const flow = useFlow()
    const titleId = `flow-vue-minimap-title-${useId()}`

    let pan: {
      pointerId: number
      x: number
      y: number
      moved: boolean
    } | null = null

    let suppressClick = false

    const projectionOptions = () => {
      const options = { nodeBorderRadius: props.nodeBorderRadius }

      if (props.nodeColor !== undefined) {
        Object.assign(options, { nodeColor: props.nodeColor })
      }

      if (props.nodeStrokeColor !== undefined) {
        Object.assign(options, { nodeStrokeColor: props.nodeStrokeColor })
      }

      if (props.nodeClassName !== undefined) {
        Object.assign(options, { nodeClassName: props.nodeClassName })
      }

      if (props.nodeStrokeWidth !== undefined) {
        Object.assign(options, { nodeStrokeWidth: props.nodeStrokeWidth })
      }

      return options
    }

    const view = computed(() => {
      const graph = context.graph.value

      return (
        selectFlowMiniMapProjection({
          graph,
          viewport: flow.viewport.value,
          canvas: context.canvasSize.value,
          size: { width, height },
          options: projectionOptions(),
        }) ?? null
      )
    })

    const recenter = (event: MouseEvent): void => {
      const current = view.value

      if (current === null || !(event.currentTarget instanceof Element)) {
        return
      }

      const rect = event.currentTarget.getBoundingClientRect()
      const scale = svgScale(event.currentTarget)
      const svgX = (event.clientX - rect.left) * scale.x
      const svgY = (event.clientY - rect.top) * scale.y
      const point = current.pointToGraph({ x: svgX, y: svgY })
      void flow.setCenter(point.x, point.y)
    }

    const centerGraph = (): void => {
      const center = view.value?.graphCenter

      if (center !== undefined) {
        void flow.setCenter(center.x, center.y)
      }
    }

    const onClick = (event: MouseEvent): void => {
      event.stopPropagation()

      if (suppressClick) {
        suppressClick = false

        return
      }

      recenter(event)
    }

    const onKeydown = (event: KeyboardEvent): void => {
      event.stopPropagation()

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        centerGraph()
      }
    }

    const onPointerdown = (event: PointerEvent): void => {
      event.stopPropagation()

      if (!props.pannable || event.button !== 0 || view.value === null) {
        return
      }

      if (event.currentTarget instanceof Element) {
        event.currentTarget.setPointerCapture(event.pointerId)
      }

      pan = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      }
    }

    /** React `XYMinimap` drag pan. */
    const onPointermove = (event: PointerEvent): void => {
      event.stopPropagation()

      const current = view.value

      if (
        pan?.pointerId !== event.pointerId ||
        current === null ||
        !(event.currentTarget instanceof Element)
      ) {
        return
      }

      const scale = svgScale(event.currentTarget)

      const delta = {
        x: (event.clientX - pan.x) * scale.x,
        y: (event.clientY - pan.y) * scale.y,
      }

      if (delta.x === 0 && delta.y === 0) {
        return
      }

      pan = { ...pan, x: event.clientX, y: event.clientY, moved: true }
      flow.updateViewport(
        flowMiniMapPanViewport({
          viewport: flow.getViewport(),
          delta,
          scale: current.scale,
          inversePan: props.inversePan,
        })
      )
    }

    const onPointerup = (event: PointerEvent): void => {
      event.stopPropagation()

      if (pan?.pointerId === event.pointerId) {
        suppressClick = pan.moved
        pan = null
      }
    }

    /** React `XYMinimap` wheel zoom around the pane centre. */
    const onWheel = (event: WheelEvent): void => {
      event.stopPropagation()

      if (!props.zoomable) {
        return
      }

      event.preventDefault()

      const limits = flow.getViewportLimits()

      const zoom = flowMiniMapWheelZoom({
        zoom: flow.getZoom(),
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
        zoomStep: props.zoomStep,
        macPinch: event.ctrlKey && isMac(),
      })

      void flow.zoomTo(Math.min(limits.maxZoom, Math.max(limits.minZoom, zoom)))
    }

    return () => {
      const current = view.value

      const title =
        props.ariaLabel === undefined
          ? flow.ariaLabelConfig.value['minimap.ariaLabel']
          : props.ariaLabel

      let label: string | undefined

      if (title !== null) {
        label =
          current === null
            ? `${title} (empty graph)`
            : `${title}. Press Enter or Space to center the graph.`
      }

      const viewBox = current?.viewBox ?? { x: 0, y: 0, width, height }

      const elements: VNode[] = [
        ...(title === null ? [] : [h('title', { id: titleId }, label)]),
        h('rect', {
          class: 'flow-vue-minimap-background',
          x: viewBox.x,
          y: viewBox.y,
          width: viewBox.width,
          height: viewBox.height,
          rx: 4,
          style:
            props.bgColor === undefined ? undefined : { fill: props.bgColor },
        }),
      ]

      if (current !== null) {
        for (const node of current.nodes) {
          if (slots.node !== undefined) {
            elements.push(...slots.node(node))
          } else if (props.nodeComponent === undefined) {
            elements.push(renderMiniMapNode(node))
          } else {
            elements.push(h(props.nodeComponent, { key: node.id, ...node }))
          }
        }

        const box = current.viewport

        elements.push(
          h('path', {
            class: 'flow-vue-minimap-mask',
            'data-testid': 'flow-minimap-mask',
            d: current.maskPath,
            style: [
              props.maskColor === undefined
                ? undefined
                : { fill: props.maskColor },
              props.maskStrokeColor === undefined
                ? undefined
                : { stroke: props.maskStrokeColor },
              props.maskStrokeWidth === undefined
                ? undefined
                : { strokeWidth: props.maskStrokeWidth },
            ],
          }),
          h('rect', {
            class: 'flow-vue-minimap-viewport',
            'data-testid': 'flow-minimap-viewport',
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
          })
        )
      }

      const placement = flowPanelPlacement(props.position)

      return h(
        'svg',
        {
          ...attrs,
          class: [
            'flow-vue-minimap',
            'flow-vue-no-pan',
            ...placement.classNames,
            { pannable: props.pannable, zoomable: props.zoomable },
            props.className,
            attrs.class,
          ],
          style: [
            {
              top: 'auto',
              right: 'auto',
              bottom: 'auto',
              left: 'auto',
              ...placement.style,
            },
            props.bgColor === undefined ? {} : { background: props.bgColor },
            props.style,
            attrs.style,
          ],
          'data-position': props.position,
          width,
          height,
          viewBox: `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
          role: current === null ? 'img' : 'button',
          tabindex: current === null ? undefined : 0,
          'aria-label': label,
          onPointermove,
          onPointerdown,
          onPointerup,
          onPointercancel: onPointerup,
          onMousedown: stopCanvasEvent,
          onMouseup: stopCanvasEvent,
          onMousemove: stopCanvasEvent,
          onMouseenter: stopCanvasEvent,
          onMouseleave: stopCanvasEvent,
          onWheel,
          onContextmenu: stopCanvasEvent,
          onDblclick: stopCanvasEvent,
          onClick,
          onKeydown: current === null ? undefined : onKeydown,
        },
        elements
      )
    }
  },
})
