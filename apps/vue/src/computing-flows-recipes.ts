import { decodeFlowDocument } from '@flow/core'
import type { FlowNode } from '@flow/core'
import { FlowCanvas, useFlow, useNodeConnections } from '@flow/vue'
import { Effect, Schema as S } from 'effect'
import { computed, createApp, defineComponent, h, watch } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'

const TextDataSchema = S.Struct({ text: S.String })

const textOf = (data: FlowNode['data'] | undefined): string | undefined =>
  S.is(TextDataSchema)(data) ? data.text : undefined

const nodeProps = {
  id: { type: String, required: true },
  // SAFETY: FlowCanvas forwards the accepted node's JSON data, or undefined.
  data: { type: Object as PropType<FlowNode['data']>, default: undefined },
} as const

/** UseNodesData "TextNode": an input that writes the node's own data. */
const TextNode = defineComponent({
  name: 'RecipeTextNode',
  inheritAttrs: false,
  props: nodeProps,
  setup(props) {
    const flow = useFlow()

    const onInput = (event: Event): void => {
      if (event.target instanceof HTMLInputElement) {
        void flow.updateNodeData(props.id, { text: event.target.value })
      }
    }

    return () =>
      h('div', { class: 'recipe-compute-node' }, [
        h('span', `node ${props.id}`),
        h('input', {
          class: 'nodrag flow-vue-no-drag',
          'data-testid': `text-input-${props.id}`,
          'aria-label': `Text of ${props.id}`,
          value: textOf(props.data) ?? '',
          onInput,
        }),
      ])
  },
})

/** UseNodesData "UppercaseNode": stores the upstream text in upper case in its own data. */
const UppercaseNode = defineComponent({
  name: 'RecipeUppercaseNode',
  inheritAttrs: false,
  props: nodeProps,
  setup(props) {
    const flow = useFlow()
    const connections = useNodeConnections({ type: 'target' })

    const upstream = computed(() => {
      const source = connections.value[0]?.source

      return source === undefined
        ? []
        : flow
            .getNodesData([source])
            .value.filter(({ type }) => type === 'text')
    })

    const computedText = computed(
      () => textOf(upstream.value[0]?.data)?.toUpperCase() ?? ''
    )

    watch(
      computedText,
      (text) => {
        if (textOf(props.data) !== text) {
          void flow.updateNodeData(props.id, { text })
        }
      },
      { immediate: true }
    )

    return () =>
      h('div', { class: 'recipe-compute-node' }, [
        h('span', 'uppercase transform'),
        h('strong', { 'data-testid': 'upper-value' }, textOf(props.data)),
      ])
  },
})

/** UseNodesData "ResultNode": lists the texts of every connected source. */
const ResultNode = defineComponent({
  name: 'RecipeResultNode',
  inheritAttrs: false,
  setup() {
    const flow = useFlow()
    const connections = useNodeConnections({ type: 'target' })

    const texts = computed(() =>
      flow
        .getNodesData(connections.value.map(({ source }) => source))
        .value.filter(({ type }) => type === 'text' || type === 'uppercase')
        .map(({ data }) => textOf(data) ?? '')
    )

    return () =>
      h('div', { class: 'recipe-compute-node' }, [
        h('span', 'incoming texts'),
        h('strong', { 'data-testid': 'result-value' }, texts.value.join(', ')),
      ])
  },
})

const nodeTypes = {
  text: TextNode,
  uppercase: UppercaseNode,
  result: ResultNode,
}

const input = { id: 'in', kind: 'target', side: 'left' } as const

const output = { id: 'out', kind: 'source', side: 'right' } as const

const link = (source: string, target: string) => ({
  id: `${source}>${target}`,
  source,
  sourceHandle: 'out',
  target,
  targetHandle: 'in',
})

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'text-1',
        type: 'text',
        label: 'text-1',
        data: { text: 'hello' },
        position: { x: 60, y: 60 },
        handles: [output],
      },
      {
        id: 'text-2',
        type: 'text',
        label: 'text-2',
        data: { text: 'world' },
        position: { x: 60, y: 260 },
        handles: [output],
      },
      {
        id: 'upper',
        type: 'uppercase',
        label: 'upper',
        data: { text: '' },
        position: { x: 320, y: 60 },
        handles: [input, output],
      },
      {
        id: 'result',
        type: 'result',
        label: 'result',
        position: { x: 580, y: 160 },
        handles: [input],
      },
    ],
    edges: [
      link('text-1', 'upper'),
      link('upper', 'result'),
      link('text-2', 'result'),
    ],
  })
)

/** Status and page controls, driven by the public `useFlow` state. */
const RecipeStatus = defineComponent({
  name: 'ComputingFlowsStatus',
  setup() {
    const flow = useFlow()

    const upper = computed(() => textOf(flow.getNode('upper')?.data) ?? '')

    const links = computed(() => flow.edges.value.map(({ id }) => id).join(','))

    return () =>
      h('div', { class: 'recipe-panel flow-vue-no-pan' }, [
        h(
          'button',
          {
            type: 'button',
            'data-testid': 'disconnect-text-2',
            onClick: () => flow.deleteElements({ edgeIds: ['text-2>result'] }),
          },
          'Disconnect text-2'
        ),
        h(
          'output',
          {
            'data-testid': 'recipe-status',
            'data-upper': upper.value,
            'data-edges': links.value,
            'aria-live': 'polite',
          },
          `edges:${links.value}`
        ),
      ])
  },
})

const root = globalThis.document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing Vue computing flows root')
}

const app = createApp(
  defineComponent({
    name: 'ComputingFlowsRecipe',
    setup() {
      return () =>
        h('div', { class: 'recipe-root' }, [
          h(
            FlowCanvas,
            { defaultDocument: document, nodeTypes },
            { default: () => h(RecipeStatus) }
          ),
        ])
    },
  })
)

app.mount(root)

globalThis.addEventListener('pagehide', () => app.unmount(), { once: true })
