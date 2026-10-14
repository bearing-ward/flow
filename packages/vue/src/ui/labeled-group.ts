import { flowPanelPlacement } from '@flow/core'
import type { FlowNode, FlowPanelPosition } from '@flow/core'
import { Predicate } from 'effect'
import { computed, defineComponent, h } from 'vue'
import type { PropType } from 'vue'

/* eslint-disable anti-slop/require-safety-comment-for-type-assertion -- SAFETY: Vue requires PropType assertions to retain generic runtime prop contracts. */

/**
 * React Flow UI `LabeledGroupNode`: a group node renderer that fills its
 * node and shows a title tag in one corner. Children are ordinary nodes
 * with `parentId` (and usually `extent: 'parent'`), so they sit inside it
 * and move with it. The title is `data.label`, then `label`, then `node.label`.
 */
export const FlowLabeledGroupNode = defineComponent({
  name: 'FlowLabeledGroupNode',
  inheritAttrs: false,
  props: {
    node: { type: Object as PropType<FlowNode>, default: undefined },
    label: { type: String, default: undefined },
    position: {
      type: String as PropType<FlowPanelPosition>,
      default: 'top-left',
    },
    className: { type: String, default: '' },
  },
  setup(props, { attrs, slots }) {
    const label = computed(() => {
      const dataLabel = props.node?.data?.['label']

      // `data.label` first, as React's example; FlowCanvas also passes the
      // node's own `label` as a renderer prop.
      return (
        (Predicate.isString(dataLabel) ? dataLabel : undefined) ??
        props.label ??
        props.node?.label ??
        ''
      )
    })

    return () => {
      const placement = flowPanelPlacement(props.position)

      return h(
        'section',
        {
          ...attrs,
          class: ['flow-vue-labeled-group', props.className, attrs.class],
          role: 'group',
          'aria-label': label.value,
          'data-flow-labeled-group': '',
        },
        [
          label.value === ''
            ? null
            : h(
                'div',
                {
                  class: [
                    'flow-vue-labeled-group-label',
                    ...placement.classNames,
                  ],
                  // The tag sits flush in its corner, as React's `m-0` panel.
                  style: {
                    top: placement.vertical === 'top' ? '0' : undefined,
                    bottom: placement.vertical === 'bottom' ? '0' : undefined,
                    left: placement.horizontal === 'left' ? '0' : undefined,
                    right: placement.horizontal === 'right' ? '0' : undefined,
                  },
                },
                label.value
              ),
          slots.default?.(),
        ]
      )
    }
  },
})
