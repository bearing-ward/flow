import {
  clampZoom,
  flowZoomPresets,
  parseZoomPresetValue,
  zoomPercentLabel,
} from '@flow/core'
import { computed, defineComponent, h } from 'vue'
import type { PropType } from 'vue'

import { FlowControlButton, FlowPanel } from '../ui.ts'
import type { FlowPanelPosition } from '../ui.ts'
import { useFlow } from '../use-flow.ts'

type FitViewOptions = Parameters<ReturnType<typeof useFlow>['fitView']>[0]

const stopKeys = (event: KeyboardEvent): void => event.stopPropagation()

/* eslint-disable anti-slop/require-safety-comment-for-type-assertion -- SAFETY: Vue requires PropType assertions to retain generic runtime prop contracts. */

const sharedProps = {
  position: {
    type: String as PropType<FlowPanelPosition>,
    default: 'bottom-left',
  },
  ariaLabel: { type: String, default: undefined },
  fitViewOptions: {
    type: Object as PropType<FitViewOptions>,
    default: undefined,
  },
}

/** React Flow UI Zoom Slider: zoom buttons around a range bound to the viewport zoom. */
export const FlowZoomSlider = defineComponent({
  name: 'FlowZoomSlider',
  props: {
    ...sharedProps,
    orientation: {
      type: String as PropType<'horizontal' | 'vertical'>,
      default: 'horizontal',
    },
  },
  setup(props) {
    const flow = useFlow()
    const limits = flow.getViewportLimits()
    const zoom = computed(() => flow.viewport.value.zoom)

    return () =>
      h(
        FlowPanel,
        {
          position: props.position,
          class: 'flow-vue-zoom-slider',
          'aria-label': props.ariaLabel ?? 'Zoom slider',
          'data-orientation': props.orientation,
          onKeydown: stopKeys,
        },
        {
          default: () => [
            h(
              FlowControlButton,
              {
                'aria-label': 'Zoom out',
                disabled: zoom.value <= limits.minZoom,
                onClick: () => {
                  void flow.zoomOut()
                },
              },
              { default: () => '−' }
            ),
            h('input', {
              type: 'range',
              class: 'flow-vue-zoom-slider-range',
              min: limits.minZoom,
              max: limits.maxZoom,
              step: 0.01,
              value: zoom.value,
              'aria-label': 'Zoom level',
              'aria-valuetext': zoomPercentLabel(zoom.value),
              'aria-orientation':
                props.orientation === 'vertical' ? 'vertical' : undefined,
              onInput: (event: Event) => {
                if (event.target instanceof HTMLInputElement) {
                  void flow.zoomTo(
                    clampZoom(event.target.valueAsNumber, limits)
                  )
                }
              },
            }),
            h(
              FlowControlButton,
              {
                'aria-label': 'Zoom in',
                disabled: zoom.value >= limits.maxZoom,
                onClick: () => {
                  void flow.zoomIn()
                },
              },
              { default: () => '+' }
            ),
            h(
              FlowControlButton,
              {
                class: 'flow-vue-zoom-slider-percent',
                'aria-label': 'Reset zoom to 100%',
                onClick: () => {
                  void flow.zoomTo(clampZoom(1, limits))
                },
              },
              { default: () => zoomPercentLabel(zoom.value) }
            ),
            h(
              FlowControlButton,
              {
                'aria-label': 'Fit view',
                onClick: () => {
                  void flow.fitView(props.fitViewOptions)
                },
              },
              { default: () => 'Fit' }
            ),
          ],
        }
      )
  },
})

/** React Flow UI Zoom Select: a native select of zoom presets plus fit view. */
export const FlowZoomSelect = defineComponent({
  name: 'FlowZoomSelect',
  props: {
    ...sharedProps,
    position: { ...sharedProps.position, default: 'top-left' },
  },
  setup(props) {
    const flow = useFlow()

    const onChange = (event: Event): void => {
      if (!(event.target instanceof HTMLSelectElement)) {
        return
      }

      const value = parseZoomPresetValue(event.target.value)

      if (value === 'fit') {
        void flow.fitView(props.fitViewOptions)
      } else if (value !== undefined) {
        void flow.zoomTo(clampZoom(value, flow.getViewportLimits()))
      }

      // Return to the hidden option that shows the current zoom.
      event.target.value = 'current'
    }

    return () =>
      h(
        FlowPanel,
        {
          position: props.position,
          class: 'flow-vue-zoom-select',
          'aria-label': props.ariaLabel ?? 'Zoom select',
          onKeydown: stopKeys,
        },
        {
          default: () =>
            h(
              'select',
              {
                class: 'flow-vue-zoom-select-input',
                'aria-label': 'Zoom',
                value: 'current',
                onChange,
              },
              [
                h(
                  'option',
                  { value: 'current', hidden: true },
                  zoomPercentLabel(flow.viewport.value.zoom)
                ),
                ...flowZoomPresets.map((preset) =>
                  h('option', { value: String(preset.value) }, preset.label)
                ),
              ]
            ),
        }
      )
  },
})

/* eslint-enable anti-slop/require-safety-comment-for-type-assertion */
