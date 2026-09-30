import { selectFlowMiniMapProjection } from '@flow/core'
import type { FlowGraphView } from '@flow/core'
import { computed, defineComponent, h, inject, useId } from 'vue'
import type { ComputedRef, InjectionKey, VNode } from 'vue'

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

/** Visible graph overview with pointer recentering and keyboard graph centering. */
export const FlowMiniMap = defineComponent({
  name: 'FlowMiniMap',
  setup() {
    const context = inject(FlowMiniMapContextKey)

    if (context === undefined) {
      throw new Error('FlowMiniMap must be rendered inside FlowCanvas')
    }

    const flow = useFlow()
    const titleId = `flow-vue-minimap-title-${useId()}`

    const view = computed(() => {
      const graph = context.graph.value

      return (
        selectFlowMiniMapProjection({
          graph,
          viewport: flow.viewport.value,
          canvas: context.canvasSize.value,
          size: { width, height },
        }) ?? null
      )
    })

    const recenter = (event: MouseEvent): void => {
      const current = view.value

      if (current === null) {
        return
      }

      // SAFETY: recenter is registered on the SVG root, so the listener currentTarget is that element.
      const rect = (
        event.currentTarget as SVGSVGElement
      ).getBoundingClientRect()

      const svgX = ((event.clientX - rect.left) / rect.width) * width

      const svgY = ((event.clientY - rect.top) / rect.height) * height
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
      recenter(event)
    }

    const onKeydown = (event: KeyboardEvent): void => {
      event.stopPropagation()

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        centerGraph()
      }
    }

    return () => {
      const current = view.value

      const label =
        current === null
          ? 'Mini map (empty graph)'
          : 'Mini map. Press Enter or Space to center the graph.'

      const elements: VNode[] = [
        h('title', { id: titleId }, label),
        h('rect', {
          class: 'flow-vue-minimap-background',
          x: 0,
          y: 0,
          width,
          height,
          rx: 4,
        }),
      ]

      if (current !== null) {
        for (const node of current.nodes) {
          elements.push(
            h('rect', {
              key: node.id,
              class: 'flow-vue-minimap-node',
              'data-minimap-node': node.id,
              x: node.x,
              y: node.y,
              width: node.width,
              height: node.height,
              rx: 2,
            })
          )
        }

        elements.push(
          h('rect', {
            class: 'flow-vue-minimap-viewport',
            'data-testid': 'flow-minimap-viewport',
            x: current.viewport.x,
            y: current.viewport.y,
            width: current.viewport.width,
            height: current.viewport.height,
          })
        )
      }

      return h(
        'svg',
        {
          class: 'flow-vue-minimap flow-vue-no-pan',
          width,
          height,
          viewBox: `0 0 ${width} ${height}`,
          role: current === null ? 'img' : 'button',
          tabindex: current === null ? undefined : 0,
          'aria-label': label,
          'aria-labelledby': titleId,
          onPointermove: stopCanvasEvent,
          onPointerdown: stopCanvasEvent,
          onPointerup: stopCanvasEvent,
          onPointercancel: stopCanvasEvent,
          onMousedown: stopCanvasEvent,
          onMouseup: stopCanvasEvent,
          onMousemove: stopCanvasEvent,
          onMouseenter: stopCanvasEvent,
          onMouseleave: stopCanvasEvent,
          onWheel: stopCanvasEvent,
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
