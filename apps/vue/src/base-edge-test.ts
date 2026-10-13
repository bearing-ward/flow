import { decodeFlowDocument } from '@flow/core'
import type {
  FlowEdge,
  FlowEditResult,
  Viewport,
  ViewportOperationResult,
} from '@flow/core'
import { FlowBaseEdge, FlowCanvas, FlowEdgeText, useFlow } from '@flow/vue'
import { Effect, Schema as S } from 'effect'
import { createApp, defineComponent, h } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'

interface BaseEdgeFixtureApi {
  readonly setViewport: (viewport: Viewport) => Promise<ViewportOperationResult>
  readonly setLabel: (id: string, label: string) => Promise<FlowEditResult>
}

declare global {
  interface Window {
    __flowVueBaseEdge?: BaseEdgeFixtureApi
  }
}

const LabelDataSchema = S.Struct({
  label: S.String,
  labelX: S.Finite,
  labelY: S.Finite,
})

const labelData = (edge: FlowEdge) =>
  S.decodeUnknownSync(LabelDataSchema)(edge.data)

const edgeProps = {
  // SAFETY: FlowCanvas supplies an accepted FlowEdge to registered edge components.
  edge: { type: Object as PropType<FlowEdge>, required: true },
  path: { type: String, required: true },
  markerStart: { type: String, default: undefined },
  markerEnd: { type: String, default: undefined },
} as const

const LabeledEdge = defineComponent({
  props: edgeProps,
  setup(props) {
    return () => {
      const data = labelData(props.edge)

      return h(FlowBaseEdge, {
        path: props.path,
        label: data.label,
        labelX: data.labelX,
        labelY: data.labelY,
        markerEnd: props.markerEnd,
        className: 'fixture-base-edge',
        stroke: '#0f766e',
        'data-testid': `base-edge-${props.edge.id}`,
      })
    }
  },
})

const PlainEdge = defineComponent({
  props: edgeProps,
  setup(props) {
    return () => {
      const data = labelData(props.edge)

      return h(FlowBaseEdge, {
        path: props.path,
        label: data.label,
        labelX: data.labelX,
        labelY: data.labelY,
        labelShowBg: false,
        interactionWidth: 0,
        'data-testid': `base-edge-${props.edge.id}`,
      })
    }
  },
})

const TextOnlyEdge = defineComponent({
  props: edgeProps,
  setup(props) {
    return () => {
      const data = labelData(props.edge)

      return h(
        FlowEdgeText,
        {
          x: data.labelX,
          y: data.labelY,
          label: data.label,
          labelBgPadding: [6, 3],
          labelBgBorderRadius: 5,
          'data-testid': 'standalone-edge-text',
        },
        {
          default: () =>
            h('circle', { r: 3, 'data-testid': 'edge-text-child' }),
        }
      )
    }
  },
})

const initialDocument = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'a',
          label: 'A',
          position: { x: 40, y: 60 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'b',
          label: 'B',
          position: { x: 460, y: 260 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: [
        {
          id: 'labeled',
          type: 'labeled',
          source: 'a',
          sourceHandle: 'out',
          target: 'b',
          targetHandle: 'in',
          markerEnd: 'arrowclosed',
          data: { label: 'Approve', labelX: 300, labelY: 160 },
        },
        {
          id: 'plain',
          type: 'plain',
          source: 'b',
          sourceHandle: 'in',
          target: 'a',
          targetHandle: 'out',
          data: { label: 'Plain', labelX: 200, labelY: 300 },
        },
        {
          id: 'text',
          type: 'text',
          source: 'a',
          sourceHandle: 'out',
          target: 'b',
          targetHandle: 'in',
          data: { label: 'Standalone', labelX: 500, labelY: 120 },
        },
      ],
    })
  )

export const mountVueBaseEdgeFixture = (root: HTMLElement): (() => void) => {
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
        return () =>
          h(
            FlowCanvas,
            {
              document: initialDocument(),
              edgeTypes: {
                labeled: LabeledEdge,
                plain: PlainEdge,
                text: TextOnlyEdge,
              },
              style: { width: '720px', height: '420px' },
            },
            { default: () => h(Probe) }
          )
      },
    })
  )

  app.mount(root)

  const getActions = () => {
    if (actions === undefined) {
      throw new Error('Vue base edge fixture actions are unavailable')
    }

    return actions
  }

  window.__flowVueBaseEdge = {
    setViewport: (viewport) => getActions().setViewport(viewport),
    setLabel: (id, label) =>
      getActions().setEdges((edges) =>
        edges.map((edge) =>
          edge.id === id
            ? { ...edge, data: { ...labelData(edge), label } }
            : edge
        )
      ),
  }

  return () => {
    app.unmount()
    delete window.__flowVueBaseEdge
  }
}
