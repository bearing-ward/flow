import { decodeFlowDocument } from '@flow/core'
import type {
  FlowDocument,
  FlowEdge,
  FlowNode,
  FlowNodeSchema,
  FlowDocumentSchema,
} from '@flow/core'
import { FlowCanvas } from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h, ref } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'
import './style.css'

type RendererNodeInput = typeof FlowNodeSchema.Encoded

type RendererDocumentInput = typeof FlowDocumentSchema.Encoded

const documentValue: FlowDocument = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'card',
        label: 'Registry card',
        type: 'card',
        position: { x: 30, y: 50 },
        size: { width: 180, height: 80 },
        data: { revision: 0 },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'legacy',
        label: 'Legacy fallback',
        type: 'legacy',
        position: { x: 340, y: 180 },
        size: { width: 180, height: 80 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
      {
        id: 'unknown',
        label: 'Unknown type fallback',
        type: 'unregistered',
        position: { x: 30, y: 330 },
      },
    ],
    edges: [
      {
        id: 'registered',
        source: 'card',
        target: 'legacy',
        type: 'custom',
        path: 'bezier',
        markerEnd: 'arrowclosed',
        label: 'registered edge',
      },
      ...(
        ['straight', 'bezier', 'simplebezier', 'step', 'smoothstep'] as const
      ).map((path, index) => ({
        id: `built-in-${path}`,
        source: 'card',
        target: 'legacy',
        sourceHandle: 'out',
        targetHandle: 'in',
        path,
        markerStart: index === 0 ? ('arrow' as const) : undefined,
        markerEnd: index === 0 ? ('arrowclosed' as const) : undefined,
        label: index === 0 ? 'built-in label' : undefined,
      })),
    ],
  })
)

let nextRendererInstance = 0

const makeRegistryNode = (version: 'v1' | 'v2') =>
  defineComponent({
    // SAFETY: FlowCanvas supplies nodes decoded by the FlowDocument schema.
    props: { node: { type: Object as PropType<FlowNode>, required: true } },
    setup(props) {
      nextRendererInstance += 1
      const instanceId = nextRendererInstance
      const activated = ref(false)

      return () =>
        h(
          'section',
          {
            'data-testid': `registry-node-${version}`,
            'data-instance-id': instanceId,
            'data-revision': String(props.node.data?.revision ?? 0),
          },
          [
            h(
              'button',
              {
                type: 'button',
                'data-testid': 'node-control',
                onClick: () => {
                  activated.value = true
                },
              },
              activated.value ? 'Activated' : 'Activate'
            ),
            h('span', props.node.label),
          ]
        )
    },
  })

const RegistryNodeV1 = makeRegistryNode('v1')

const RegistryNodeV2 = makeRegistryNode('v2')

const LegacyNode = defineComponent({
  // SAFETY: FlowCanvas supplies nodes decoded by the FlowDocument schema.
  props: { node: { type: Object as PropType<FlowNode>, required: true } },
  setup(props) {
    return () => h('span', { 'data-testid': 'legacy-node' }, props.node.label)
  },
})

const RegisteredEdge = defineComponent({
  props: {
    // SAFETY: FlowCanvas supplies edges decoded by the FlowDocument schema.
    edge: { type: Object as PropType<FlowEdge>, required: true },
    path: { type: String, required: true },
    markerStart: { type: String, default: undefined },
    markerEnd: { type: String, default: undefined },
  },
  setup(props) {
    return () =>
      h('path', {
        'data-testid': 'registered-edge-path',
        d: props.path,
        fill: 'none',
        stroke: '#dc2626',
        'marker-start': props.markerStart,
        'marker-end': props.markerEnd,
      })
  },
})

const LegacyEdge = defineComponent({
  // SAFETY: FlowCanvas supplies edges decoded by the FlowDocument schema.
  props: { edge: { type: Object as PropType<FlowEdge>, required: true } },
  setup(props) {
    return () =>
      h('path', {
        'data-testid': 'legacy-edge-path',
        d: 'M 0 0 L 1 1',
        'data-edge-id': props.edge.id,
      })
  },
})

const ContractFixtureNode = defineComponent({
  // SAFETY: FlowCanvas supplies nodes decoded by the FlowDocument schema.
  props: { node: { type: Object as PropType<FlowNode>, required: true } },
  setup(props) {
    return () =>
      h(
        'div',
        {
          style: {
            width: `${props.node.data?.width ?? 140}px`,
            height: `${props.node.data?.height ?? 76}px`,
          },
        },
        props.node.label
      )
  },
})

const Root = defineComponent({
  setup() {
    const currentDocument = ref(documentValue)
    const rendererVersion = ref<'v1' | 'v2'>('v1')
    const edgeClicks = ref(0)

    const updateNode = (
      update: (node: FlowNode) => RendererNodeInput | undefined
    ): void => {
      const nodes = currentDocument.value.nodes.flatMap((node) => {
        const replacement = update(node)

        return replacement === undefined ? [] : [replacement]
      })

      const nodeIds = new Set(nodes.map(({ id }) => id))

      const edges = currentDocument.value.edges.filter(
        (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
      )

      currentDocument.value = Effect.runSync(
        decodeFlowDocument({ nodes, edges })
      )
    }

    const registryCanvas = () =>
      h(FlowCanvas, {
        document: currentDocument.value,
        documentMode: 'controlled',
        nodeTypes: {
          card:
            rendererVersion.value === 'v1' ? RegistryNodeV1 : RegistryNodeV2,
        },
        nodeComponent: LegacyNode,
        edgeTypes: { custom: RegisteredEdge },
        onEdgeClick: () => {
          edgeClicks.value += 1
        },
      })

    const legacyCanvas = () =>
      h(FlowCanvas, {
        defaultDocument: documentValue,
        edgeComponent: LegacyEdge,
      })

    return () =>
      h('div', { 'data-testid': 'renderer-contract' }, [
        h(
          'button',
          {
            'data-testid': 'update-node-data',
            onClick: () =>
              updateNode((node) =>
                node.id === 'card'
                  ? {
                      ...node,
                      data: { revision: Number(node.data?.revision ?? 0) + 1 },
                    }
                  : node
              ),
          },
          'Update data'
        ),
        h(
          'button',
          {
            'data-testid': 'replace-node-renderer',
            onClick: () => {
              rendererVersion.value =
                rendererVersion.value === 'v1' ? 'v2' : 'v1'
            },
          },
          'Replace renderer'
        ),
        h(
          'button',
          {
            'data-testid': 'change-handles',
            onClick: () =>
              updateNode((node) =>
                node.id === 'card'
                  ? {
                      ...node,
                      handles: [
                        { id: 'out', kind: 'source', side: 'bottom' },
                        { id: 'aux', kind: 'target', side: 'top' },
                      ],
                    }
                  : node
              ),
          },
          'Change handles'
        ),
        h(
          'button',
          {
            'data-testid': 'remove-card',
            onClick: () =>
              updateNode((node) => (node.id === 'card' ? undefined : node)),
          },
          'Remove card'
        ),
        h(
          'button',
          {
            'data-testid': 'readd-card',
            onClick: () => {
              const card = documentValue.nodes.find(({ id }) => id === 'card')

              if (
                card !== undefined &&
                currentDocument.value.nodes.every(({ id }) => id !== card.id)
              ) {
                currentDocument.value = Effect.runSync(
                  decodeFlowDocument({
                    nodes: [...currentDocument.value.nodes, card],
                    edges: documentValue.edges,
                  })
                )
              }
            },
          },
          'Re-add card'
        ),
        h(
          'output',
          { 'data-testid': 'edge-click-count' },
          String(edgeClicks.value)
        ),
        registryCanvas(),
        registryCanvas(),
        legacyCanvas(),
      ])
  },
})

export const mountRendererContract = (): void => {
  createApp(Root).mount('#app')
}

export const mountSharedRendererContractFixture = (
  input: RendererDocumentInput
): void => {
  const fixtureDocument = Effect.runSync(decodeFlowDocument(input))

  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(FlowCanvas, {
          document: fixtureDocument,
          defaultViewport: { x: 0, y: 0, zoom: 1 },
          nodeTypes: { 'contract-node': ContractFixtureNode },
          edgeTypes: { 'contract-edge': RegisteredEdge },
        }),
    })
  )

  app.mount('#app')
}
