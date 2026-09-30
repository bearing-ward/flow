import { NodeIdSchema, nodeToolbarAnchor } from '@flow/core'
import type {
  FlowGraphView,
  FlowToolbarAlign,
  FlowToolbarPosition,
} from '@flow/core'
import { Schema as S } from 'effect'
import { defineComponent, h, inject, Teleport } from 'vue'
import type {
  ComputedRef,
  InjectionKey,
  PropType,
  ShallowRef,
  StyleValue,
} from 'vue'

import { FlowNodeIdKey, useFlow } from './use-flow.ts'

interface FlowNodeToolbarContext {
  readonly graph: ComputedRef<FlowGraphView>
  readonly target: ShallowRef<HTMLElement | null>
  readonly noPanClassName: ComputedRef<string>
  readonly noDragClassName: ComputedRef<string>
  readonly noWheelClassName: ComputedRef<string>
}

export const FlowNodeToolbarContextKey: InjectionKey<FlowNodeToolbarContext> =
  Symbol('FlowNodeToolbarContext')

const positions: readonly FlowToolbarPosition[] = [
  'top',
  'right',
  'bottom',
  'left',
]

const alignments: readonly FlowToolbarAlign[] = ['start', 'center', 'end']

const PositionSchema = S.Literals(positions)

const AlignSchema = S.Literals(alignments)

const transforms: Record<
  FlowToolbarPosition,
  Record<FlowToolbarAlign, { readonly x: string; readonly y: string }>
> = {
  top: {
    start: { x: '0', y: '-100%' },
    center: { x: '-50%', y: '-100%' },
    end: { x: '-100%', y: '-100%' },
  },
  right: {
    start: { x: '0', y: '0' },
    center: { x: '0', y: '-50%' },
    end: { x: '0', y: '-100%' },
  },
  bottom: {
    start: { x: '0', y: '0' },
    center: { x: '-50%', y: '0' },
    end: { x: '-100%', y: '0' },
  },
  left: {
    start: { x: '-100%', y: '0' },
    center: { x: '-100%', y: '-50%' },
    end: { x: '-100%', y: '-100%' },
  },
}

/** A fixed-size screen-space toolbar anchored to a measured node. */
export const FlowNodeToolbar = defineComponent({
  name: 'FlowNodeToolbar',
  inheritAttrs: false,
  props: {
    nodeId: { type: String, default: undefined },
    isVisible: { type: Boolean, default: undefined },
    position: {
      // SAFETY: PropType preserves the TypeScript union behind Vue's String runtime constructor.
      type: String as PropType<FlowToolbarPosition>,
      default: 'top',
      validator: (value: string): boolean =>
        positions.some((item) => item === value),
    },
    align: {
      // SAFETY: PropType preserves the TypeScript union behind Vue's String runtime constructor.
      type: String as PropType<FlowToolbarAlign>,
      default: 'center',
      validator: (value: string): boolean =>
        alignments.some((item) => item === value),
    },
    offset: {
      type: Number,
      default: 10,
      validator: (value: number): boolean => S.is(S.Finite)(value),
    },
    className: { type: String, default: '' },
    // SAFETY: StyleValue retains Vue's accepted native style input contract.
    style: { type: [String, Object, Array] as PropType<StyleValue> },
  },
  setup(props, { attrs, slots }) {
    const context = inject(FlowNodeToolbarContextKey)

    if (context === undefined) {
      throw new Error('FlowNodeToolbar must be rendered inside FlowCanvas')
    }

    const flow = useFlow()
    const contextualNodeId = inject(FlowNodeIdKey, null)

    return () => {
      const target = context.target.value
      const nodeId = props.nodeId ?? contextualNodeId

      if (
        target === null ||
        nodeId === null ||
        !S.is(NodeIdSchema)(nodeId) ||
        !S.is(PositionSchema)(props.position) ||
        !S.is(AlignSchema)(props.align) ||
        !S.is(S.Finite)(props.offset)
      ) {
        return null
      }

      const graph = context.graph.value
      const node = graph.nodes.get(nodeId)

      if (node === undefined || node.hidden) {
        return null
      }

      const selectedCount = graph.orderedNodes.filter(
        ({ node: item }) => item.selected === true
      ).length

      const visible =
        props.isVisible ?? (node.node.selected === true && selectedCount === 1)

      if (!visible) {
        return null
      }

      const anchor = nodeToolbarAnchor(graph, nodeId, flow.viewport.value, {
        position: props.position,
        align: props.align,
        offset: props.offset,
      })

      if (anchor === undefined) {
        return null
      }

      return h(
        Teleport,
        { to: target },
        h(
          'div',
          {
            ...attrs,
            class: [
              'flow-vue-node-toolbar',
              context.noPanClassName.value,
              context.noDragClassName.value,
              context.noWheelClassName.value,
              props.className,
              attrs.class,
            ],
            style: [
              {
                left: `${anchor.position.x}px`,
                top: `${anchor.position.y}px`,
                transform: `translate(${transforms[props.position][props.align].x}, ${transforms[props.position][props.align].y})`,
              },
              props.style,
              attrs.style,
            ],
            'data-node-toolbar': nodeId,
          },
          slots.default?.()
        )
      )
    }
  },
})
