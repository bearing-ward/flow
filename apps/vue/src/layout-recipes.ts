import {
  applyFlowLayoutPositions,
  decodeFlowDocument,
  getFlowLayoutInput,
  orientFlowHandles,
} from '@flow/core'
import type { FlowDocument, FlowLayoutDirection, FlowNode } from '@flow/core'
import { FlowCanvas, useFlow } from '@flow/vue'
import type { FlowActions } from '@flow/vue'
import { Effect } from 'effect'
import { computed, createApp, defineComponent, h, ref } from 'vue'
import type { Component, VNode } from 'vue'

import { DynamicEdge, PlaceholderNode } from './layout-recipes-components.ts'
import {
  dagreLayout,
  elkLayout,
  elkPortId,
  useMeasuredLayout,
} from './layout-recipes-engines.ts'
import type { LayoutPositions } from './layout-recipes-engines.ts'
import { useForceLayout } from './layout-recipes-force.ts'

import '@flow/vue/style.css'

type EncodedDocument = Parameters<typeof decodeFlowDocument>[0]

const decode = (input: EncodedDocument): FlowDocument =>
  Effect.runSync(decodeFlowDocument(input))

const treeHandles = [
  { id: 'in', kind: 'target', side: 'top' },
  { id: 'out', kind: 'source', side: 'bottom' },
] as const

const treeNode = (id: string, label: string) => ({
  id,
  label,
  position: { x: 0, y: 0 },
  handles: treeHandles,
})

const treeEdge = (source: string, target: string) => ({
  id: `${source}-${target}`,
  source,
  sourceHandle: 'out',
  target,
  targetHandle: 'in',
})

/** The shared tree: every node at the origin, labels of clearly different widths. */
const treeDocument = (): FlowDocument =>
  decode({
    nodes: [
      treeNode('1', 'Root'),
      treeNode('2', 'A much longer node label that is wider'),
      treeNode('3', 'Three'),
      treeNode('2a', '2a'),
      treeNode('2b', 'Medium label 2b'),
      treeNode('2c', '2c'),
      treeNode('3a', 'Another rather long label for 3a'),
      treeNode('3b', '3b'),
      treeNode('3c', 'Node 3c'),
      treeNode('3a1', 'Leaf 3a1'),
    ],
    edges: [
      treeEdge('1', '2'),
      treeEdge('1', '3'),
      treeEdge('2', '2a'),
      treeEdge('2', '2b'),
      treeEdge('2', '2c'),
      treeEdge('3', '3a'),
      treeEdge('3', '3b'),
      treeEdge('3', '3c'),
      treeEdge('3a', '3a1'),
    ],
  })

const layouts = ref(0)

const ports = ref('')

/** Apply engine positions and handle sides through one public edit, then fit the view. */
const applyLayout = async (
  flow: FlowActions,
  positions: LayoutPositions,
  direction: FlowLayoutDirection,
  fit = true
): Promise<void> => {
  await flow.setNodes((nodes) =>
    orientFlowHandles(applyFlowLayoutPositions(nodes, positions), direction)
  )

  if (fit) {
    await flow.fitView()
  }

  layouts.value += 1
}

const currentInput = (flow: FlowActions) =>
  getFlowLayoutInput(flow.document.value, flow.getInternalNode)

/** Select only the clicked node; the Vue canvas does not select on click. */
const selectOnly = (flow: FlowActions, nodeId: string) =>
  flow.setNodes((nodes) =>
    nodes.map((node) => ({ ...node, selected: node.id === nodeId }))
  )

interface SceneHandlers {
  readonly controls?: () => VNode[]
  readonly onNodeClick?: (node: FlowNode) => void
  readonly onNodeDragStart?: () => void
  readonly onNodeDragStop?: (node: FlowNode) => void
  readonly status?: () => Readonly<Record<string, string>>
}

interface LayoutScene {
  readonly document: () => FlowDocument
  readonly nodeTypes?: Readonly<Record<string, Component>>
  readonly edgeTypes?: Readonly<Record<string, Component>>
  readonly setup: (flow: FlowActions) => SceneHandlers
}

const button = (testId: string, label: string, onClick: () => Promise<void>) =>
  h('button', { type: 'button', 'data-testid': testId, onClick }, label)

/** Dagre or ELK tree with TB and LR buttons that re-run the layout. */
const treeScene = (engine: 'dagre' | 'elk'): LayoutScene => ({
  document: treeDocument,
  setup: (flow) => {
    let direction: FlowLayoutDirection = 'TB'

    const layout = async (
      input: ReturnType<typeof currentInput>
    ): Promise<void> => {
      const positions =
        engine === 'dagre'
          ? dagreLayout(input, direction)
          : await elkLayout(input, direction, { ports: false })

      await applyLayout(flow, positions, direction)
    }

    useMeasuredLayout(flow, layout)

    const rerun = (next: FlowLayoutDirection) => async () => {
      direction = next
      await layout(currentInput(flow))
    }

    return {
      controls: () => [
        button('layout-tb', 'Vertical layout', rerun('TB')),
        button('layout-lr', 'Horizontal layout', rerun('LR')),
      ],
    }
  },
})

const sourceHandle = (id: string) => ({ id, kind: 'source', side: 'right' })

const target = (id: string) => ({
  id,
  label: id,
  position: { x: 0, y: 0 },
  handles: [{ id: 'in', kind: 'target', side: 'left' }],
})

const elkMultipleHandles: LayoutScene = {
  document: () =>
    decode({
      nodes: [
        {
          id: 's',
          label: 's',
          position: { x: 0, y: 0 },
          size: { width: 120, height: 120 },
          handles: [
            sourceHandle('out-a'),
            sourceHandle('out-b'),
            sourceHandle('out-c'),
          ],
        },
        target('t1'),
        target('t2'),
        target('t3'),
      ],
      edges: [
        { id: 'a-t3', source: 's', sourceHandle: 'out-a', target: 't3' },
        { id: 'b-t1', source: 's', sourceHandle: 'out-b', target: 't1' },
        { id: 'c-t2', source: 's', sourceHandle: 'out-c', target: 't2' },
      ].map((edge) => ({ ...edge, targetHandle: 'in' })),
    }),
  setup: (flow) => {
    useMeasuredLayout(flow, async (input) => {
      ports.value = input.nodes
        .filter(({ id }) => id === 's')
        .flatMap(({ id, handles }) =>
          handles.map(
            (handle) => `${elkPortId(id, handle.id)}@${Math.round(handle.y)}`
          )
        )
        .join(',')

      await applyLayout(
        flow,
        await elkLayout(input, 'LR', { ports: true }),
        'LR',
        // Keep zoom 1: Vue can record handle offsets against a stale zoom right after fitView.
        false
      )
    })

    return { status: () => ({ 'data-ports': ports.value }) }
  },
}

const autoLayout: LayoutScene = {
  document: treeDocument,
  setup: (flow) => {
    let added = 0
    const children: string[] = []

    useMeasuredLayout(flow, async (input) => {
      await applyLayout(flow, dagreLayout(input, 'TB'), 'TB')
    })

    const addChild = async (): Promise<void> => {
      const parent =
        flow.nodes.value.find((node) => node.selected === true)?.id ?? '1'

      added += 1

      const id = `child-${added}`

      children.push(id)

      await flow.applyEdit({
        operations: [
          {
            kind: 'add-nodes',
            nodes: [treeNode(id, `Child ${added}`)],
          },
          { kind: 'add-edges', edges: [treeEdge(parent, id)] },
        ],
      })
    }

    const removeLast = async (): Promise<void> => {
      const last = children.pop()

      if (last !== undefined) {
        await flow.deleteElements({ nodeIds: [last] })
      }
    }

    return {
      controls: () => [
        button('add-child', 'Add child', addChild),
        button('remove-last', 'Remove last', removeLast),
      ],
      onNodeClick: (node) => {
        void selectOnly(flow, node.id)
      },
    }
  },
}

const forceLayout: LayoutScene = {
  document: () => {
    const ids = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8']

    return decode({
      nodes: ids.map((id, index) => ({
        id,
        label: id,
        position: { x: 400 + index * 6, y: 280 + index * 4 },
      })),
      edges: [
        ['f1', 'f2'],
        ['f1', 'f3'],
        ['f2', 'f4'],
        ['f3', 'f5'],
        ['f5', 'f6'],
        ['f6', 'f7'],
        ['f7', 'f8'],
      ].map(([source = '', targetId = '']) => ({
        id: `${source}-${targetId}`,
        source,
        target: targetId,
      })),
    })
  },
  setup: (flow) => {
    const force = useForceLayout(flow, { x: 480, y: 320 })

    return {
      onNodeDragStart: force.onNodeDragStart,
      onNodeDragStop: force.onNodeDragStop,
      status: () => ({
        'data-running': String(force.running.value),
        'data-ticks': String(force.ticks.value),
      }),
    }
  },
}

const dynamicHandles = treeHandles

const dynamicLayouting: LayoutScene = {
  document: () =>
    decode({
      nodes: [
        treeNode('root', 'Root'),
        {
          ...treeNode('placeholder-1', '+'),
          type: 'placeholder',
          handles: dynamicHandles,
        },
      ],
      edges: [{ ...treeEdge('root', 'placeholder-1'), type: 'dynamic' }],
    }),
  nodeTypes: { placeholder: PlaceholderNode },
  edgeTypes: { dynamic: DynamicEdge },
  setup: (flow) => {
    let created = 0
    let placeholders = 1

    useMeasuredLayout(flow, async (input) => {
      await applyLayout(flow, dagreLayout(input, 'TB'), 'TB')
    })

    const placeholderUnder = (parentId: string) => {
      placeholders += 1

      const id = `placeholder-${placeholders}`

      return [
        {
          kind: 'add-nodes',
          nodes: [{ ...treeNode(id, '+'), type: 'placeholder' }],
        },
        {
          kind: 'add-edges',
          edges: [{ ...treeEdge(parentId, id), type: 'dynamic' }],
        },
      ] as const
    }

    const onNodeClick = async (node: FlowNode): Promise<void> => {
      if (node.type !== 'placeholder') {
        await flow.applyEdit({ operations: placeholderUnder(node.id) })

        return
      }

      created += 1

      await flow.applyEdit({
        operations: [
          {
            kind: 'update-node',
            nodeId: node.id,
            patch: { type: 'default', label: `Node ${created}` },
          },
          ...placeholderUnder(node.id),
        ],
      })
    }

    return {
      onNodeClick: (node) => {
        void onNodeClick(node)
      },
      status: () => ({
        'data-nodes': String(
          flow.nodes.value.filter(({ type }) => type !== 'placeholder').length
        ),
        'data-placeholders': String(
          flow.nodes.value.filter(({ type }) => type === 'placeholder').length
        ),
      }),
    }
  },
}

const scenes = {
  'dagre-tree': treeScene('dagre'),
  'elk-tree': treeScene('elk'),
  'elk-multiple-handles': elkMultipleHandles,
  'auto-layout': autoLayout,
  'force-layout': forceLayout,
  'dynamic-layouting': dynamicLayouting,
} satisfies Readonly<Record<string, LayoutScene>>

const sceneName = new URLSearchParams(globalThis.location.search).get('scene')

const scene: LayoutScene | undefined = Object.entries(scenes).find(
  ([name]) => name === sceneName
)?.[1]

if (scene === undefined) {
  throw new Error(`Unknown layout recipe scene: ${String(sceneName)}`)
}

const activeScene = scene

let handlers: SceneHandlers = {}

/** Scene setup, page controls and status, driven by the public `useFlow` state. */
const SceneHost = defineComponent({
  name: 'LayoutSceneHost',
  setup() {
    const flow = useFlow()
    handlers = activeScene.setup(flow)

    const zoom = computed(() => String(flow.viewport.value.zoom))

    return () =>
      h('div', { class: 'recipe-panel flow-vue-no-pan' }, [
        ...(handlers.controls?.() ?? []),
        h(
          'output',
          {
            'data-testid': 'recipe-status',
            'data-layouts': String(layouts.value),
            'data-zoom': zoom.value,
            ...handlers.status?.(),
            'aria-live': 'polite',
          },
          `layouts:${layouts.value}`
        ),
      ])
  },
})

const root = globalThis.document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing Vue layout recipes root')
}

const app = createApp(
  defineComponent({
    name: 'LayoutRecipes',
    setup() {
      return () =>
        h('div', { class: ['recipe-root', `recipe-${String(sceneName)}`] }, [
          h(
            FlowCanvas,
            {
              defaultDocument: activeScene.document(),
              nodeTypes: activeScene.nodeTypes ?? {},
              edgeTypes: activeScene.edgeTypes ?? {},
              onNodeClick: (node: FlowNode) => handlers.onNodeClick?.(node),
              onNodeDragStart: () => handlers.onNodeDragStart?.(),
              onNodeDragStop: (payload: { readonly node: FlowNode }) =>
                handlers.onNodeDragStop?.(payload.node),
            },
            { default: () => h(SceneHost) }
          ),
        ])
    },
  })
)

app.mount(root)

globalThis.addEventListener('pagehide', () => app.unmount(), { once: true })
