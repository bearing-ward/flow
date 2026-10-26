import { flowFigureData, flowFigurePath } from '@flow/core'
import type { FlowMiniMapNodeProps, FlowNode } from '@flow/core'
import { defineComponent, h } from 'vue'
import type { PropType } from 'vue'

/** One custom node component for the decoded figure recipe. */
export const FlowFigureNode = defineComponent({
  name: 'FlowFigureNode',
  inheritAttrs: false,
  props: {
    // SAFETY: FlowCanvas supplies the decoded node through its renderer contract.
    node: { type: Object as PropType<FlowNode>, required: true },
    selected: { type: Boolean, default: false },
  },
  setup(props) {
    return () => {
      const figure = flowFigureData(props.node)

      return h('div', { style: { position: 'absolute', inset: 0 } }, [
        figure === undefined
          ? null
          : h(
              'svg',
              {
                'data-shape-svg': '',
                'data-shape': figure.type,
                viewBox: '0 0 100 100',
                preserveAspectRatio: 'none',
                width: '100%',
                height: '100%',
                style: { position: 'absolute', inset: 0, overflow: 'visible' },
              },
              [
                h('path', {
                  d: flowFigurePath(figure.type),
                  fill: figure.color,
                }),
              ]
            ),
        h(
          'span',
          {
            style: {
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              pointerEvents: 'none',
            },
          },
          props.node.label
        ),
      ])
    }
  },
})

/** Use from FlowMiniMap's node slot with the current accepted node. */
export const renderFlowFigureMiniMapNode = (
  props: FlowMiniMapNodeProps,
  node: FlowNode | undefined
) => {
  const figure = flowFigureData(node)

  return h(
    'svg',
    {
      key: props.id,
      'data-shape-minimap': props.id,
      'data-shape': figure?.type,
      x: props.x,
      y: props.y,
      width: props.width,
      height: props.height,
      viewBox: '0 0 100 100',
      preserveAspectRatio: 'none',
    },
    figure === undefined
      ? []
      : [h('path', { d: flowFigurePath(figure.type), fill: figure.color })]
  )
}
