import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  decodeFlowDocument,
  EdgeIdSchema,
  HandleIdSchema,
  getBezierPath,
  getEdgeCenter,
  getSimpleBezierPath,
  getSmoothStepPath,
  getStraightPath,
  isEdge,
  isNode,
  NodeIdSchema,
  reconnectEdge,
} from '@flow/core'
import type { FlowEdge } from '@flow/core'
import {
  createFlow,
  createFlowBaseNode,
  createFlowBaseHandle,
  createFlowControlButton,
  createFlowStatusIndicator,
  updateFlowStatusIndicator,
  createFlowTooltip,
  createFlowAppendix,
  createFlowLabeledHandleLabel,
  createFlowDatabaseSchema,
  createFlowPlaceholder,
} from '@flow/vanilla'
import { Effect, Schema as S } from 'effect'

import '@flow/vanilla/style.css'

declare global {
  interface Window {
    __flowPackedFitSerialization?: {
      raw: string
      actual: string | undefined
      canonical: string
    }
    __flowPackedUI?: { dispose: () => void; exercise: () => Promise<string> }
    __flowConsumerController?: Awaited<ReturnType<typeof createFlow>>
    __flowConsumerResult?: {
      readonly decodedNodeId: string
      readonly canvasCount: number
      readonly initialSnapshotNodeId: string | undefined
      readonly updatedNodeId: string | undefined
      readonly stateNotificationCount: number
      readonly editResult: string
      readonly utilityResult: string
    }
  }
}

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'packed-node',
        label: 'Packed consumer',
        position: { x: 45, y: 60 },
      },
    ],
    edges: [],
  })
)

const [utilityNode] = document.nodes

if (utilityNode === undefined) {
  throw new Error('Missing utility fixture node')
}

const utilityEdge: FlowEdge = {
  id: S.decodeUnknownSync(EdgeIdSchema)('utility-edge'),
  source: utilityNode.id,
  target: utilityNode.id,
}

const otherNodeId = S.decodeUnknownSync(NodeIdSchema)('other-node')

const utilityNodes = applyNodeChanges(
  [{ id: utilityNode.id, type: 'select', selected: true }],
  document.nodes
)

const utilityEdges = applyEdgeChanges(
  [{ type: 'add', item: utilityEdge }],
  document.edges
)

const addedUtilityEdges = addEdge(
  { source: utilityNode.id, target: otherNodeId },
  []
)

const reconnectedUtilityEdges = reconnectEdge(
  utilityEdge,
  { source: otherNodeId, target: utilityNode.id },
  [utilityEdge],
  { shouldReplaceId: false }
)

const utilityResult = [
  utilityNodes[0]?.selected === true,
  utilityEdges[0]?.id === 'utility-edge',
  addedUtilityEdges[0]?.id === `xy-edge__${utilityNode.id}-other-node`,
  reconnectedUtilityEdges[0]?.source === otherNodeId,
  isNode(utilityNode),
  isEdge(utilityEdge),
  getEdgeCenter({ sourceX: 0, sourceY: 0, targetX: 20, targetY: 10 }).join(','),
  getStraightPath({
    sourceX: 0,
    sourceY: 0,
    targetX: 10,
    targetY: 10,
  })[0].startsWith('M '),
  getBezierPath({
    sourceX: 0,
    sourceY: 0,
    targetX: 10,
    targetY: 10,
  })[0].startsWith('M'),
  getSimpleBezierPath({
    sourceX: 0,
    sourceY: 0,
    targetX: 10,
    targetY: 10,
  })[0].startsWith('M'),
  getSmoothStepPath({
    sourceX: 0,
    sourceY: 0,
    targetX: 10,
    targetY: 10,
  })[0].startsWith('M'),
].join(':')

const root = globalThis.document.querySelector<HTMLElement>('#root')

if (root === null) {
  throw new Error('Missing consumer root')
}

const controller = await createFlow(root, document, {
  documentMode: 'uncontrolled',
  viewport: {
    mode: 'uncontrolled',
    initial: { x: 0, y: 0, zoom: 1 },
    limits: { minZoom: 0.5, maxZoom: 2 },
  },
})

window.__flowConsumerController = controller

let stateNotificationCount = 0

const stopState = controller.subscribeState(() => {
  stateNotificationCount += 1
})

const initialSnapshotNodeId = controller.getSnapshot().document.nodes[0]?.id

controller.update({
  nodes: [
    {
      id: 'packed-updated',
      label: 'Packed update',
      position: { x: 55, y: 65 },
    },
  ],
  edges: [],
})

const updatedNodeId = controller.getNode('packed-updated')?.id

stopState()

controller.updateViewport({ x: 5, y: 6, zoom: 1.25 })

const stateChangeAfterUnsubscribe = stateNotificationCount

await controller.setNodes([
  { id: 'edit-a', label: 'A', position: { x: 20, y: 20 }, data: { n: 1 } },
])

let updaterCalls = 0

await controller.setNodes((nodes) => nodes)

await controller.addNodes({
  id: 'edit-b',
  label: 'B',
  position: { x: 220, y: 20 },
})

await controller.setEdges([])

await controller.addEdges({
  id: 'edit-edge',
  source: 'edit-a',
  target: 'edit-b',
  data: { weight: 1 },
})

await controller.updateNode('edit-a', { label: 'A updated' })

await controller.updateNodeData('edit-a', { n: 2 })

await controller.updateNodeData('edit-a', (data) => {
  updaterCalls += 1

  return { n: Number(data.n ?? 0) + 1 }
})

await controller.updateEdge('edit-edge', { label: 'A to B' })

await controller.updateEdgeData('edit-edge', { weight: 2 })

await controller.updateEdgeData('edit-edge', (data) => {
  updaterCalls += 1

  return { weight: Number(data.weight ?? 0) + 1 }
})

const edgeWeightBeforeDelete = controller.getEdge('edit-edge')?.data?.weight

const deletion = await controller.deleteElements({ nodeIds: ['edit-b'] })

const editResult = `${controller.getNode('edit-a')?.label}:${controller.getNode('edit-a')?.data?.n}:${edgeWeightBeforeDelete}:${updaterCalls}:${controller.getEdge('edit-edge') === undefined}:${deletion.deletedNodeIds.join(',')}:${deletion.deletedEdgeIds.join(',')}`

window.__flowConsumerResult = {
  decodedNodeId: document.nodes[0]?.id ?? 'missing',
  canvasCount: root.querySelectorAll("[data-testid='flow-canvas']").length,
  initialSnapshotNodeId,
  updatedNodeId,
  stateNotificationCount: stateChangeAfterUnsubscribe,
  editResult,
  utilityResult,
}

const uiOwner = globalThis.document

const uiHost = uiOwner.createElement('section')

uiHost.dataset.packedUi = ''

const state = createFlowStatusIndicator(uiOwner, {
  status: 'waiting',
  label: 'Waiting',
})

const action = createFlowControlButton(uiOwner, {
  type: 'button',
  name: 'packed-action',
  value: 'refresh',
  aria: { 'aria-label': 'Packed action' },
  children: [uiOwner.createTextNode('Refresh')],
  onClick: () => updateFlowStatusIndicator(state, 'ready', 'Ready'),
})

action.dataset.packedAction = ''

const details = createFlowDatabaseSchema(uiOwner, {
  name: 'users',
  fields: [
    { id: 'id', name: 'id', type: 'uuid', kind: 'source', side: 'right' },
  ],
})

const appendix = createFlowAppendix(uiOwner, {
  id: 'packed-details',
  label: 'Details',
  content: details,
})

const placeholder = createFlowPlaceholder(uiOwner, {
  label: 'Add table',
  onActivate: () => {
    uiHost.dataset.added = 'true'
  },
})

placeholder.dataset.packedPlaceholder = ''

const handle = createFlowBaseHandle({
  id: S.decodeUnknownSync(HandleIdSchema)('packed-output'),
  kind: 'source',
  side: 'right',
})

const label = createFlowLabeledHandleLabel(
  { handle, label: 'Packed output' },
  uiOwner
)

uiHost.append(state, action, appendix.element, label, placeholder)

uiOwner.body.append(uiHost)

const tooltip = createFlowTooltip(uiOwner, {
  trigger: action,
  text: 'Packed tooltip',
})

const controlledRoot = uiOwner.createElement('div')

const independentRoot = uiOwner.createElement('div')

controlledRoot.style.cssText = 'width:480px;height:320px'

independentRoot.style.cssText = 'width:480px;height:320px'

uiOwner.body.append(controlledRoot, independentRoot)

const customDocument = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'custom',
        label: 'Before acknowledgement',
        type: 'packed-custom',
        position: { x: 20, y: 20 },
        handles: [handle],
      },
    ],
    edges: [],
  })
)

const uiViewport = {
  mode: 'uncontrolled' as const,
  initial: { x: 0, y: 0, zoom: 1 },
  limits: { minZoom: 0.5, maxZoom: 2 },
}

const controlled = await createFlow(controlledRoot, customDocument, {
  documentMode: 'controlled',
  viewport: uiViewport,
  nodeRenderers: {
    'packed-custom': (node, content) => {
      const shell = createFlowBaseNode(uiOwner, {
        title: node.label,
        content: uiOwner.createTextNode('Packed custom renderer'),
      })

      content.append(shell)

      return {
        update: (next) => {
          shell.setAttribute('aria-label', next.label)
          const title = shell.querySelector('h2')

          if (title !== null) {
            title.textContent = next.label
          }
        },
        destroy: () => shell.remove(),
      }
    },
  },
})

const independent = await createFlow(independentRoot, customDocument, {
  documentMode: 'uncontrolled',
  viewport: uiViewport,
})

window.__flowPackedUI = {
  exercise: async () => {
    const proposal = await controlled.updateNode('custom', {
      label: 'After acknowledgement',
    })

    const before = controlled.getNode('custom')?.label
    controlled.update(proposal.document)
    const after = controlled.getNode('custom')?.label
    await controlled.updateNodeInternals(['custom'])
    const internal = controlled.getInternalNode('custom')
    const beforeFit = controlled.getViewport()
    const fit = await controlled.fitView({ duration: 0 })
    const applied = controlled.getViewport()

    const renderedViewport = controlledRoot.querySelector<HTMLElement>(
      '[data-testid="flow-viewport"]'
    )

    if (renderedViewport === null) {
      throw new Error('Packed Vanilla fitted viewport DOM is missing')
    }

    const expectedTransform = `translate(${applied.x}px, ${applied.y}px) scale(${applied.zoom})`
    const expectedStyle = uiOwner.createElement('div').style
    expectedStyle.transform = expectedTransform
    const expectedSerializedTransform = expectedStyle.transform

    const fitChecks = {
      finite:
        [applied.x, applied.y, applied.zoom].every(Number.isFinite) &&
        applied.zoom > 0,
      accepted:
        applied.x === fit.viewport.x &&
        applied.y === fit.viewport.y &&
        applied.zoom === fit.viewport.zoom,
      rendered:
        renderedViewport.style.transform === expectedSerializedTransform,
      renderedValues:
        renderedViewport.dataset.x === String(applied.x) &&
        renderedViewport.dataset.y === String(applied.y) &&
        renderedViewport.dataset.zoom === String(applied.zoom),
      changed:
        applied.x !== beforeFit.x ||
        applied.y !== beforeFit.y ||
        applied.zoom !== beforeFit.zoom,
    }

    window.__flowPackedFitSerialization = {
      raw: expectedTransform,
      actual: renderedViewport.style.transform,
      canonical: expectedSerializedTransform,
    }
    const fitVisible = Object.values(fitChecks).every(Boolean)

    if (!fitVisible) {
      throw new Error(
        `Packed Vanilla fit evidence failed: ${JSON.stringify({
          fitChecks,
          beforeFit,
          fit,
          applied,
          expectedTransform,
          expectedSerializedTransform,
          actualTransform: renderedViewport.style.transform,
          renderedValues: {
            x: renderedViewport.dataset.x,
            y: renderedViewport.dataset.y,
            zoom: renderedViewport.dataset.zoom,
          },
        })}`
      )
    }

    return [
      before,
      after,
      independent.getNode('custom')?.label,
      Number(internal?.width) > 0,
      Number(internal?.height) > 0,
      fit.status,
      fitVisible,
    ].join(':')
  },
  dispose: () => {
    tooltip.destroy()
    appendix.destroy()
    uiHost.remove()
    controlled.destroy()
    independent.destroy()
    controlledRoot.remove()
    independentRoot.remove()
  },
}
