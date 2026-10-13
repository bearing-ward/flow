import {
  decodeFlowDocument,
  getBezierPath,
  getFloatingEdgeParams,
} from '@flow/core'
import type { FlowInternalNode, FlowNode, NodeChange } from '@flow/core'
import { FlowBaseEdge, FlowCanvas, useFlow } from '@flow/vue'
import type { FlowActions, FlowNodeBounds } from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h, onMounted } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'

/** One recorded canvas event: its name and the ids of the nodes it carried. */
export interface HardeningEvent {
  readonly name: string
  readonly nodes?: readonly {
    readonly id: string
    readonly x: number
    readonly y: number
  }[]
  readonly status?: string
}

/** What `getInternalNode` reported at a moment of interest. */
export interface InternalSample {
  readonly at: string
  readonly status: FlowInternalNode['measurementStatus'] | 'missing'
  readonly width: number
  readonly height: number
  readonly handles: number
}

export interface VueHardeningFixture {
  readonly nodes: () => readonly FlowNode[]
  readonly nodeChanges: () => readonly NodeChange[]
  readonly events: () => readonly HardeningEvent[]
  readonly samples: () => readonly InternalSample[]
  readonly internal: (id: string) => FlowInternalNode | undefined
  readonly flow: () => FlowActions
}

declare global {
  interface Window {
    __flowVueHardening?: VueHardeningFixture
  }
}

// SAFETY: FlowCanvas supplies resolved node bounds for both edge endpoints.
const boundsProp = {
  type: Object as PropType<FlowNodeBounds>,
  required: true,
} as const

/** Records `dragging` and its absolute position, so tests can read them mid-drag. */
const ProbeNode = defineComponent({
  inheritAttrs: false,
  props: {
    id: { type: String, required: true },
    dragging: { type: Boolean, required: true },
    positionAbsoluteX: { type: Number, required: true },
  },
  setup(props) {
    return () =>
      h(
        'div',
        {
          class: 'hardening-probe',
          'data-testid': `probe-${props.id}`,
          'data-dragging': String(props.dragging),
          'data-x': props.positionAbsoluteX,
        },
        props.id
      )
  },
})

/** Example "Floating Edges": records the renderer props it drew from. */
const FloatingProbeEdge = defineComponent({
  inheritAttrs: false,
  props: {
    id: { type: String, required: true },
    sourceX: { type: Number, required: true },
    targetX: { type: Number, required: true },
    sourceNode: boundsProp,
    targetNode: boundsProp,
  },
  setup(props) {
    return () => {
      const [path] = getBezierPath(
        getFloatingEdgeParams(props.sourceNode, props.targetNode)
      )

      return h(FlowBaseEdge, {
        path,
        'data-testid': 'floating-probe-path',
        'data-source-x': props.sourceX,
        'data-target-x': props.targetX,
        'data-source-node-x': props.sourceNode.x,
      })
    }
  },
})

/** Draws a detour 100px below the handle-to-handle route. */
const DetourEdge = defineComponent({
  inheritAttrs: false,
  props: {
    id: { type: String, required: true },
    sourceX: { type: Number, required: true },
    sourceY: { type: Number, required: true },
    targetX: { type: Number, required: true },
    targetY: { type: Number, required: true },
  },
  setup(props) {
    return () => {
      const low = Math.max(props.sourceY, props.targetY) + 100

      return h(FlowBaseEdge, {
        path: `M ${props.sourceX},${props.sourceY} L ${props.sourceX},${low} L ${props.targetX},${low} L ${props.targetX},${props.targetY}`,
        'data-testid': 'detour-path',
      })
    }
  },
})

const handles = [
  { id: 'in', kind: 'target', side: 'left' },
  { id: 'out', kind: 'source', side: 'right' },
] as const

const probe = (id: string, x: number, y: number) => ({
  id,
  label: id,
  type: 'probe',
  position: { x, y },
  size: { width: 120, height: 50 },
  handles,
})

const initialDocument = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        probe('a', 80, 80),
        probe('b', 420, 80),
        probe('c', 80, 300),
        probe('d', 420, 300),
      ],
      edges: [
        {
          id: 'e-ab',
          source: 'a',
          sourceHandle: 'out',
          target: 'b',
          targetHandle: 'in',
        },
        {
          id: 'e-ac',
          type: 'floating',
          source: 'a',
          sourceHandle: 'out',
          target: 'c',
          targetHandle: 'in',
        },
        {
          id: 'e-cd',
          type: 'detour',
          source: 'c',
          sourceHandle: 'out',
          target: 'd',
          targetHandle: 'in',
        },
      ],
    })
  )

/**
 * A parent with a child, a node hidden by CSS (`z`) and a node a test can
 * shrink to nothing (`y`).
 */
const nestedDocument = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        { ...probe('p', 80, 80), size: { width: 300, height: 220 } },
        { ...probe('k', 40, 60), parentId: 'p' },
        probe('z', 520, 80),
        probe('y', 520, 300),
      ],
      edges: [],
    })
  )

export interface VueHardeningOptions {
  /** Opt into resize controls on selected nodes. */
  readonly nodesResizable?: boolean
  readonly nodeDragThreshold?: number
  readonly selectNodesOnDrag?: boolean
  readonly scene?: 'default' | 'nested'
}

/** Mount the hardening scene with the given canvas options. */
export const mountVueHardeningFixture = (
  root: HTMLElement,
  options: VueHardeningOptions = {}
): void => {
  const style = document.createElement('style')

  style.textContent = [
    '.flow-vue-node[data-node-id="z"] { display: none; }',
    '.hardening-collapsed .flow-vue-node[data-node-id="y"] { display: none; }',
  ].join('\n')
  document.head.append(style)

  const nodeChanges: NodeChange[] = []
  const events: HardeningEvent[] = []
  const samples: InternalSample[] = []
  let actions: FlowActions | undefined

  const flow = (): FlowActions => {
    if (actions === undefined) {
      throw new Error('Vue hardening fixture is not mounted')
    }

    return actions
  }

  const sample = (at: string): void => {
    const internal = actions?.getInternalNode('a')

    samples.push({
      at,
      status: internal?.measurementStatus ?? 'missing',
      width: internal?.width ?? 0,
      height: internal?.height ?? 0,
      handles: internal?.handles.length ?? 0,
    })
  }

  const record =
    (name: string) =>
    (payload: {
      readonly nodes: readonly FlowNode[]
      readonly status?: string
    }): void => {
      const nodes = payload.nodes.map(({ id, position }) => ({
        id,
        ...position,
      }))

      if (payload.status === undefined) {
        events.push({ name, nodes })
      } else {
        events.push({ name, nodes, status: payload.status })
      }
    }

  const Probe = defineComponent({
    name: 'HardeningProbe',
    setup() {
      actions = useFlow()
      onMounted(() => sample('mounted'))

      return () => null
    },
  })

  window.__flowVueHardening = {
    nodes: () => flow().nodes.value,
    nodeChanges: () => nodeChanges,
    events: () => events,
    samples: () => samples,
    internal: (id) => flow().getInternalNode(id),
    flow,
  }

  createApp(
    defineComponent({
      name: 'HardeningFixture',
      setup() {
        return () =>
          h(
            FlowCanvas,
            {
              defaultDocument:
                options.scene === 'nested'
                  ? nestedDocument()
                  : initialDocument(),
              nodesResizable: options.nodesResizable === true,
              nodeDragThreshold: options.nodeDragThreshold ?? 1,
              selectNodesOnDrag: options.selectNodesOnDrag === true,
              nodeTypes: { probe: ProbeNode },
              edgeTypes: { floating: FloatingProbeEdge, detour: DetourEdge },
              onNodesChange: (changes: readonly NodeChange[]) => {
                nodeChanges.push(...changes)

                if (
                  changes.some(
                    (change) =>
                      change.type === 'dimensions' && change.id === 'a'
                  )
                ) {
                  sample('dimensions')
                }
              },
              onSelectedNodesDragStart: record('selectedNodesDragStart'),
              onSelectedNodesDrag: record('selectedNodesDrag'),
              onSelectedNodesDragStop: record('selectedNodesDragStop'),
            },
            { default: () => h(Probe) }
          )
      },
    })
  ).mount(root)
}
