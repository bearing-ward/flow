import {
  NodeIdSchema,
  decodeFlowDocument,
  getDropParentId,
  getInternalNodeBounds,
  groupNodes,
  reparentNode,
} from '@flow/core'
import type { FlowNode, FlowRect } from '@flow/core'
import { FlowCanvas, useFlow } from '@flow/vue'
import type { FlowActions } from '@flow/vue'
import { Effect } from 'effect'
import { computed, createApp, defineComponent, h } from 'vue'

import '@flow/vue/style.css'

const GroupNode = defineComponent({
  name: 'RecipeGroupNode',
  inheritAttrs: false,
  props: { label: { type: String, required: true } },
  setup(props) {
    return () =>
      h(
        'div',
        { class: 'recipe-group-body', 'data-testid': 'group-node' },
        props.label
      )
  },
})

const nodeTypes = { group: GroupNode }

const box = (id: string, x: number, y: number) => ({
  id,
  label: id,
  position: { x, y },
  size: { width: 120, height: 50 },
})

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      box('A', 60, 60),
      box('B', 260, 60),
      box('C', 60, 300),
      box('D', 260, 300),
      {
        id: 'G0',
        type: 'group',
        label: 'Group G0',
        position: { x: 520, y: 60 },
        size: { width: 360, height: 320 },
      },
      { ...box('E', 40, 60), parentId: 'G0' },
    ],
    edges: [{ id: 'a-b', source: 'A', target: 'B' }],
  })
)

/** Measured absolute bounds of every node, from the public internal-node API. */
const measuredBounds = (flow: FlowActions): ReadonlyMap<string, FlowRect> =>
  new Map(
    flow.nodes.value.flatMap(({ id }) => {
      const internal = flow.getInternalNode(id)

      if (internal === undefined) {
        return []
      }

      const { bounds } = getInternalNodeBounds(internal)

      return [[id, bounds] as const]
    })
  )

const isGroup = (node: Pick<FlowNode, 'type'>): boolean => node.type === 'group'

let groupCount = 0

/** Example "Selection Grouping": wrap the selected nodes in a new parent. */
const groupSelection = async (flow: FlowActions): Promise<void> => {
  const nodeIds = flow.nodes.value
    .filter((node) => node.selected === true)
    .map(({ id }) => id)

  if (nodeIds.length === 0) {
    return
  }

  const bounds = measuredBounds(flow)
  const groupId = NodeIdSchema.make(`group-${groupCount + 1}`)

  await flow.setNodes((nodes) => {
    const result = groupNodes(nodes, bounds, {
      nodeIds,
      groupId,
      type: 'group',
      label: groupId,
      padding: 20,
    })

    if (result.kind !== 'grouped') {
      return nodes
    }

    groupCount += 1

    return result.nodes
  })
}

/** Example "Parent Child Relation": a dropped node joins the smallest group containing it. */
const reparentDropped = async (
  flow: FlowActions,
  nodeId: string
): Promise<void> => {
  const bounds = measuredBounds(flow)
  const nodeBounds = bounds.get(nodeId)
  const current = flow.getNode(nodeId)

  if (nodeBounds === undefined || current === undefined) {
    return
  }

  const candidates = flow.nodes.value.filter(isGroup).flatMap(({ id }) => {
    const rect = bounds.get(id)

    return rect === undefined ? [] : [{ id, bounds: rect }]
  })

  await flow.setNodes((nodes) => {
    const parentId = getDropParentId(nodes, candidates, nodeId, nodeBounds)

    if (parentId === current.parentId) {
      return nodes
    }

    return reparentNode(
      nodes,
      bounds,
      nodeId,
      parentId === undefined ? undefined : NodeIdSchema.make(parentId)
    )
  })
}

let flowActions: FlowActions | undefined

/** Status and page controls, driven by the public `useFlow` state. */
const RecipeStatus = defineComponent({
  name: 'SubflowsStatus',
  setup() {
    const flow = useFlow()
    flowActions = flow

    const parents = computed(() =>
      flow.nodes.value
        .filter((node) => !isGroup(node))
        .map(({ id, parentId }) => `${id}:${parentId ?? ''}`)
        .toSorted()
        .join(',')
    )

    const nodeIds = computed(() =>
      flow.nodes.value
        .map(({ id }) => id)
        .toSorted()
        .join(',')
    )

    const selected = computed(() =>
      flow.nodes.value
        .filter((node) => node.selected === true)
        .map(({ id }) => id)
        .toSorted()
        .join(',')
    )

    return () =>
      h('div', { class: 'recipe-panel flow-vue-no-pan' }, [
        h(
          'button',
          {
            type: 'button',
            'data-testid': 'group-selection',
            onClick: () => groupSelection(flow),
          },
          'Group selection'
        ),
        h(
          'output',
          {
            'data-testid': 'recipe-status',
            'data-parents': parents.value,
            'data-nodes': nodeIds.value,
            'data-selected': selected.value,
            'aria-live': 'polite',
          },
          parents.value
        ),
      ])
  },
})

const onNodeDragStop = (payload: {
  readonly node: FlowNode
  readonly status: string
}): void => {
  const flow = flowActions

  if (flow === undefined || payload.status !== 'accepted') {
    return
  }

  // Vue commits the drop position on release; read it on the next frame.
  requestAnimationFrame(() => {
    void reparentDropped(flow, payload.node.id)
  })
}

const root = globalThis.document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing Vue sub-flow recipes root')
}

const app = createApp(
  defineComponent({
    name: 'SubflowRecipes',
    setup() {
      return () =>
        h('div', { class: 'recipe-root' }, [
          h(
            FlowCanvas,
            { defaultDocument: document, nodeTypes, onNodeDragStop },
            { default: () => h(RecipeStatus) }
          ),
        ])
    },
  })
)

app.mount(root)

globalThis.addEventListener('pagehide', () => app.unmount(), { once: true })
