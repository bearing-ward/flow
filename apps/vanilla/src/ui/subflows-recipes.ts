import {
  encodeVersionedFlowDocument,
  decodeVersionedFlowDocument,
  getDropParentId,
  getInternalNodeBounds,
  NodeIdSchema,
  reparentNode,
} from '@flow/core'
import type {
  FlowIntersectionCandidate,
  FlowNodeBoundsLookup,
} from '@flow/core'
import { createFlowGrouping, mountFlow } from '@flow/vanilla'
import type { FlowNodeRenderer, JavaScriptFlowController } from '@flow/vanilla'
import { Effect } from 'effect'

import type { GroupingFixture } from '../../../../packages/conformance/src/grouping-fixture.ts'
import { createRecipePage, measuredNode, pageButton } from './recipe-page.ts'
import type { RecipeCanvasOwner } from './recipe-page.ts'

import './subflows-recipes.css'

/*
 * Sub-flow recipes: Selection Grouping wraps the selected nodes in a new
 * parent, and Parent Child Relation reparents a node dropped inside a group
 * or detaches it when dropped outside. Both use measured bounds.
 */

const { canvas, status, toolbar } = createRecipePage('subflows')

const flow: RecipeCanvasOwner = { current: undefined }

const groupType = 'group'

/** Absolute measured bounds of every measured node. */
const measuredBounds = (
  controller: JavaScriptFlowController
): FlowNodeBoundsLookup =>
  new Map(
    controller.getNodes().flatMap((node) => {
      const internal = measuredNode(controller, node.id)

      if (internal === undefined) {
        return []
      }

      const { bounds } = getInternalNodeBounds(internal)

      return [[node.id, bounds] as const]
    })
  )

let groupCount = 0

let dropBounds: FlowNodeBoundsLookup | undefined

const groupSelection = async (): Promise<void> => {
  const controller = flow.current

  if (controller === undefined) {
    return
  }

  groupCount += 1
  await createFlowGrouping(controller).execute({
    kind: 'group',
    nodeIds: controller
      .getNodes()
      .filter((node) => node.selected === true)
      .map(({ id }) => id),
    groupId: NodeIdSchema.make(`group-${groupCount}`),
  })
}

/** Reparent each dropped node into the smallest group that contains it, or none. */
const reparentDropped = (nodeIds: readonly string[]): void => {
  const controller = flow.current

  if (controller === undefined) {
    return
  }

  const bounds = measuredBounds(controller)
  const initial = controller.getNodes()
  const candidateBounds = dropBounds ?? bounds

  // Reparenting keeps absolute bounds, so one bounds lookup serves every node.
  let next = initial

  for (const nodeId of nodeIds) {
    const node = next.find(({ id }) => id === nodeId)
    const nodeBounds = bounds.get(nodeId)

    if (node === undefined || nodeBounds === undefined) {
      continue
    }

    const groups = next.flatMap(({ id, type }): FlowIntersectionCandidate[] => {
      const rect = candidateBounds.get(id)

      return type === groupType && rect !== undefined
        ? [{ id, bounds: rect }]
        : []
    })

    const dropParent = getDropParentId(next, groups, nodeId, nodeBounds)

    const parentId =
      dropParent === undefined ? undefined : NodeIdSchema.make(dropParent)

    if (parentId !== node.parentId) {
      next = reparentNode(next, bounds, nodeId, parentId)
    }
  }

  if (next !== initial) {
    void controller.setNodes(next)
  }
}

const groupNode: FlowNodeRenderer = (node, content) => {
  const label = document.createElement('div')

  label.className = 'subflow-group-label'
  label.textContent = node.label
  content.append(label)

  return {
    update: (next) => {
      label.textContent = next.label
    },
    destroy: () => label.remove(),
  }
}

const box = (id: string, x: number, y: number) => ({
  id,
  label: `Node ${id}`,
  position: { x, y },
  size: { width: 120, height: 50 },
})

const controller = mountFlow(
  canvas,
  {
    nodes: [
      box('A', 40, 40),
      box('B', 40, 140),
      box('C', 240, 380),
      box('D', 40, 420),
      {
        id: 'G0',
        label: 'Group G0',
        type: groupType,
        position: { x: 480, y: 60 },
        size: { width: 360, height: 300 },
      },
      { ...box('E', 40, 40), parentId: 'G0' },
    ],
    edges: [{ id: 'a-b', source: 'A', target: 'B' }],
  },
  {
    documentMode: 'uncontrolled',
    selectionKeyCode: 'Shift',
    multiSelectionKeyCode: 'Meta',
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.5, maxZoom: 2 },
    },
    nodeRenderers: { [groupType]: groupNode },
    onNodeDragStart: () => {
      if (flow.current !== undefined) {
        dropBounds = measuredBounds(flow.current)
      }
    },
    onNodeDragStop: ({ nodeIds, outcome }) => {
      if (outcome === 'proposed') {
        reparentDropped(nodeIds)
      }

      dropBounds = undefined
    },
  }
)

flow.current = controller

toolbar.append(
  pageButton('group-selection', 'Group selection', () => {
    void groupSelection()
  })
)

const ungroup = pageButton('ungroup-selection', 'Ungroup', () => {
  const group = controller
    .getNodes()
    .find((node) => node.selected === true && node.type === groupType)

  if (group !== undefined) {
    void createFlowGrouping(controller).execute({
      kind: 'ungroup',
      groupId: group.id,
    })
  }
})

const detach = pageButton('detach-selection', 'Detach', () => {
  void createFlowGrouping(controller).execute({
    kind: 'detach',
    nodeIds: controller
      .getNodes()
      .filter((node) => node.selected === true)
      .map(({ id }) => id),
  })
})

toolbar.append(ungroup, detach)

const report = (): void => {
  const nodes = controller.getNodes()

  const selectedNodes = nodes.filter((node) => node.selected === true)

  const groupButton = toolbar.querySelector<HTMLElement>(
    '[data-testid="group-selection"]'
  )

  if (groupButton !== null) {
    groupButton.hidden = selectedNodes.length === 0
  }

  ungroup.hidden = !selectedNodes.some((node) => node.type === groupType)
  detach.hidden = !selectedNodes.some((node) => node.parentId !== undefined)
  status.value = `nodes:${nodes.length}`
  status.dataset.nodes = nodes.map(({ id }) => id).join(',')
  status.dataset.parents = nodes
    .filter(({ type }) => type !== groupType)
    .map(({ id, parentId }) => `${id}:${parentId ?? ''}`)
    .toSorted()
    .join(',')
  status.dataset.selected = nodes
    .filter(({ selected }) => selected === true)
    .map(({ id }) => id)
    .join(',')
}

report()

controller.subscribeState(report)

globalThis.addEventListener('pagehide', () => controller.destroy(), {
  once: true,
})

// Public API fixture; no graph reducer or browser-event substitution.
globalThis.flowGroupingFixture = {
  read: () =>
    Promise.resolve({
      document: controller.getSnapshot().document,
      history: controller.getHistoryStatus(),
    }),
  edit: async (input) => {
    await controller.applyEdit(input)
  },
  undo: () => controller.undo(),
  redo: () => controller.redo(),
  saveLoad: async () => {
    const saved = JSON.stringify(
      encodeVersionedFlowDocument(controller.getSnapshot().document)
    )

    const restored = await Effect.runPromise(
      decodeVersionedFlowDocument(JSON.parse(saved))
    )

    await controller.applyEdit({
      operations: [
        { kind: 'set-nodes', nodes: restored.nodes },
        { kind: 'set-edges', edges: restored.edges },
      ],
    })
  },
  zoom: async () => {
    await controller.setViewport({ x: 15, y: 25, zoom: 0.75 })
  },
} satisfies GroupingFixture
