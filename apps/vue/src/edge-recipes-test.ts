import { decodeFlowDocument } from '@flow/core'
import type {
  FlowConnection,
  FlowDefaultEdgeOptions,
  FlowDocument,
} from '@flow/core'
import { FlowCanvas, useFlow } from '@flow/vue'
import type { FlowActions } from '@flow/vue'
import { Effect } from 'effect'
import { computed, createApp, defineComponent, h } from 'vue'
import type { Component, VNode } from 'vue'

import {
  AnimatedSvgEdge,
  ButtonEdge,
  DataEdge,
  EasyConnectionLine,
  EasyNode,
  FloatingEdge,
  MarkerEdge,
  MultiConnectionLine,
  SimpleFloatingEdge,
} from './edge-recipes-components.ts'

import '@flow/vue/style.css'

type EncodedDocument = Parameters<typeof decodeFlowDocument>[0]

const decode = (input: EncodedDocument): FlowDocument =>
  Effect.runSync(decodeFlowDocument(input))

const edgeTypes = {
  button: ButtonEdge,
  data: DataEdge,
  'animated-svg': AnimatedSvgEdge,
  floating: FloatingEdge,
  'simple-floating': SimpleFloatingEdge,
  marker: MarkerEdge,
}

/** Hidden source and target handles; floating edges ignore their positions. */
const hiddenHandles = [
  { id: 'out', kind: 'source', side: 'bottom' },
  { id: 'in', kind: 'target', side: 'top' },
] as const

const pair = (id: string, x: number, y: number) => ({
  id,
  label: id.toUpperCase(),
  position: { x, y },
  handles: [
    { id: 'in', kind: 'target', side: 'left' },
    { id: 'out', kind: 'source', side: 'right' },
  ],
})

const link = (id: string, source: string, target: string) => ({
  id,
  source,
  sourceHandle: 'out',
  target,
  targetHandle: 'in',
})

const sourceSize = { width: 100, height: 40 }

const floatingNode = (
  id: string,
  x: number,
  y: number,
  size: { readonly width: number; readonly height: number }
) => ({
  id,
  label: id,
  position: { x, y },
  size,
  handles: hiddenHandles,
})

const floatingDocument = (type: string): FlowDocument => {
  const sources = [
    floatingNode('top', 430, 60, sourceSize),
    floatingNode('right', 760, 284, sourceSize),
    floatingNode('bottom-right', 720, 470, sourceSize),
    floatingNode('left', 100, 284, sourceSize),
  ]

  return decode({
    nodes: [
      floatingNode('target', 420, 280, { width: 120, height: 48 }),
      ...sources,
    ],
    edges: sources.map(({ id }, index) => ({
      id: `e-${index}`,
      type,
      source: id,
      target: 'target',
      markerEnd: 'arrowclosed',
    })),
  })
}

interface Scene {
  readonly className?: string
  readonly document: () => FlowDocument
  readonly canvas?: {
    readonly connectionMode: 'loose'
    readonly defaultEdgeOptions: FlowDefaultEdgeOptions
  }
  readonly nodeTypes?: Readonly<Record<string, Component>>
  readonly connectionPreview?: Component
  readonly controls?: (flow: FlowActions) => VNode[]
  /** Runs after the canvas accepted a new connection and added its edge. */
  readonly onConnected?: (flow: FlowActions, connection: FlowConnection) => void
}

const easyNode = (id: string, x: number, y: number) => ({
  id,
  label: `Node ${id}`,
  type: 'easy',
  position: { x, y },
  size: { width: 150, height: 80 },
  handles: [{ id: 'body', kind: 'source', side: 'top' }],
})

const multiEdges = (flow: FlowActions, connection: FlowConnection) => {
  const selected = flow.nodes.value
    .filter((node) => node.selected === true)
    .map((node) => node.id)

  if (!selected.includes(connection.source)) {
    return []
  }

  return selected
    .filter((id) => id !== connection.source)
    .map((id) => ({
      ...connection,
      id: `multi-${id}-${connection.target}`,
      source: id,
    }))
}

const scenes = {
  'button-edge': {
    document: () =>
      decode({
        nodes: [pair('a', 60, 80), pair('b', 380, 240), pair('c', 700, 80)],
        edges: [
          { ...link('e-ab', 'a', 'b'), type: 'button' },
          { ...link('e-bc', 'b', 'c'), type: 'button' },
        ],
      }),
  },
  'data-edge': {
    document: () =>
      decode({
        nodes: [
          { ...pair('a', 60, 80), data: { value: 'alpha' } },
          pair('b', 460, 260),
        ],
        edges: [
          { ...link('e-ab', 'a', 'b'), type: 'data', data: { key: 'value' } },
        ],
      }),
    controls: (flow) => [
      h(
        'button',
        {
          type: 'button',
          'data-testid': 'update-node-data',
          onClick: () => flow.updateNodeData('a', { value: 'beta' }),
        },
        'Update node data'
      ),
    ],
  },
  'animated-svg-edge': {
    document: () =>
      decode({
        nodes: [pair('a', 60, 80), pair('b', 520, 300)],
        edges: [{ ...link('e-ab', 'a', 'b'), type: 'animated-svg' }],
      }),
  },
  'floating-edges': {
    className: 'recipe-hidden-handles',
    document: () => floatingDocument('floating'),
  },
  'simple-floating-edges': {
    className: 'recipe-hidden-handles',
    document: () => floatingDocument('simple-floating'),
  },
  'easy-connect': {
    className: 'recipe-easy-connect',
    document: () =>
      decode({
        nodes: [
          easyNode('1', 80, 80),
          easyNode('2', 520, 80),
          easyNode('3', 80, 380),
          easyNode('4', 520, 380),
        ],
        edges: [],
      }),
    nodeTypes: { easy: EasyNode },
    connectionPreview: EasyConnectionLine,
    canvas: {
      connectionMode: 'loose',
      defaultEdgeOptions: { type: 'floating', markerEnd: 'arrowclosed' },
    },
  },
  'edge-markers': {
    document: () =>
      decode({
        nodes: [
          pair('a', 60, 40),
          pair('b', 500, 40),
          pair('c', 60, 200),
          pair('d', 500, 200),
          pair('e', 60, 360),
          pair('f', 500, 360),
          pair('g', 60, 500),
          pair('h', 500, 500),
        ],
        edges: [
          {
            ...link('arrow', 'a', 'b'),
            markerEnd: 'arrow',
            stroke: '#2563eb',
          },
          {
            ...link('arrowclosed', 'c', 'd'),
            markerEnd: 'arrowclosed',
            stroke: '#16a34a',
          },
          {
            ...link('both', 'e', 'f'),
            markerStart: 'arrowclosed',
            markerEnd: 'arrow',
            stroke: '#9333ea',
          },
          {
            ...link('custom', 'g', 'h'),
            type: 'marker',
            data: {
              start: 'circle',
              end: 'diamond',
              color: '#e11d48',
              size: 16,
            },
          },
        ],
      }),
  },
  'multi-connection-line': {
    className: 'recipe-multi-connection',
    document: () =>
      decode({
        nodes: [
          {
            ...pair('s1', 80, 80),
            selected: true,
            handles: [{ id: 'out', kind: 'source', side: 'right' }],
          },
          {
            ...pair('s2', 80, 240),
            selected: true,
            handles: [{ id: 'out', kind: 'source', side: 'right' }],
          },
          {
            ...pair('s3', 80, 400),
            handles: [{ id: 'out', kind: 'source', side: 'right' }],
          },
          {
            ...pair('t', 560, 240),
            handles: [{ id: 'in', kind: 'target', side: 'left' }],
          },
        ],
        edges: [],
      }),
    connectionPreview: MultiConnectionLine,
    onConnected: (flow, connection) => {
      const extra = multiEdges(flow, connection)

      if (extra.length > 0) {
        void flow.addEdges(extra)
      }
    },
  },
} satisfies Readonly<Record<string, Scene>>

const sceneName = new URLSearchParams(globalThis.location.search).get('scene')

const scene: Scene | undefined = Object.entries(scenes).find(
  ([name]) => name === sceneName
)?.[1]

if (scene === undefined) {
  throw new Error(`Unknown edge recipe scene: ${String(sceneName)}`)
}

const activeScene = scene

let flowActions: FlowActions | undefined

/** Status and page controls, driven by the public `useFlow` state. */
const RecipeStatus = defineComponent({
  name: 'EdgeRecipeStatus',
  setup() {
    const flow = useFlow()
    flowActions = flow

    const status = computed(
      () => `edges:${flow.edges.value.map(({ id }) => id).join(',')}`
    )

    const links = computed(() =>
      flow.edges.value
        .map(({ source, target }) => `${source}>${target}`)
        .join(',')
    )

    return () =>
      h('div', { class: 'recipe-panel flow-vue-no-pan' }, [
        ...(activeScene.controls?.(flow) ?? []),
        h(
          'output',
          {
            'data-testid': 'recipe-status',
            'data-links': links.value,
            'aria-live': 'polite',
          },
          status.value
        ),
      ])
  },
})

const root = globalThis.document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing Vue edge recipes root')
}

const onConnectEnd = (payload: {
  readonly status: string
  readonly connection?: FlowConnection
}): void => {
  if (
    flowActions !== undefined &&
    payload.status === 'accepted' &&
    payload.connection !== undefined
  ) {
    activeScene.onConnected?.(flowActions, payload.connection)
  }
}

const app = createApp(
  defineComponent({
    name: 'EdgeRecipes',
    setup() {
      const canvasProps = {
        class: 'recipe-canvas',
        defaultDocument: activeScene.document(),
        edgeTypes,
        nodeTypes: activeScene.nodeTypes ?? {},
        ...activeScene.canvas,
        onConnectEnd,
      }

      const slots = { default: () => h(RecipeStatus) }
      const preview = activeScene.connectionPreview

      return () =>
        h('div', { class: ['recipe-root', activeScene.className] }, [
          preview === undefined
            ? h(FlowCanvas, canvasProps, slots)
            : h(
                FlowCanvas,
                { ...canvasProps, connectionPreview: preview },
                slots
              ),
        ])
    },
  })
)

app.mount(root)

globalThis.addEventListener('pagehide', () => app.unmount(), { once: true })
