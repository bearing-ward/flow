import {
  encodeVersionedFlowDocument,
  decodeVersionedFlowDocument,
  getDropParentId,
  NodeIdSchema,
  reparentNode,
} from '@flow/core'
import type { FlowDocument, FlowNodeBoundsLookup } from '@flow/core'
import {
  createFoldkitGroupingClient,
  createFoldkitHistoryClient,
} from '@flow/foldkit'
import type { FoldkitNodeRenderer } from '@flow/foldkit'
import { Effect } from 'effect'

import type { GroupingFixture } from '../../../../packages/conformance/src/grouping-fixture.ts'
import { measuredBounds, mountRecipeHost } from '../recipe-host.ts'

import './subflows.css'

const box = { width: 140, height: 60 }

const boxNode = (id: string, x: number, y: number) => ({
  id,
  label: id,
  position: { x, y },
  size: box,
  sourcePosition: 'bottom',
  targetPosition: 'bottom',
})

const groupNode: FoldkitNodeRenderer = (flowNode, h) =>
  h.div([h.Class('subflow-group-label')], [flowNode.label])

const host = mountRecipeHost({
  page: 'subflows-page',
  interaction: { selectionKeyCode: 'Shift', multiSelectionKeyCode: 'Meta' },
  document: {
    nodes: [
      boxNode('A', 60, 60),
      boxNode('B', 260, 60),
      boxNode('C', 60, 300),
      boxNode('D', 260, 300),
      {
        id: 'G0',
        label: 'G0',
        type: 'group',
        position: { x: 500, y: 60 },
        size: { width: 340, height: 300 },
      },
      { ...boxNode('E', 40, 60), parentId: 'G0' },
    ],
    edges: [{ id: 'a-b', source: 'A', target: 'B' }],
  },
  registry: { nodeTypes: { group: groupNode } },
})

const isGroup = (id: string, document: FlowDocument): boolean =>
  document.nodes.some(
    (flowNode) => flowNode.id === id && flowNode.type === 'group'
  )

const render = (document: FlowDocument): void => {
  host.status.dataset.nodes = document.nodes
    .map(({ id }) => id)
    .toSorted()
    .join(',')
  host.status.dataset.parents = document.nodes
    .filter(({ type }) => type !== 'group')
    .map(({ id, parentId }) => `${id}:${parentId ?? ''}`)
    .toSorted()
    .join(',')
  host.status.value = `parents:${host.status.dataset.parents}`
}

const grouping = createFoldkitGroupingClient(host.runtime.ports)

host.onDispose(grouping.dispose)

let groupNumber = 0

const groupButton = host.button('group-selection', 'Group selection')

const ungroup = host.button('ungroup-selection', 'Ungroup')

const detach = host.button('detach-selection', 'Detach')

groupButton.addEventListener('click', () => {
  groupNumber += 1
  void grouping.execute({
    kind: 'group',
    groupId: NodeIdSchema.make(`group-${groupNumber}`),
    nodeIds: host
      .document()
      .nodes.filter((node) => node.selected === true)
      .map(({ id }) => id),
  })
})

ungroup.addEventListener('click', () => {
  const group = host
    .document()
    .nodes.find((node) => node.selected === true && node.type === 'group')

  if (group !== undefined) {
    void grouping.execute({ kind: 'ungroup', groupId: group.id })
  }
})

detach.addEventListener('click', () => {
  void grouping.execute({
    kind: 'detach',
    nodeIds: host
      .document()
      .nodes.filter((node) => node.selected === true)
      .map(({ id }) => id),
  })
})

const report = (document: FlowDocument) => {
  render(document)
  const selected = document.nodes.filter((node) => node.selected === true)
  groupButton.hidden = selected.length === 0
  ungroup.hidden = !selected.some((node) => node.type === 'group')
  detach.hidden = !selected.some((node) => node.parentId !== undefined)
}

report(host.document())

let measureFrame: number | undefined

host.onAccepted((document) => {
  report(document)

  if (measureFrame === undefined) {
    measureFrame = requestAnimationFrame(() => {
      measureFrame = undefined
      host.remeasure()
    })
  }
})

host.onDispose(() => {
  if (measureFrame !== undefined) {
    cancelAnimationFrame(measureFrame)
  }
})

let dropBounds: Promise<FlowNodeBoundsLookup> | undefined

const stopDragEvents = host.runtime.ports.interactionEvents.subscribe(
  (events) => {
    if (events.some((event) => event.name === 'onNodeDragStart')) {
      dropBounds = host.snapshots
        .requestVersioned({ internalNodes: true })
        .then((result) =>
          result.status === 'succeeded'
            ? measuredBounds(
                new Map(
                  (result.response.internalNodes ?? []).map((internal) => [
                    internal.node.id,
                    internal,
                  ])
                )
              )
            : new Map()
        )
    }
  }
)

host.onDispose(stopDragEvents)

// Parent Child Relation: a committed drag re-parents the dropped node.
const reparent = async (nodeId: string): Promise<void> => {
  const baseline = dropBounds
  const { document, internals } = await host.measuredState()
  const bounds = measuredBounds(internals)
  const dropped = bounds.get(nodeId)
  const flowNode = document.nodes.find(({ id }) => id === nodeId)

  if (dropped === undefined || flowNode === undefined) {
    return
  }

  const candidateBounds = await (baseline ?? Promise.resolve(bounds))

  const candidates = document.nodes.flatMap(({ id }) => {
    const rect = candidateBounds.get(id)

    return isGroup(id, document) && rect !== undefined
      ? [{ id, bounds: rect }]
      : []
  })

  const dropParent = getDropParentId(
    document.nodes,
    candidates,
    nodeId,
    dropped
  )

  const parentId =
    dropParent === undefined ? undefined : NodeIdSchema.make(dropParent)

  if (parentId === flowNode.parentId) {
    return
  }

  await host.edit([
    {
      kind: 'set-nodes',
      nodes: reparentNode(document.nodes, bounds, nodeId, parentId),
    },
  ])
}

host.onChange((change) => {
  if (change.kind === 'node-position') {
    void reparent(change.nodeId)
    dropBounds = undefined
  }

  if (change.kind === 'node-positions') {
    for (const { nodeId } of change.positions) {
      void reparent(nodeId)
    }

    dropBounds = undefined
  }
})

const history = createFoldkitHistoryClient(host.runtime.ports)

host.onDispose(history.dispose)

globalThis.flowGroupingFixture = {
  read: async () => {
    const state = await host.measuredState()

    return {
      document: state.document,
      history: await history.getStatus(),
      diagnostics: [...state.internals.values()].map((node) => ({
        id: node.node.id,
        status: node.measurementStatus,
        width: node.width,
        height: node.height,
      })),
    }
  },
  edit: async (input) => {
    await host.edit(input.operations)
  },
  undo: async () => {
    await history.undo()
  },
  redo: async () => {
    await history.redo()
  },
  saveLoad: async () => {
    const state = await host.measuredState()
    const saved = JSON.stringify(encodeVersionedFlowDocument(state.document))

    const restored = await Effect.runPromise(
      decodeVersionedFlowDocument(JSON.parse(saved))
    )

    await host.edit([
      { kind: 'set-nodes', nodes: restored.nodes },
      { kind: 'set-edges', edges: restored.edges },
    ])
  },
  zoom: async () => {
    await host.viewportClient.setViewport({ x: 15, y: 25, zoom: 0.75 })
  },
} satisfies GroupingFixture
