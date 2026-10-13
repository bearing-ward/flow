import { getBezierPath } from '@flow/core'
import type { FlowNodeBounds, FlowPosition } from '@flow/vue'
import { defineComponent, h } from 'vue'
import type { PropType } from 'vue'

/** Example "Dynamic Layouting": a dashed "+" node that turns into a real node on click. */
export const PlaceholderNode = defineComponent({
  name: 'RecipePlaceholderNode',
  inheritAttrs: false,
  setup() {
    return () =>
      h(
        'div',
        {
          class: 'recipe-placeholder',
          'data-testid': 'placeholder',
          title: 'Click to add a node',
        },
        '+'
      )
  },
})

// SAFETY: FlowCanvas supplies side literals from accepted handles.
const sideProp = {
  type: String as PropType<FlowPosition>,
  required: true,
} as const

/** Bezier edge, dashed when it leads to a placeholder node. */
export const DynamicEdge = defineComponent({
  name: 'RecipeDynamicEdge',
  inheritAttrs: false,
  props: {
    sourceX: { type: Number, required: true },
    sourceY: { type: Number, required: true },
    targetX: { type: Number, required: true },
    targetY: { type: Number, required: true },
    sourcePosition: sideProp,
    targetPosition: sideProp,
    // SAFETY: FlowCanvas supplies resolved node bounds for the target endpoint.
    targetNode: { type: Object as PropType<FlowNodeBounds>, required: true },
  },
  setup(props) {
    return () => {
      const [path] = getBezierPath(props)
      const placeholder = props.targetNode.node.type === 'placeholder'

      return h('path', {
        class: 'flow-vue-edge-path',
        d: path,
        fill: 'none',
        stroke: placeholder ? '#94a3b8' : '#64748b',
        'stroke-width': 1.5,
        'stroke-dasharray': placeholder ? '5 4' : undefined,
      })
    }
  },
})
