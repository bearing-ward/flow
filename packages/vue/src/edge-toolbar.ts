import { EdgeIdSchema, edgeToolbarPlacement } from '@flow/core'
import type { FlowEdgeToolbarAlignX, FlowEdgeToolbarAlignY } from '@flow/core'
import { Schema as S } from 'effect'
import { defineComponent, h, inject, Teleport } from 'vue'
import type { PropType, StyleValue } from 'vue'

import { FlowNodeToolbarContextKey } from './node-toolbar.ts'
import { useFlow } from './use-flow.ts'

const alignXs: readonly FlowEdgeToolbarAlignX[] = ['left', 'center', 'right']

const alignYs: readonly FlowEdgeToolbarAlignY[] = ['top', 'center', 'bottom']

const AlignXSchema = S.Literals(alignXs)

const AlignYSchema = S.Literals(alignYs)

/** A fixed-size screen-space toolbar anchored to a flow-space point of an edge. */
export const FlowEdgeToolbar = defineComponent({
  name: 'FlowEdgeToolbar',
  inheritAttrs: false,
  props: {
    edgeId: { type: String, required: true },
    x: {
      type: Number,
      required: true,
      validator: (value: number): boolean => S.is(S.Finite)(value),
    },
    y: {
      type: Number,
      required: true,
      validator: (value: number): boolean => S.is(S.Finite)(value),
    },
    isVisible: { type: Boolean, default: undefined },
    alignX: {
      // SAFETY: PropType preserves the TypeScript union behind Vue's String runtime constructor.
      type: String as PropType<FlowEdgeToolbarAlignX>,
      default: 'center',
      validator: (value: string): boolean =>
        alignXs.some((item) => item === value),
    },
    alignY: {
      // SAFETY: PropType preserves the TypeScript union behind Vue's String runtime constructor.
      type: String as PropType<FlowEdgeToolbarAlignY>,
      default: 'center',
      validator: (value: string): boolean =>
        alignYs.some((item) => item === value),
    },
    className: { type: String, default: '' },
    // SAFETY: StyleValue retains Vue's accepted native style input contract.
    style: { type: [String, Object, Array] as PropType<StyleValue> },
  },
  setup(props, { attrs, slots }) {
    const context = inject(FlowNodeToolbarContextKey)

    if (context === undefined) {
      throw new Error('FlowEdgeToolbar must be rendered inside FlowCanvas')
    }

    const flow = useFlow()

    return () => {
      const target = context.target.value

      if (
        target === null ||
        !S.is(EdgeIdSchema)(props.edgeId) ||
        !S.is(S.Finite)(props.x) ||
        !S.is(S.Finite)(props.y) ||
        !S.is(AlignXSchema)(props.alignX) ||
        !S.is(AlignYSchema)(props.alignY)
      ) {
        return null
      }

      const edge = context.graph.value.document.edges.find(
        ({ id }) => id === props.edgeId
      )

      if (edge === undefined || edge.hidden === true) {
        return null
      }

      if (!(props.isVisible ?? edge.selected === true)) {
        return null
      }

      const placement = edgeToolbarPlacement(
        { x: props.x, y: props.y },
        flow.viewport.value,
        props.alignX,
        props.alignY
      )

      return h(
        Teleport,
        { to: target },
        h(
          'div',
          {
            ...attrs,
            class: [
              'flow-vue-edge-toolbar',
              context.noPanClassName.value,
              context.noDragClassName.value,
              context.noWheelClassName.value,
              props.className,
              attrs.class,
            ],
            style: [
              {
                left: `${placement.position.x}px`,
                top: `${placement.position.y}px`,
                transform: `translate(${placement.translate.x}%, ${placement.translate.y}%)`,
                zIndex: (edge.zIndex ?? 0) + 1,
              },
              props.style,
              attrs.style,
            ],
            'data-edge-toolbar': edge.id,
          },
          slots.default?.()
        )
      )
    }
  },
})
