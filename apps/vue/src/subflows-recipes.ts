import {
  encodeVersionedFlowDocument,
  decodeVersionedFlowDocument,
  NodeIdSchema,
  decodeFlowDocument,
  getDropParentId,
  getInternalNodeBounds,
  reparentNode,
} from '@flow/core'
import type { FlowNode, FlowRect } from '@flow/core'
import { FlowCanvas, useFlow, useFlowGrouping } from '@flow/vue'
import type { FlowActions } from '@flow/vue'
import { Effect } from 'effect'
import { computed, createApp, defineComponent, h } from 'vue'

import type { GroupingFixture } from '../../../packages/conformance/src/grouping-fixture.ts'

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

let dropBounds: ReadonlyMap<string, FlowRect> | undefined

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
    const rect = (dropBounds ?? bounds).get(id)

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
    const grouping = useFlowGrouping()
    flowActions = flow
    globalThis.flowGroupingFixture = {
      read: () =>
        Promise.resolve({
          document: flow.getSnapshot().document,
          history: flow.history.value,
        }),
      edit: async (input) => {
        await flow.applyEdit(input)
      },
      undo: async () => {
        await flow.undo()
      },
      redo: async () => {
        await flow.redo()
      },
      saveLoad: async () => {
        const saved = JSON.stringify(
          encodeVersionedFlowDocument(flow.getSnapshot().document)
        )

        const restored = await Effect.runPromise(
          decodeVersionedFlowDocument(JSON.parse(saved))
        )

        await flow.applyEdit({
          operations: [
            { kind: 'set-nodes', nodes: restored.nodes },
            { kind: 'set-edges', edges: restored.edges },
          ],
        })
      },
      zoom: async () => {
        await flow.setViewport({ x: 15, y: 25, zoom: 0.75 })
      },
    } satisfies GroupingFixture

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
            hidden: !flow.nodes.value.some((node) => node.selected === true),
            onClick: () => {
              groupCount += 1

              return grouping.execute({
                kind: 'group',
                groupId: NodeIdSchema.make(`group-${groupCount}`),
                nodeIds: flow.nodes.value
                  .filter((node) => node.selected === true)
                  .map(({ id }) => id),
              })
            },
          },
          'Group selection'
        ),
        h(
          'button',
          {
            type: 'button',
            'data-testid': 'ungroup-selection',
            hidden: !flow.nodes.value.some(
              (node) => node.selected === true && isGroup(node)
            ),
            onClick: () => {
              const group = flow.nodes.value.find(
                (node) => node.selected === true && isGroup(node)
              )

              return group === undefined
                ? undefined
                : grouping.execute({ kind: 'ungroup', groupId: group.id })
            },
          },
          'Ungroup'
        ),
        h(
          'button',
          {
            type: 'button',
            'data-testid': 'detach-selection',
            hidden: !flow.nodes.value.some(
              (node) => node.selected === true && node.parentId !== undefined
            ),
            onClick: () =>
              grouping.execute({
                kind: 'detach',
                nodeIds: flow.nodes.value
                  .filter((node) => node.selected === true)
                  .map(({ id }) => id),
              }),
          },
          'Detach'
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
    void reparentDropped(flow, payload.node.id).finally(() => {
      dropBounds = undefined
    })
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
            {
              defaultDocument: document,
              nodeTypes,
              onNodeDragStop,
              onNodeDragStart: () => {
                if (flowActions !== undefined) {
                  dropBounds = measuredBounds(flowActions)
                }
              },
              selectionKeyCode: 'Shift',
              multiSelectionKeyCode: 'Meta',
            },
            { default: () => h(RecipeStatus) }
          ),
        ])
    },
  })
)

app.mount(root)

globalThis.addEventListener('pagehide', () => app.unmount(), { once: true })
