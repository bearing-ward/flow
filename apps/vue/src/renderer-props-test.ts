import { decodeFlowDocument, getBezierPath } from '@flow/core'
import type {
  FlowConnectionLineType,
  Viewport,
  ViewportOperationResult,
} from '@flow/core'
import { FlowCanvas, FlowEdgeLabelRenderer, useFlow } from '@flow/vue'
import type {
  FlowConnectionLineProps,
  FlowNodeBounds,
  FlowPosition,
} from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'

interface RendererPropsFixtureApi {
  readonly setViewport: (viewport: Viewport) => Promise<ViewportOperationResult>
}

declare global {
  interface Window {
    __flowVueRendererProps?: RendererPropsFixtureApi
  }
}

// SAFETY: FlowCanvas supplies side literals from accepted handles.
const sideProp = {
  type: String as PropType<FlowPosition>,
  required: true,
} as const

const ProbeEdge = defineComponent({
  inheritAttrs: false,
  props: {
    id: { type: String, required: true },
    sourceX: { type: Number, required: true },
    sourceY: { type: Number, required: true },
    targetX: { type: Number, required: true },
    targetY: { type: Number, required: true },
    sourcePosition: sideProp,
    targetPosition: sideProp,
    selected: { type: Boolean, required: true },
    labelX: { type: Number, required: true },
    labelY: { type: Number, required: true },
    markerEnd: { type: String, default: undefined },
    // SAFETY: FlowCanvas supplies resolved node bounds for edge endpoints.
    targetNode: { type: Object as PropType<FlowNodeBounds>, required: true },
  },
  setup(props) {
    return () => {
      const [path] = getBezierPath(props)

      return [
        h('path', {
          d: path,
          fill: 'none',
          stroke: '#0f766e',
          'stroke-width': 2,
          'marker-end': props.markerEnd,
          'data-testid': 'probe-edge-path',
          'data-selected': String(props.selected),
          'data-target-node': `${props.targetNode.id}:${props.targetNode.width}`,
        }),
        h(FlowEdgeLabelRenderer, null, {
          default: () =>
            h(
              'div',
              {
                'data-testid': 'probe-edge-label',
                'data-label-x': props.labelX,
                'data-label-y': props.labelY,
                style: {
                  position: 'absolute',
                  transform: `translate(-50%, -50%) translate(${props.labelX}px, ${props.labelY}px)`,
                  background: '#fde68a',
                  padding: '4px',
                  pointerEvents: 'all',
                },
              },
              `label ${props.id}`
            ),
        }),
      ]
    }
  },
})

const ProbeNode = defineComponent({
  inheritAttrs: false,
  props: {
    id: { type: String, required: true },
    selected: { type: Boolean, required: true },
    dragging: { type: Boolean, required: true },
    positionAbsoluteX: { type: Number, required: true },
    positionAbsoluteY: { type: Number, required: true },
    isConnectable: { type: Boolean, required: true },
    zIndex: { type: Number, required: true },
    width: { type: Number, default: undefined },
    height: { type: Number, default: undefined },
  },
  setup(props) {
    return () =>
      h(
        'div',
        {
          'data-testid': `probe-node-${props.id}`,
          'data-selected': String(props.selected),
          'data-dragging': String(props.dragging),
          'data-x': props.positionAbsoluteX,
          'data-y': props.positionAbsoluteY,
          'data-connectable': String(props.isConnectable),
          'data-z': props.zIndex,
          'data-size': `${props.width}x${props.height}`,
        },
        props.id
      )
  },
})

const ProbePreview = defineComponent({
  props: {
    // SAFETY: FlowCanvas supplies the props computed by flowConnectionLineProps.
    fromNode: {
      type: Object as PropType<FlowConnectionLineProps['fromNode']>,
      required: true,
    },
    // SAFETY: FlowCanvas supplies the origin handle from the accepted graph.
    fromHandle: {
      type: Object as PropType<FlowConnectionLineProps['fromHandle']>,
      required: true,
    },
    fromPosition: sideProp,
    toPosition: sideProp,
    // SAFETY: FlowCanvas supplies the hovered node or null.
    toNode: {
      type: Object as PropType<FlowConnectionLineProps['toNode']>,
      default: null,
    },
    // SAFETY: FlowCanvas supplies a connection line type literal.
    connectionLineType: {
      type: String as PropType<FlowConnectionLineType>,
      required: true,
    },
    connectionStatus: { type: String, default: null },
    path: { type: String, required: true },
  },
  setup(props) {
    return () =>
      h('path', {
        d: props.path,
        fill: 'none',
        stroke: '#7c3aed',
        'data-testid': 'probe-preview',
        'data-from': `${props.fromNode.id}:${props.fromHandle.id}`,
        'data-positions': `${props.fromPosition}-${props.toPosition}`,
        'data-to-node': props.toNode?.id ?? '',
        'data-line-type': props.connectionLineType,
        'data-status': props.connectionStatus ?? 'none',
      })
  },
})

const initialDocument = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'a',
          label: 'A',
          type: 'probe',
          position: { x: 40, y: 60 },
          zIndex: 2,
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'b',
          label: 'B',
          position: { x: 420, y: 240 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
        {
          id: 'c',
          label: 'C',
          position: { x: 420, y: 40 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: [
        {
          id: 'custom',
          type: 'probe',
          source: 'a',
          sourceHandle: 'out',
          target: 'b',
          targetHandle: 'in',
          path: 'bezier',
          markerEnd: 'arrowclosed',
        },
        {
          id: 'builtin',
          source: 'a',
          sourceHandle: 'out',
          target: 'b',
          targetHandle: 'in',
          path: 'bezier',
        },
      ],
    })
  )

export const mountVueRendererPropsFixture = (
  root: HTMLElement,
  options: { readonly customPreview: boolean }
): (() => void) => {
  let actions: ReturnType<typeof useFlow> | undefined

  const Probe = defineComponent({
    setup() {
      actions = useFlow()

      return () => null
    },
  })

  const app = createApp(
    defineComponent({
      setup() {
        const common = {
          defaultDocument: initialDocument(),
          nodeTypes: { probe: ProbeNode },
          edgeTypes: { probe: ProbeEdge },
          selectNodesOnDrag: true,
          style: { width: '720px', height: '420px' },
        }

        const slots = { default: () => h(Probe) }

        return () =>
          options.customPreview
            ? h(
                FlowCanvas,
                {
                  ...common,
                  connectionLineType: 'step',
                  connectionPreview: ProbePreview,
                },
                slots
              )
            : h(FlowCanvas, { ...common, connectionLineType: 'bezier' }, slots)
      },
    })
  )

  app.mount(root)

  window.__flowVueRendererProps = {
    setViewport: (viewport) => {
      if (actions === undefined) {
        throw new Error('Vue renderer props fixture actions are unavailable')
      }

      return actions.setViewport(viewport)
    },
  }

  return () => app.unmount()
}
