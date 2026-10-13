import {
  getBezierPath,
  getFloatingConnectionStart,
  getFloatingEdgeParams,
  getSimpleFloatingEdgeParams,
  getStraightPath,
} from '@flow/core'
import type { FlowEdge, FlowHandle } from '@flow/core'
import { FlowBaseEdge, FlowEdgeLabelRenderer, useFlow } from '@flow/vue'
import type { FlowNodeBounds, FlowPosition } from '@flow/vue'
import { Schema as S } from 'effect'
import { computed, defineComponent, h, onBeforeUnmount, ref, useId } from 'vue'
import type { PropType, VNode } from 'vue'

// SAFETY: FlowCanvas supplies side literals from accepted handles.
const sideProp = {
  type: String as PropType<FlowPosition>,
  required: true,
} as const

// SAFETY: FlowCanvas supplies resolved node bounds for both edge endpoints.
const boundsProp = {
  type: Object as PropType<FlowNodeBounds>,
  required: true,
} as const

/** The React Flow `EdgeProps` subset these recipes read. */
const edgeProps = {
  id: { type: String, required: true },
  sourceX: { type: Number, required: true },
  sourceY: { type: Number, required: true },
  targetX: { type: Number, required: true },
  targetY: { type: Number, required: true },
  sourcePosition: sideProp,
  targetPosition: sideProp,
  sourceNode: boundsProp,
  targetNode: boundsProp,
  // SAFETY: FlowCanvas forwards the accepted edge's JSON data, or undefined.
  data: { type: Object as PropType<FlowEdge['data']>, default: undefined },
  markerStart: { type: String, default: undefined },
  markerEnd: { type: String, default: undefined },
} as const

const labelStyle = (x: number, y: number) => ({
  position: 'absolute',
  transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
  pointerEvents: 'all',
})

/** UI "Edge with Button": a bezier BaseEdge with an HTML delete button at its midpoint. */
export const ButtonEdge = defineComponent({
  name: 'RecipeButtonEdge',
  inheritAttrs: false,
  props: edgeProps,
  setup(props) {
    const flow = useFlow()

    const remove = async (): Promise<void> => {
      await flow.deleteElements({ edgeIds: [props.id] })
    }

    return () => {
      const [path, labelX, labelY] = getBezierPath(props)

      return [
        h(FlowBaseEdge, {
          path,
          markerEnd: props.markerEnd,
          'data-testid': 'button-edge-path',
          'data-edge-path': props.id,
        }),
        h(FlowEdgeLabelRenderer, null, {
          default: () =>
            h(
              'button',
              {
                type: 'button',
                class: 'recipe-edge-button flow-vue-no-pan',
                'data-testid': 'button-edge-delete',
                'data-edge-id': props.id,
                'aria-label': `Delete edge ${props.id}`,
                style: labelStyle(labelX, labelY),
                onClick: remove,
              },
              '×'
            ),
        }),
      ]
    }
  },
})

const DataEdgeDataSchema = S.Struct({ key: S.String })

/** UI "Edge with Node Data": the label shows one field of the source node's data. */
export const DataEdge = defineComponent({
  name: 'RecipeDataEdge',
  inheritAttrs: false,
  props: edgeProps,
  setup(props) {
    return () => {
      const [path, labelX, labelY] = getBezierPath(props)
      const { key } = S.decodeUnknownSync(DataEdgeDataSchema)(props.data)
      const value = props.sourceNode.node.data?.[key]

      return [
        h(FlowBaseEdge, {
          path,
          'data-testid': 'data-edge-path',
        }),
        h(FlowEdgeLabelRenderer, null, {
          default: () =>
            h(
              'div',
              {
                class: 'recipe-edge-label',
                'data-testid': 'data-edge-label',
                'data-label-x': labelX,
                'data-label-y': labelY,
                style: labelStyle(labelX, labelY),
              },
              String(value)
            ),
        }),
      ]
    }
  },
})

/** Tracks `prefers-reduced-motion: reduce`, including later changes. */
const usePrefersReducedMotion = () => {
  const query = globalThis.matchMedia('(prefers-reduced-motion: reduce)')
  const reduced = ref(query.matches)

  const onChange = (event: MediaQueryListEvent): void => {
    reduced.value = event.matches
  }

  query.addEventListener('change', onChange)
  onBeforeUnmount(() => query.removeEventListener('change', onChange))

  return reduced
}

/** UI "Animated SVG Edge": a circle follows the path unless motion is reduced. */
export const AnimatedSvgEdge = defineComponent({
  name: 'RecipeAnimatedSvgEdge',
  inheritAttrs: false,
  props: edgeProps,
  setup(props) {
    const reduced = usePrefersReducedMotion()

    return () => {
      const [path, labelX, labelY] = getBezierPath(props)

      const mover = reduced.value
        ? h('circle', {
            key: 'parked',
            r: 5,
            cx: labelX,
            cy: labelY,
            fill: '#ff0073',
            'data-testid': 'animated-svg-shape',
          })
        : h(
            'circle',
            {
              key: 'moving',
              r: 5,
              fill: '#ff0073',
              'data-testid': 'animated-svg-shape',
            },
            [
              h('animateMotion', {
                dur: '2s',
                repeatCount: 'indefinite',
                path,
              }),
            ]
          )

      return [
        h(FlowBaseEdge, { path, 'data-testid': 'animated-svg-path' }),
        mover,
      ]
    }
  },
})

/** Example "Floating Edges": endpoints sit where the center line crosses each node border. */
export const FloatingEdge = defineComponent({
  name: 'RecipeFloatingEdge',
  inheritAttrs: false,
  props: edgeProps,
  setup(props) {
    return () => {
      const [path] = getBezierPath(
        getFloatingEdgeParams(props.sourceNode, props.targetNode)
      )

      return h(FlowBaseEdge, {
        path,
        markerEnd: props.markerEnd,
        'data-testid': 'floating-edge-path',
        'data-edge-path': props.id,
      })
    }
  },
})

/** Example "Simple Floating Edges": endpoints snap to the facing side midpoints. */
export const SimpleFloatingEdge = defineComponent({
  name: 'RecipeSimpleFloatingEdge',
  inheritAttrs: false,
  props: edgeProps,
  setup(props) {
    return () => {
      const [path] = getBezierPath(
        getSimpleFloatingEdgeParams(props.sourceNode, props.targetNode)
      )

      return h(FlowBaseEdge, {
        path,
        markerEnd: props.markerEnd,
        'data-testid': 'floating-edge-path',
        'data-edge-path': props.id,
      })
    }
  },
})

const MarkerGlyphSchema = S.Literals(['circle', 'diamond', 'arrow'])

type MarkerGlyph = typeof MarkerGlyphSchema.Type

const MarkerDataSchema = S.Struct({
  start: MarkerGlyphSchema,
  end: MarkerGlyphSchema,
  color: S.String,
  size: S.Finite,
})

const markerGlyph = (glyph: MarkerGlyph, color: string): VNode => {
  switch (glyph) {
    case 'circle': {
      return h('circle', { r: 6, fill: color })
    }

    case 'diamond': {
      return h('path', { d: 'M 0,-7 L 7,0 L 0,7 L -7,0 Z', fill: color })
    }

    default: {
      return h('path', { d: 'M -7,-6 L 7,0 L -7,6 Z', fill: color })
    }
  }
}

/** Example "Edge Markers": a custom edge that defines its own markers from edge data. */
export const MarkerEdge = defineComponent({
  name: 'RecipeMarkerEdge',
  inheritAttrs: false,
  props: edgeProps,
  setup(props) {
    // Unique per mounted edge component, so two canvases never share marker ids.
    const scope = useId()

    return () => {
      const [path] = getBezierPath(props)
      const data = S.decodeUnknownSync(MarkerDataSchema)(props.data)
      const startId = `${scope}-${props.id}-start`
      const endId = `${scope}-${props.id}-end`

      const marker = (id: string, glyph: MarkerGlyph) =>
        h(
          'marker',
          {
            id,
            'data-testid': 'custom-marker',
            'data-glyph': glyph,
            viewBox: '-10 -10 20 20',
            markerWidth: data.size,
            markerHeight: data.size,
            markerUnits: 'userSpaceOnUse',
            orient: 'auto-start-reverse',
            refX: 0,
            refY: 0,
          },
          [markerGlyph(glyph, data.color)]
        )

      return [
        h('defs', [marker(startId, data.start), marker(endId, data.end)]),
        h(FlowBaseEdge, {
          path,
          markerStart: `url(#${startId})`,
          markerEnd: `url(#${endId})`,
          stroke: data.color,
          'data-testid': 'marker-edge-path',
          'data-edge-path': props.id,
        }),
      ]
    }
  },
})

/** Example "Easy Connect": the whole node body is the handle; a top strip drags it. */
export const EasyNode = defineComponent({
  name: 'RecipeEasyNode',
  inheritAttrs: false,
  props: { id: { type: String, required: true } },
  setup(props) {
    return () => [
      h('div', {
        class: 'recipe-easy-strip',
        'data-flow-drag-handle': '',
        'data-testid': 'easy-drag-strip',
      }),
      h('span', { class: 'recipe-easy-label' }, `Node ${props.id}`),
    ]
  },
})

/** Easy Connect connection line: straight from the node border to a pointer circle. */
export const EasyConnectionLine = defineComponent({
  name: 'RecipeEasyConnectionLine',
  inheritAttrs: false,
  props: {
    // SAFETY: FlowCanvas supplies the origin node bounds from the accepted graph.
    fromNode: {
      type: Object as PropType<FlowNodeBounds>,
      required: true,
    },
    toX: { type: Number, required: true },
    toY: { type: Number, required: true },
  },
  setup(props) {
    return () => {
      const to = { x: props.toX, y: props.toY }
      const start = getFloatingConnectionStart(props.fromNode, to)

      const [path] = getStraightPath({
        sourceX: start.x,
        sourceY: start.y,
        targetX: to.x,
        targetY: to.y,
      })

      return [
        h('path', {
          d: path,
          fill: 'none',
          stroke: '#222',
          'stroke-width': 1.5,
          'data-testid': 'easy-connection-line',
        }),
        h('circle', {
          cx: to.x,
          cy: to.y,
          r: 3,
          fill: '#fff',
          stroke: '#222',
          'stroke-width': 1.5,
          'data-testid': 'easy-connection-cursor',
        }),
      ]
    }
  },
})

/** Example "Multi Connection Line": one line from every selected node's matching handle. */
export const MultiConnectionLine = defineComponent({
  name: 'RecipeMultiConnectionLine',
  inheritAttrs: false,
  props: {
    // SAFETY: FlowCanvas supplies the origin node bounds from the accepted graph.
    fromNode: {
      type: Object as PropType<FlowNodeBounds>,
      required: true,
    },
    // SAFETY: FlowCanvas supplies the origin handle from the accepted graph.
    fromHandle: { type: Object as PropType<FlowHandle>, required: true },
    toX: { type: Number, required: true },
    toY: { type: Number, required: true },
  },
  setup(props) {
    const flow = useFlow()

    const origins = computed(() => {
      const selected = flow.nodes.value
        .filter((node) => node.selected === true)
        .map((node) => node.id)

      return selected.includes(props.fromNode.id)
        ? selected
        : [props.fromNode.id]
    })

    return () =>
      origins.value.flatMap((nodeId) => {
        const internal = flow.getInternalNode(nodeId)

        const handle = internal?.handles.find(
          ({ handleId }) => handleId === props.fromHandle.id
        )

        if (internal === undefined || handle === undefined) {
          return []
        }

        const from = {
          x: internal.absolutePosition.x + handle.offset.x,
          y: internal.absolutePosition.y + handle.offset.y,
        }

        return [
          h('path', {
            key: nodeId,
            d: `M ${from.x},${from.y} L ${props.toX},${props.toY}`,
            fill: 'none',
            stroke: '#7c3aed',
            'stroke-width': 1.5,
            'data-testid': 'multi-connection-line',
            'data-node-id': nodeId,
          }),
        ]
      })
  },
})
