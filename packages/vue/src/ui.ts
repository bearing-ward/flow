import {
  flowInteractivityFor,
  flowPanelPositions,
  flowThemeValue,
  isFlowInteractive,
} from '@flow/core'
import type { FlowPanelPosition } from '@flow/core'
import { Schema as S } from 'effect'
import { computed, defineComponent, h, useId } from 'vue'
import type { PropType, StyleValue } from 'vue'

import { useFlow } from './use-flow.ts'

/** React Flow `PanelPosition`, including `center-left` and `center-right`. */
export type { FlowPanelPosition } from '@flow/core'

const positions = flowPanelPositions

type Position = FlowPanelPosition

type Orientation = 'vertical' | 'horizontal'

type FitViewOptions = Parameters<ReturnType<typeof useFlow>['fitView']>[0]

const DimensionPairSchema = S.Tuple([S.Finite, S.Finite])

const PositiveDimensionSchema = S.Finite.check(S.isGreaterThan(0))

const PositiveDimensionPairSchema = S.Tuple([
  PositiveDimensionSchema,
  PositiveDimensionSchema,
])

const PositiveDimensionInputSchema = S.Union([
  PositiveDimensionSchema,
  PositiveDimensionPairSchema,
])

// eslint-disable-next-line anti-slop/no-unknown-parameters -- Vue props are external input; the schema decoder below is the boundary.
const normalizePair = (value: unknown): readonly [number, number] => {
  if (S.is(DimensionPairSchema)(value)) {
    return value
  }

  const scalar = S.decodeUnknownSync(S.Finite)(value)

  return [scalar, scalar]
}

/* eslint-disable anti-slop/require-safety-comment-for-type-assertion -- SAFETY: Vue requires PropType assertions to retain generic runtime prop contracts. */

const positionProps = {
  position: {
    type: String as PropType<Position>,
    default: 'bottom-left',
    validator: (value: string): boolean =>
      positions.some((position) => position === value),
  },
}

export const FlowControlButton = defineComponent({
  name: 'FlowControlButton',
  inheritAttrs: false,
  props: {
    disabled: { type: Boolean, default: false },
    className: { type: String, default: '' },
    style: { type: [String, Object, Array] as PropType<StyleValue> },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        'button',
        {
          ...attrs,
          type: attrs.type ?? 'button',
          disabled: props.disabled || attrs.disabled === true,
          class: ['flow-vue-control-button', props.className, attrs.class],
          style: [props.style, attrs.style],
        },
        slots.default?.()
      )
  },
})

export const FlowControls = defineComponent({
  name: 'FlowControls',
  inheritAttrs: false,
  props: {
    ...positionProps,
    orientation: {
      type: String as PropType<Orientation>,
      default: 'vertical',
      validator: (value: string): boolean =>
        value === 'vertical' || value === 'horizontal',
    },
    showZoom: { type: Boolean, default: true },
    showFitView: { type: Boolean, default: true },
    /** Show the lock button that toggles node and edge interactivity. */
    showInteractive: { type: Boolean, default: true },
    fitViewOptions: {
      type: Object as PropType<FitViewOptions>,
      default: undefined,
    },
    /** Group label; defaults to `ariaLabelConfig['controls.ariaLabel']`. */
    ariaLabel: { type: String, default: undefined },
    className: { type: String, default: '' },
    style: { type: [String, Object, Array] as PropType<StyleValue> },
    onZoomIn: { type: Function as PropType<() => void>, default: undefined },
    onZoomOut: { type: Function as PropType<() => void>, default: undefined },
    onFitView: { type: Function as PropType<() => void>, default: undefined },
    onInteractiveChange: {
      type: Function as PropType<(interactive: boolean) => void>,
      default: undefined,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const flow = useFlow()
    const labels = flow.ariaLabelConfig

    // React Flow Controls: interactive while any switch is on; the lock sets all three.
    const interactive = computed(() =>
      isFlowInteractive(flow.interactivity.value)
    )

    const setInteractive = (next: boolean): void => {
      flow.setInteractivity(flowInteractivityFor(next))
    }

    const toggleInteractivity = (): void => {
      const next = !interactive.value
      setInteractive(next)
      props.onInteractiveChange?.(next)
    }

    expose({ isInteractive: () => interactive.value, setInteractive })

    const zoomIn = (): void => {
      void flow.zoomIn()
      props.onZoomIn?.()
    }

    const zoomOut = (): void => {
      void flow.zoomOut()
      props.onZoomOut?.()
    }

    const fitView = (): void => {
      void flow.fitView(props.fitViewOptions)
      props.onFitView?.()
    }

    const classes = computed(() => [
      'flow-vue-controls',
      'flow-vue-no-pan',
      'flow-vue-no-drag',
      `flow-vue-controls-${props.position}`,
      `flow-vue-controls-${props.orientation}`,
      props.className,
      attrs.class,
    ])

    return () => {
      const children = slots.default?.() ?? [
        props.showZoom
          ? h(
              FlowControlButton,
              {
                'aria-label': labels.value['controls.zoomIn.ariaLabel'],
                title: labels.value['controls.zoomIn.ariaLabel'],
                onClick: zoomIn,
              },
              { default: () => '+' }
            )
          : null,
        props.showZoom
          ? h(
              FlowControlButton,
              {
                'aria-label': labels.value['controls.zoomOut.ariaLabel'],
                title: labels.value['controls.zoomOut.ariaLabel'],
                onClick: zoomOut,
              },
              { default: () => '−' }
            )
          : null,
        props.showFitView
          ? h(
              FlowControlButton,
              {
                'aria-label': labels.value['controls.fitView.ariaLabel'],
                title: labels.value['controls.fitView.ariaLabel'],
                onClick: fitView,
              },
              { default: () => 'Fit' }
            )
          : null,
        props.showInteractive
          ? h(
              FlowControlButton,
              {
                'aria-label': labels.value['controls.interactive.ariaLabel'],
                title: labels.value['controls.interactive.ariaLabel'],
                'aria-pressed': String(!interactive.value),
                onClick: toggleInteractivity,
              },
              { default: () => (interactive.value ? 'Lock' : 'Unlock') }
            )
          : null,
      ]

      return h(
        'div',
        {
          ...attrs,
          class: classes.value,
          style: [props.style, attrs.style],
          role: 'group',
          'aria-label': props.ariaLabel ?? labels.value['controls.ariaLabel'],
          'data-flow-ui': 'controls',
          'data-interactive': String(interactive.value),
        },
        children
      )
    }
  },
})

/**
 * A screen-space content region positioned over its parent FlowCanvas.
 * The panel adds no keyboard handling and remains in normal browser tab order.
 * Canvas keyboard interaction ownership follows FlowCanvas.
 */
export const FlowPanel = defineComponent({
  name: 'FlowPanel',
  inheritAttrs: false,
  props: {
    position: {
      type: String as PropType<FlowPanelPosition>,
      default: 'top-left',
      validator: (value: string): boolean =>
        positions.some((position) => position === value),
    },
    className: { type: String, default: '' },
    style: { type: [String, Object, Array] as PropType<StyleValue> },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        'div',
        {
          ...attrs,
          class: [
            'flow-vue-panel',
            'flow-vue-no-pan',
            'flow-vue-no-drag',
            'flow-vue-no-wheel',
            `flow-vue-panel-${props.position}`,
            props.className,
            attrs.class,
          ],
          style: [props.style, attrs.style],
          role: attrs.role ?? 'group',
          'data-flow-ui': 'panel',
          'data-position': props.position,
        },
        slots.default?.()
      )
  },
})

export const FlowBackground = defineComponent({
  name: 'FlowBackground',
  inheritAttrs: false,
  props: {
    variant: {
      type: String as PropType<'dots' | 'lines' | 'cross'>,
      default: 'dots',
      validator: (value: string): boolean =>
        value === 'dots' || value === 'lines' || value === 'cross',
    },
    gap: {
      type: [Number, Array] as PropType<number | readonly [number, number]>,
      default: 20,
      // eslint-disable-next-line anti-slop/no-unknown-parameters -- Vue validates raw prop input against the schema at this boundary.
      validator: (value: unknown): boolean =>
        S.is(PositiveDimensionInputSchema)(value),
    },
    size: { type: Number, default: undefined },
    offset: {
      type: [Number, Array] as PropType<number | readonly [number, number]>,
      default: 0,
    },
    /** Pattern colour; defaults to the themed `--flow-background-pattern-*-color`. */
    color: { type: String, default: undefined },
    /** Background fill; defaults to the themed `--flow-background-color`. */
    bgColor: { type: String, default: undefined },
    lineWidth: { type: Number, default: 1 },
    id: { type: String, default: undefined },
    className: { type: String, default: '' },
    patternClassName: { type: String, default: '' },
    style: { type: [String, Object, Array] as PropType<StyleValue> },
  },
  setup(props, { attrs }) {
    const flow = useFlow()
    const generatedId = `flow-vue-background-${useId()}`
    const patternId = computed(() => props.id ?? generatedId)
    const gap = computed(() => normalizePair(props.gap))
    const offset = computed(() => normalizePair(props.offset))

    const size = computed(
      () => props.size ?? (props.variant === 'cross' ? 6 : 1)
    )

    return () => {
      const viewport = flow.viewport.value
      const [gapX, gapY] = gap.value
      const [offsetX, offsetY] = offset.value
      const scaledGapX = gapX * viewport.zoom || 1
      const scaledGapY = gapY * viewport.zoom || 1
      const scaledSize = size.value * viewport.zoom
      const patternWidth = props.variant === 'cross' ? scaledSize : scaledGapX
      const patternHeight = props.variant === 'cross' ? scaledSize : scaledGapY
      const scaledOffsetX = offsetX * viewport.zoom + patternWidth / 2
      const scaledOffsetY = offsetY * viewport.zoom + patternHeight / 2
      const path = `M ${patternWidth / 2} 0 V ${patternHeight} M 0 ${patternHeight / 2} H ${patternWidth}`

      const backgroundStyle = [
        {
          position: 'absolute',
          inset: '0',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        },
        props.style,
        attrs.style,
      ] satisfies StyleValue[]

      return h(
        'svg',
        {
          ...attrs,
          class: ['flow-vue-background', props.className, attrs.class],
          style: backgroundStyle,
          'aria-hidden': 'true',
          focusable: 'false',
          'data-flow-ui': 'background',
          'data-background-variant': props.variant,
        },
        [
          h('defs', null, [
            h(
              'pattern',
              {
                id: patternId.value,
                class: props.patternClassName,
                x: viewport.x % scaledGapX,
                y: viewport.y % scaledGapY,
                width: scaledGapX,
                height: scaledGapY,
                patternUnits: 'userSpaceOnUse',
                patternTransform: `translate(-${scaledOffsetX},-${scaledOffsetY})`,
              },
              props.variant === 'dots'
                ? [
                    h('circle', {
                      cx: scaledSize / 2,
                      cy: scaledSize / 2,
                      r: scaledSize / 2,
                      style: {
                        fill:
                          props.color ??
                          flowThemeValue('background-pattern-dots-color'),
                      },
                    }),
                  ]
                : [
                    h('path', {
                      d: path,
                      fill: 'none',
                      style: {
                        stroke:
                          props.color ??
                          flowThemeValue(
                            `background-pattern-${props.variant}-color`
                          ),
                      },
                      'stroke-width': props.lineWidth,
                    }),
                  ]
            ),
          ]),
          h('rect', {
            width: '100%',
            height: '100%',
            style: {
              fill: props.bgColor ?? flowThemeValue('background-color'),
            },
          }),
          h('rect', {
            width: '100%',
            height: '100%',
            fill: `url(#${patternId.value})`,
          }),
        ]
      )
    }
  },
})
