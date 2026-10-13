import { edgeTextLayout } from '@flow/core'
import { Schema as S } from 'effect'
import { defineComponent, Fragment, h, onMounted, shallowRef, watch } from 'vue'
import type { PropType, StyleValue } from 'vue'

type EdgeLabel = string | number

const isFiniteNumber = S.is(S.Finite)

const PaddingSchema = S.Tuple([S.Finite, S.Finite])

const hasLabel = (label: EdgeLabel | undefined): label is EdgeLabel =>
  label !== undefined && label !== '' && label !== 0

const labelProps = {
  // SAFETY: PropType preserves the string-or-number union behind Vue's runtime constructors.
  label: { type: [String, Number] as PropType<EdgeLabel>, default: undefined },
  // SAFETY: StyleValue retains Vue's accepted native style input contract.
  labelStyle: [String, Object, Array] as PropType<StyleValue>,
  labelShowBg: { type: Boolean, default: true },
  // SAFETY: StyleValue retains Vue's accepted native style input contract.
  labelBgStyle: [String, Object, Array] as PropType<StyleValue>,
  labelBgPadding: {
    // SAFETY: PropType preserves the element type behind Vue's Array runtime constructor; the validator checks the pair.
    type: Array as PropType<readonly number[]>,
    default: (): readonly number[] => [2, 4],
    // eslint-disable-next-line anti-slop/no-unknown-parameters -- Vue validates raw prop input against the schema at this boundary.
    validator: (value: unknown): boolean => S.is(PaddingSchema)(value),
  },
  labelBgBorderRadius: { type: Number, default: 2 },
} as const

/** An SVG edge label centered on a flow-space point with an optional background. */
export const FlowEdgeText = defineComponent({
  name: 'FlowEdgeText',
  inheritAttrs: false,
  props: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    ...labelProps,
    className: { type: String, default: '' },
  },
  setup(props, { attrs, slots }) {
    const text = shallowRef<SVGTextElement | null>(null)
    const size = shallowRef({ width: 0, height: 0 })

    const measure = (): void => {
      const element = text.value

      if (element === null) {
        return
      }

      const box = element.getBBox()
      size.value = { width: box.width, height: box.height }
    }

    onMounted(measure)
    watch(() => props.label, measure, { flush: 'post' })

    return () => {
      if (!hasLabel(props.label)) {
        return null
      }

      const [paddingX = 2, paddingY = 4] = props.labelBgPadding

      const layout = edgeTextLayout({ x: props.x, y: props.y, ...size.value }, [
        paddingX,
        paddingY,
      ])

      return h(
        'g',
        {
          transform: `translate(${layout.translate.x} ${layout.translate.y})`,
          visibility: layout.visible ? 'visible' : 'hidden',
          ...attrs,
          class: ['flow-vue-edge-textwrapper', props.className, attrs.class],
        },
        [
          props.labelShowBg
            ? h('rect', {
                class: 'flow-vue-edge-textbg',
                x: layout.background.x,
                y: layout.background.y,
                width: layout.background.width,
                height: layout.background.height,
                rx: props.labelBgBorderRadius,
                ry: props.labelBgBorderRadius,
                style: props.labelBgStyle,
              })
            : null,
          h(
            'text',
            {
              ref: text,
              class: 'flow-vue-edge-text',
              y: layout.textY,
              dy: '0.3em',
              style: props.labelStyle,
            },
            String(props.label)
          ),
          slots.default?.(),
        ]
      )
    }
  },
})

/** The visible path, interaction path and optional label of a custom edge. */
export const FlowBaseEdge = defineComponent({
  name: 'FlowBaseEdge',
  inheritAttrs: false,
  props: {
    path: { type: String, required: true },
    labelX: { type: Number, default: undefined },
    labelY: { type: Number, default: undefined },
    ...labelProps,
    interactionWidth: { type: Number, default: 20 },
    // SAFETY: Edge components forward FlowCanvas markers, which are absent for unmarked edges.
    markerStart: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    // SAFETY: Edge components forward FlowCanvas markers, which are absent for unmarked edges.
    markerEnd: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    className: { type: String, default: '' },
  },
  setup(props, { attrs }) {
    return () =>
      h(Fragment, [
        h('path', {
          // Default presentation matches FlowCanvas's built-in edge; caller
          // attributes and CSS styles override it.
          stroke: '#64748b',
          'stroke-width': 1.5,
          ...attrs,
          d: props.path,
          fill: 'none',
          class: ['flow-vue-edge-path', props.className, attrs.class],
          'marker-start': props.markerStart,
          'marker-end': props.markerEnd,
        }),
        props.interactionWidth
          ? h('path', {
              d: props.path,
              fill: 'none',
              'stroke-opacity': 0,
              'stroke-width': props.interactionWidth,
              class: 'flow-vue-edge-interaction',
            })
          : null,
        hasLabel(props.label) &&
        isFiniteNumber(props.labelX) &&
        isFiniteNumber(props.labelY)
          ? h(FlowEdgeText, {
              x: props.labelX,
              y: props.labelY,
              label: props.label,
              labelStyle: props.labelStyle,
              labelShowBg: props.labelShowBg,
              labelBgStyle: props.labelBgStyle,
              labelBgPadding: props.labelBgPadding,
              labelBgBorderRadius: props.labelBgBorderRadius,
            })
          : null,
      ])
  },
})
