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
import type {
  GetBezierPathParams,
  GetSimpleBezierPathParams,
  GetSmoothStepPathParams,
  GetStraightPathParams,
  FlowEdge,
} from '@flow/core'
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
    __flowPathHelperTuples?: string
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

    const refresh = await controlled.updateNodeInternals([
      'custom',
      'custom',
      'absent',
    ])

    if (
      JSON.stringify(refresh) !==
      JSON.stringify([
        { nodeId: 'custom', status: 'requested' },
        { nodeId: 'absent', status: 'missing' },
      ])
    ) {
      throw new Error('Packed Vanilla ordered batch refresh failed')
    }

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

// Pure path-helper installed tuple probes.

const purePathHelpers = {
  getBezierPath,
  getSimpleBezierPath,
  getSmoothStepPath,
  getStraightPath,
  getEdgeCenter,
}

const purePathInputs: {
  readonly id: string
  readonly helper: keyof typeof purePathHelpers
  readonly params: GetBezierPathParams &
    GetSimpleBezierPathParams &
    GetSmoothStepPathParams &
    GetStraightPathParams
}[] = [
  {
    id: 'getBezierPath/forward',
    helper: 'getBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getBezierPath/reverse',
    helper: 'getBezierPath',
    params: { sourceX: 140.75, sourceY: 93.5, targetX: -30.5, targetY: 12.25 },
  },
  {
    id: 'getBezierPath/coincident',
    helper: 'getBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: -30.5, targetY: 12.25 },
  },
  {
    id: 'getBezierPath/horizontal',
    helper: 'getBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 12.25 },
  },
  {
    id: 'getBezierPath/vertical',
    helper: 'getBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: -30.5, targetY: 93.5 },
  },
  {
    id: 'getBezierPath/zero',
    helper: 'getBezierPath',
    params: { sourceX: 0, sourceY: 0, targetX: 0, targetY: 0 },
  },
  {
    id: 'getBezierPath/perturb-sourceX',
    helper: 'getBezierPath',
    params: { sourceX: 7.125, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getBezierPath/perturb-sourceY',
    helper: 'getBezierPath',
    params: { sourceX: -30.5, sourceY: 7.125, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getBezierPath/perturb-targetX',
    helper: 'getBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 7.125, targetY: 93.5 },
  },
  {
    id: 'getBezierPath/perturb-targetY',
    helper: 'getBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 7.125 },
  },
  {
    id: 'getBezierPath/sourceX-NaN',
    helper: 'getBezierPath',
    params: {
      sourceX: Number.NaN,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getBezierPath/sourceX-plusInfinity',
    helper: 'getBezierPath',
    params: {
      sourceX: Infinity,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getBezierPath/sourceX-minusInfinity',
    helper: 'getBezierPath',
    params: {
      sourceX: -Infinity,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getBezierPath/sourceX-negativeZero',
    helper: 'getBezierPath',
    params: { sourceX: -0, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getBezierPath/sourceX-large',
    helper: 'getBezierPath',
    params: { sourceX: 1e150, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getBezierPath/sourceY-NaN',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: Number.NaN,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getBezierPath/sourceY-plusInfinity',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: Infinity,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getBezierPath/sourceY-minusInfinity',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: -Infinity,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getBezierPath/sourceY-negativeZero',
    helper: 'getBezierPath',
    params: { sourceX: -30.5, sourceY: -0, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getBezierPath/sourceY-large',
    helper: 'getBezierPath',
    params: { sourceX: -30.5, sourceY: 1e150, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getBezierPath/targetX-NaN',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: Number.NaN,
      targetY: 93.5,
    },
  },
  {
    id: 'getBezierPath/targetX-plusInfinity',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: Infinity,
      targetY: 93.5,
    },
  },
  {
    id: 'getBezierPath/targetX-minusInfinity',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -Infinity,
      targetY: 93.5,
    },
  },
  {
    id: 'getBezierPath/targetX-negativeZero',
    helper: 'getBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: -0, targetY: 93.5 },
  },
  {
    id: 'getBezierPath/targetX-large',
    helper: 'getBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 1e150, targetY: 93.5 },
  },
  {
    id: 'getBezierPath/targetY-NaN',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: Number.NaN,
    },
  },
  {
    id: 'getBezierPath/targetY-plusInfinity',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: Infinity,
    },
  },
  {
    id: 'getBezierPath/targetY-minusInfinity',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: -Infinity,
    },
  },
  {
    id: 'getBezierPath/targetY-negativeZero',
    helper: 'getBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: -0 },
  },
  {
    id: 'getBezierPath/targetY-large',
    helper: 'getBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 1e150 },
  },
  {
    id: 'getSimpleBezierPath/forward',
    helper: 'getSimpleBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getSimpleBezierPath/reverse',
    helper: 'getSimpleBezierPath',
    params: { sourceX: 140.75, sourceY: 93.5, targetX: -30.5, targetY: 12.25 },
  },
  {
    id: 'getSimpleBezierPath/coincident',
    helper: 'getSimpleBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: -30.5, targetY: 12.25 },
  },
  {
    id: 'getSimpleBezierPath/horizontal',
    helper: 'getSimpleBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 12.25 },
  },
  {
    id: 'getSimpleBezierPath/vertical',
    helper: 'getSimpleBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: -30.5, targetY: 93.5 },
  },
  {
    id: 'getSimpleBezierPath/zero',
    helper: 'getSimpleBezierPath',
    params: { sourceX: 0, sourceY: 0, targetX: 0, targetY: 0 },
  },
  {
    id: 'getSimpleBezierPath/perturb-sourceX',
    helper: 'getSimpleBezierPath',
    params: { sourceX: 7.125, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getSimpleBezierPath/perturb-sourceY',
    helper: 'getSimpleBezierPath',
    params: { sourceX: -30.5, sourceY: 7.125, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getSimpleBezierPath/perturb-targetX',
    helper: 'getSimpleBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 7.125, targetY: 93.5 },
  },
  {
    id: 'getSimpleBezierPath/perturb-targetY',
    helper: 'getSimpleBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 7.125 },
  },
  {
    id: 'getSimpleBezierPath/sourceX-NaN',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: Number.NaN,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getSimpleBezierPath/sourceX-plusInfinity',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: Infinity,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getSimpleBezierPath/sourceX-minusInfinity',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -Infinity,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getSimpleBezierPath/sourceX-negativeZero',
    helper: 'getSimpleBezierPath',
    params: { sourceX: -0, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getSimpleBezierPath/sourceX-large',
    helper: 'getSimpleBezierPath',
    params: { sourceX: 1e150, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getSimpleBezierPath/sourceY-NaN',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: Number.NaN,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getSimpleBezierPath/sourceY-plusInfinity',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: Infinity,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getSimpleBezierPath/sourceY-minusInfinity',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: -Infinity,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getSimpleBezierPath/sourceY-negativeZero',
    helper: 'getSimpleBezierPath',
    params: { sourceX: -30.5, sourceY: -0, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getSimpleBezierPath/sourceY-large',
    helper: 'getSimpleBezierPath',
    params: { sourceX: -30.5, sourceY: 1e150, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getSimpleBezierPath/targetX-NaN',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: Number.NaN,
      targetY: 93.5,
    },
  },
  {
    id: 'getSimpleBezierPath/targetX-plusInfinity',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: Infinity,
      targetY: 93.5,
    },
  },
  {
    id: 'getSimpleBezierPath/targetX-minusInfinity',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -Infinity,
      targetY: 93.5,
    },
  },
  {
    id: 'getSimpleBezierPath/targetX-negativeZero',
    helper: 'getSimpleBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: -0, targetY: 93.5 },
  },
  {
    id: 'getSimpleBezierPath/targetX-large',
    helper: 'getSimpleBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 1e150, targetY: 93.5 },
  },
  {
    id: 'getSimpleBezierPath/targetY-NaN',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: Number.NaN,
    },
  },
  {
    id: 'getSimpleBezierPath/targetY-plusInfinity',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: Infinity,
    },
  },
  {
    id: 'getSimpleBezierPath/targetY-minusInfinity',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: -Infinity,
    },
  },
  {
    id: 'getSimpleBezierPath/targetY-negativeZero',
    helper: 'getSimpleBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: -0 },
  },
  {
    id: 'getSimpleBezierPath/targetY-large',
    helper: 'getSimpleBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 1e150 },
  },
  {
    id: 'getSmoothStepPath/forward',
    helper: 'getSmoothStepPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getSmoothStepPath/reverse',
    helper: 'getSmoothStepPath',
    params: { sourceX: 140.75, sourceY: 93.5, targetX: -30.5, targetY: 12.25 },
  },
  {
    id: 'getSmoothStepPath/coincident',
    helper: 'getSmoothStepPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: -30.5, targetY: 12.25 },
  },
  {
    id: 'getSmoothStepPath/horizontal',
    helper: 'getSmoothStepPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 12.25 },
  },
  {
    id: 'getSmoothStepPath/vertical',
    helper: 'getSmoothStepPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: -30.5, targetY: 93.5 },
  },
  {
    id: 'getSmoothStepPath/zero',
    helper: 'getSmoothStepPath',
    params: { sourceX: 0, sourceY: 0, targetX: 0, targetY: 0 },
  },
  {
    id: 'getSmoothStepPath/perturb-sourceX',
    helper: 'getSmoothStepPath',
    params: { sourceX: 7.125, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getSmoothStepPath/perturb-sourceY',
    helper: 'getSmoothStepPath',
    params: { sourceX: -30.5, sourceY: 7.125, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getSmoothStepPath/perturb-targetX',
    helper: 'getSmoothStepPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 7.125, targetY: 93.5 },
  },
  {
    id: 'getSmoothStepPath/perturb-targetY',
    helper: 'getSmoothStepPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 7.125 },
  },
  {
    id: 'getSmoothStepPath/sourceX-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: Number.NaN,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getSmoothStepPath/sourceX-plusInfinity',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: Infinity,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getSmoothStepPath/sourceX-minusInfinity',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -Infinity,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getSmoothStepPath/sourceX-negativeZero',
    helper: 'getSmoothStepPath',
    params: { sourceX: -0, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getSmoothStepPath/sourceX-large',
    helper: 'getSmoothStepPath',
    params: { sourceX: 1e150, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getSmoothStepPath/sourceY-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: Number.NaN,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getSmoothStepPath/sourceY-plusInfinity',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: Infinity,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getSmoothStepPath/sourceY-minusInfinity',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: -Infinity,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getSmoothStepPath/sourceY-negativeZero',
    helper: 'getSmoothStepPath',
    params: { sourceX: -30.5, sourceY: -0, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getSmoothStepPath/sourceY-large',
    helper: 'getSmoothStepPath',
    params: { sourceX: -30.5, sourceY: 1e150, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getSmoothStepPath/targetX-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: Number.NaN,
      targetY: 93.5,
    },
  },
  {
    id: 'getSmoothStepPath/targetX-plusInfinity',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: Infinity,
      targetY: 93.5,
    },
  },
  {
    id: 'getSmoothStepPath/targetX-minusInfinity',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -Infinity,
      targetY: 93.5,
    },
  },
  {
    id: 'getSmoothStepPath/targetX-negativeZero',
    helper: 'getSmoothStepPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: -0, targetY: 93.5 },
  },
  {
    id: 'getSmoothStepPath/targetX-large',
    helper: 'getSmoothStepPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 1e150, targetY: 93.5 },
  },
  {
    id: 'getSmoothStepPath/targetY-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: Number.NaN,
    },
  },
  {
    id: 'getSmoothStepPath/targetY-plusInfinity',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: Infinity,
    },
  },
  {
    id: 'getSmoothStepPath/targetY-minusInfinity',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: -Infinity,
    },
  },
  {
    id: 'getSmoothStepPath/targetY-negativeZero',
    helper: 'getSmoothStepPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: -0 },
  },
  {
    id: 'getSmoothStepPath/targetY-large',
    helper: 'getSmoothStepPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 1e150 },
  },
  {
    id: 'getStraightPath/forward',
    helper: 'getStraightPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getStraightPath/reverse',
    helper: 'getStraightPath',
    params: { sourceX: 140.75, sourceY: 93.5, targetX: -30.5, targetY: 12.25 },
  },
  {
    id: 'getStraightPath/coincident',
    helper: 'getStraightPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: -30.5, targetY: 12.25 },
  },
  {
    id: 'getStraightPath/horizontal',
    helper: 'getStraightPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 12.25 },
  },
  {
    id: 'getStraightPath/vertical',
    helper: 'getStraightPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: -30.5, targetY: 93.5 },
  },
  {
    id: 'getStraightPath/zero',
    helper: 'getStraightPath',
    params: { sourceX: 0, sourceY: 0, targetX: 0, targetY: 0 },
  },
  {
    id: 'getStraightPath/perturb-sourceX',
    helper: 'getStraightPath',
    params: { sourceX: 7.125, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getStraightPath/perturb-sourceY',
    helper: 'getStraightPath',
    params: { sourceX: -30.5, sourceY: 7.125, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getStraightPath/perturb-targetX',
    helper: 'getStraightPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 7.125, targetY: 93.5 },
  },
  {
    id: 'getStraightPath/perturb-targetY',
    helper: 'getStraightPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 7.125 },
  },
  {
    id: 'getStraightPath/sourceX-NaN',
    helper: 'getStraightPath',
    params: {
      sourceX: Number.NaN,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getStraightPath/sourceX-plusInfinity',
    helper: 'getStraightPath',
    params: {
      sourceX: Infinity,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getStraightPath/sourceX-minusInfinity',
    helper: 'getStraightPath',
    params: {
      sourceX: -Infinity,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getStraightPath/sourceX-negativeZero',
    helper: 'getStraightPath',
    params: { sourceX: -0, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getStraightPath/sourceX-large',
    helper: 'getStraightPath',
    params: { sourceX: 1e150, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getStraightPath/sourceY-NaN',
    helper: 'getStraightPath',
    params: {
      sourceX: -30.5,
      sourceY: Number.NaN,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getStraightPath/sourceY-plusInfinity',
    helper: 'getStraightPath',
    params: {
      sourceX: -30.5,
      sourceY: Infinity,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getStraightPath/sourceY-minusInfinity',
    helper: 'getStraightPath',
    params: {
      sourceX: -30.5,
      sourceY: -Infinity,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getStraightPath/sourceY-negativeZero',
    helper: 'getStraightPath',
    params: { sourceX: -30.5, sourceY: -0, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getStraightPath/sourceY-large',
    helper: 'getStraightPath',
    params: { sourceX: -30.5, sourceY: 1e150, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getStraightPath/targetX-NaN',
    helper: 'getStraightPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: Number.NaN,
      targetY: 93.5,
    },
  },
  {
    id: 'getStraightPath/targetX-plusInfinity',
    helper: 'getStraightPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: Infinity,
      targetY: 93.5,
    },
  },
  {
    id: 'getStraightPath/targetX-minusInfinity',
    helper: 'getStraightPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -Infinity,
      targetY: 93.5,
    },
  },
  {
    id: 'getStraightPath/targetX-negativeZero',
    helper: 'getStraightPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: -0, targetY: 93.5 },
  },
  {
    id: 'getStraightPath/targetX-large',
    helper: 'getStraightPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 1e150, targetY: 93.5 },
  },
  {
    id: 'getStraightPath/targetY-NaN',
    helper: 'getStraightPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: Number.NaN,
    },
  },
  {
    id: 'getStraightPath/targetY-plusInfinity',
    helper: 'getStraightPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: Infinity,
    },
  },
  {
    id: 'getStraightPath/targetY-minusInfinity',
    helper: 'getStraightPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: -Infinity,
    },
  },
  {
    id: 'getStraightPath/targetY-negativeZero',
    helper: 'getStraightPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: -0 },
  },
  {
    id: 'getStraightPath/targetY-large',
    helper: 'getStraightPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 1e150 },
  },
  {
    id: 'getEdgeCenter/forward',
    helper: 'getEdgeCenter',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getEdgeCenter/reverse',
    helper: 'getEdgeCenter',
    params: { sourceX: 140.75, sourceY: 93.5, targetX: -30.5, targetY: 12.25 },
  },
  {
    id: 'getEdgeCenter/coincident',
    helper: 'getEdgeCenter',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: -30.5, targetY: 12.25 },
  },
  {
    id: 'getEdgeCenter/horizontal',
    helper: 'getEdgeCenter',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 12.25 },
  },
  {
    id: 'getEdgeCenter/vertical',
    helper: 'getEdgeCenter',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: -30.5, targetY: 93.5 },
  },
  {
    id: 'getEdgeCenter/zero',
    helper: 'getEdgeCenter',
    params: { sourceX: 0, sourceY: 0, targetX: 0, targetY: 0 },
  },
  {
    id: 'getEdgeCenter/perturb-sourceX',
    helper: 'getEdgeCenter',
    params: { sourceX: 7.125, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getEdgeCenter/perturb-sourceY',
    helper: 'getEdgeCenter',
    params: { sourceX: -30.5, sourceY: 7.125, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getEdgeCenter/perturb-targetX',
    helper: 'getEdgeCenter',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 7.125, targetY: 93.5 },
  },
  {
    id: 'getEdgeCenter/perturb-targetY',
    helper: 'getEdgeCenter',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 7.125 },
  },
  {
    id: 'getEdgeCenter/sourceX-NaN',
    helper: 'getEdgeCenter',
    params: {
      sourceX: Number.NaN,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getEdgeCenter/sourceX-plusInfinity',
    helper: 'getEdgeCenter',
    params: {
      sourceX: Infinity,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getEdgeCenter/sourceX-minusInfinity',
    helper: 'getEdgeCenter',
    params: {
      sourceX: -Infinity,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getEdgeCenter/sourceX-negativeZero',
    helper: 'getEdgeCenter',
    params: { sourceX: -0, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getEdgeCenter/sourceX-large',
    helper: 'getEdgeCenter',
    params: { sourceX: 1e150, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getEdgeCenter/sourceY-NaN',
    helper: 'getEdgeCenter',
    params: {
      sourceX: -30.5,
      sourceY: Number.NaN,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getEdgeCenter/sourceY-plusInfinity',
    helper: 'getEdgeCenter',
    params: {
      sourceX: -30.5,
      sourceY: Infinity,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getEdgeCenter/sourceY-minusInfinity',
    helper: 'getEdgeCenter',
    params: {
      sourceX: -30.5,
      sourceY: -Infinity,
      targetX: 140.75,
      targetY: 93.5,
    },
  },
  {
    id: 'getEdgeCenter/sourceY-negativeZero',
    helper: 'getEdgeCenter',
    params: { sourceX: -30.5, sourceY: -0, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getEdgeCenter/sourceY-large',
    helper: 'getEdgeCenter',
    params: { sourceX: -30.5, sourceY: 1e150, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getEdgeCenter/targetX-NaN',
    helper: 'getEdgeCenter',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: Number.NaN,
      targetY: 93.5,
    },
  },
  {
    id: 'getEdgeCenter/targetX-plusInfinity',
    helper: 'getEdgeCenter',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: Infinity,
      targetY: 93.5,
    },
  },
  {
    id: 'getEdgeCenter/targetX-minusInfinity',
    helper: 'getEdgeCenter',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -Infinity,
      targetY: 93.5,
    },
  },
  {
    id: 'getEdgeCenter/targetX-negativeZero',
    helper: 'getEdgeCenter',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: -0, targetY: 93.5 },
  },
  {
    id: 'getEdgeCenter/targetX-large',
    helper: 'getEdgeCenter',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 1e150, targetY: 93.5 },
  },
  {
    id: 'getEdgeCenter/targetY-NaN',
    helper: 'getEdgeCenter',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: Number.NaN,
    },
  },
  {
    id: 'getEdgeCenter/targetY-plusInfinity',
    helper: 'getEdgeCenter',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: Infinity,
    },
  },
  {
    id: 'getEdgeCenter/targetY-minusInfinity',
    helper: 'getEdgeCenter',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: -Infinity,
    },
  },
  {
    id: 'getEdgeCenter/targetY-negativeZero',
    helper: 'getEdgeCenter',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: -0 },
  },
  {
    id: 'getEdgeCenter/targetY-large',
    helper: 'getEdgeCenter',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 1e150 },
  },
  {
    id: 'getBezierPath/sides-forward-left-left',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'left',
      targetPosition: 'left',
    },
  },
  {
    id: 'getBezierPath/sides-forward-left-right',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'left',
      targetPosition: 'right',
    },
  },
  {
    id: 'getBezierPath/sides-forward-left-top',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'left',
      targetPosition: 'top',
    },
  },
  {
    id: 'getBezierPath/sides-forward-left-bottom',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'left',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getBezierPath/sides-forward-right-left',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
    },
  },
  {
    id: 'getBezierPath/sides-forward-right-right',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
    },
  },
  {
    id: 'getBezierPath/sides-forward-right-top',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'top',
    },
  },
  {
    id: 'getBezierPath/sides-forward-right-bottom',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getBezierPath/sides-forward-top-left',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'top',
      targetPosition: 'left',
    },
  },
  {
    id: 'getBezierPath/sides-forward-top-right',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'top',
      targetPosition: 'right',
    },
  },
  {
    id: 'getBezierPath/sides-forward-top-top',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'top',
      targetPosition: 'top',
    },
  },
  {
    id: 'getBezierPath/sides-forward-top-bottom',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'top',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getBezierPath/sides-forward-bottom-left',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'left',
    },
  },
  {
    id: 'getBezierPath/sides-forward-bottom-right',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'right',
    },
  },
  {
    id: 'getBezierPath/sides-forward-bottom-top',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
    },
  },
  {
    id: 'getBezierPath/sides-forward-bottom-bottom',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getBezierPath/sides-reverse-left-left',
    helper: 'getBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'left',
    },
  },
  {
    id: 'getBezierPath/sides-reverse-left-right',
    helper: 'getBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'right',
    },
  },
  {
    id: 'getBezierPath/sides-reverse-left-top',
    helper: 'getBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'top',
    },
  },
  {
    id: 'getBezierPath/sides-reverse-left-bottom',
    helper: 'getBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getBezierPath/sides-reverse-right-left',
    helper: 'getBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'left',
    },
  },
  {
    id: 'getBezierPath/sides-reverse-right-right',
    helper: 'getBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'right',
    },
  },
  {
    id: 'getBezierPath/sides-reverse-right-top',
    helper: 'getBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'top',
    },
  },
  {
    id: 'getBezierPath/sides-reverse-right-bottom',
    helper: 'getBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getBezierPath/sides-reverse-top-left',
    helper: 'getBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'left',
    },
  },
  {
    id: 'getBezierPath/sides-reverse-top-right',
    helper: 'getBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'right',
    },
  },
  {
    id: 'getBezierPath/sides-reverse-top-top',
    helper: 'getBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'top',
    },
  },
  {
    id: 'getBezierPath/sides-reverse-top-bottom',
    helper: 'getBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getBezierPath/sides-reverse-bottom-left',
    helper: 'getBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'left',
    },
  },
  {
    id: 'getBezierPath/sides-reverse-bottom-right',
    helper: 'getBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'right',
    },
  },
  {
    id: 'getBezierPath/sides-reverse-bottom-top',
    helper: 'getBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'top',
    },
  },
  {
    id: 'getBezierPath/sides-reverse-bottom-bottom',
    helper: 'getBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getBezierPath/sides-coincident-left-left',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'left',
    },
  },
  {
    id: 'getBezierPath/sides-coincident-left-right',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'right',
    },
  },
  {
    id: 'getBezierPath/sides-coincident-left-top',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'top',
    },
  },
  {
    id: 'getBezierPath/sides-coincident-left-bottom',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getBezierPath/sides-coincident-right-left',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'left',
    },
  },
  {
    id: 'getBezierPath/sides-coincident-right-right',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'right',
    },
  },
  {
    id: 'getBezierPath/sides-coincident-right-top',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'top',
    },
  },
  {
    id: 'getBezierPath/sides-coincident-right-bottom',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getBezierPath/sides-coincident-top-left',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'left',
    },
  },
  {
    id: 'getBezierPath/sides-coincident-top-right',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'right',
    },
  },
  {
    id: 'getBezierPath/sides-coincident-top-top',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'top',
    },
  },
  {
    id: 'getBezierPath/sides-coincident-top-bottom',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getBezierPath/sides-coincident-bottom-left',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'left',
    },
  },
  {
    id: 'getBezierPath/sides-coincident-bottom-right',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'right',
    },
  },
  {
    id: 'getBezierPath/sides-coincident-bottom-top',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'top',
    },
  },
  {
    id: 'getBezierPath/sides-coincident-bottom-bottom',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getBezierPath/omitted-source',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      targetPosition: 'left',
    },
  },
  {
    id: 'getBezierPath/omitted-target',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
    },
  },
  {
    id: 'getBezierPath/omitted-both',
    helper: 'getBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getBezierPath/sourcePosition-own-undefined',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: undefined,
    },
  },
  {
    id: 'getBezierPath/targetPosition-own-undefined',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      targetPosition: undefined,
    },
  },
  {
    id: 'getSimpleBezierPath/sides-forward-left-left',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'left',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-forward-left-right',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'left',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-forward-left-top',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'left',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-forward-left-bottom',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'left',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-forward-right-left',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-forward-right-right',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-forward-right-top',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-forward-right-bottom',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-forward-top-left',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'top',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-forward-top-right',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'top',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-forward-top-top',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'top',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-forward-top-bottom',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'top',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-forward-bottom-left',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-forward-bottom-right',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-forward-bottom-top',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-forward-bottom-bottom',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-reverse-left-left',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-reverse-left-right',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-reverse-left-top',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-reverse-left-bottom',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-reverse-right-left',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-reverse-right-right',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-reverse-right-top',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-reverse-right-bottom',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-reverse-top-left',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-reverse-top-right',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-reverse-top-top',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-reverse-top-bottom',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-reverse-bottom-left',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-reverse-bottom-right',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-reverse-bottom-top',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-reverse-bottom-bottom',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-coincident-left-left',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-coincident-left-right',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-coincident-left-top',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-coincident-left-bottom',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-coincident-right-left',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-coincident-right-right',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-coincident-right-top',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-coincident-right-bottom',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-coincident-top-left',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-coincident-top-right',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-coincident-top-top',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-coincident-top-bottom',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-coincident-bottom-left',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-coincident-bottom-right',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-coincident-bottom-top',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSimpleBezierPath/sides-coincident-bottom-bottom',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSimpleBezierPath/omitted-source',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      targetPosition: 'left',
    },
  },
  {
    id: 'getSimpleBezierPath/omitted-target',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
    },
  },
  {
    id: 'getSimpleBezierPath/omitted-both',
    helper: 'getSimpleBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getSimpleBezierPath/sourcePosition-own-undefined',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: undefined,
    },
  },
  {
    id: 'getSimpleBezierPath/targetPosition-own-undefined',
    helper: 'getSimpleBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      targetPosition: undefined,
    },
  },
  {
    id: 'getSmoothStepPath/sides-forward-left-left',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'left',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSmoothStepPath/sides-forward-left-right',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'left',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSmoothStepPath/sides-forward-left-top',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'left',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSmoothStepPath/sides-forward-left-bottom',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'left',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSmoothStepPath/sides-forward-right-left',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSmoothStepPath/sides-forward-right-right',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSmoothStepPath/sides-forward-right-top',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSmoothStepPath/sides-forward-right-bottom',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSmoothStepPath/sides-forward-top-left',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'top',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSmoothStepPath/sides-forward-top-right',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'top',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSmoothStepPath/sides-forward-top-top',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'top',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSmoothStepPath/sides-forward-top-bottom',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'top',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSmoothStepPath/sides-forward-bottom-left',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSmoothStepPath/sides-forward-bottom-right',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSmoothStepPath/sides-forward-bottom-top',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSmoothStepPath/sides-forward-bottom-bottom',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSmoothStepPath/sides-reverse-left-left',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSmoothStepPath/sides-reverse-left-right',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSmoothStepPath/sides-reverse-left-top',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSmoothStepPath/sides-reverse-left-bottom',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSmoothStepPath/sides-reverse-right-left',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSmoothStepPath/sides-reverse-right-right',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSmoothStepPath/sides-reverse-right-top',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSmoothStepPath/sides-reverse-right-bottom',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSmoothStepPath/sides-reverse-top-left',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSmoothStepPath/sides-reverse-top-right',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSmoothStepPath/sides-reverse-top-top',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSmoothStepPath/sides-reverse-top-bottom',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSmoothStepPath/sides-reverse-bottom-left',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSmoothStepPath/sides-reverse-bottom-right',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSmoothStepPath/sides-reverse-bottom-top',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSmoothStepPath/sides-reverse-bottom-bottom',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 140.75,
      sourceY: 93.5,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSmoothStepPath/sides-coincident-left-left',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSmoothStepPath/sides-coincident-left-right',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSmoothStepPath/sides-coincident-left-top',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSmoothStepPath/sides-coincident-left-bottom',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'left',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSmoothStepPath/sides-coincident-right-left',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSmoothStepPath/sides-coincident-right-right',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSmoothStepPath/sides-coincident-right-top',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSmoothStepPath/sides-coincident-right-bottom',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'right',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSmoothStepPath/sides-coincident-top-left',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSmoothStepPath/sides-coincident-top-right',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSmoothStepPath/sides-coincident-top-top',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSmoothStepPath/sides-coincident-top-bottom',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'top',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSmoothStepPath/sides-coincident-bottom-left',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSmoothStepPath/sides-coincident-bottom-right',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSmoothStepPath/sides-coincident-bottom-top',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSmoothStepPath/sides-coincident-bottom-bottom',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: -30.5,
      targetY: 12.25,
      sourcePosition: 'bottom',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSmoothStepPath/omitted-source',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      targetPosition: 'left',
    },
  },
  {
    id: 'getSmoothStepPath/omitted-target',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
    },
  },
  {
    id: 'getSmoothStepPath/omitted-both',
    helper: 'getSmoothStepPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getSmoothStepPath/sourcePosition-own-undefined',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: undefined,
    },
  },
  {
    id: 'getSmoothStepPath/targetPosition-own-undefined',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      targetPosition: undefined,
    },
  },
  {
    id: 'getBezierPath/backwards-default',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'left',
      targetPosition: 'right',
    },
  },
  {
    id: 'getBezierPath/backwards-0',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'left',
      targetPosition: 'right',
      curvature: 0,
    },
  },
  {
    id: 'getBezierPath/backwards-0.25',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'left',
      targetPosition: 'right',
      curvature: 0.25,
    },
  },
  {
    id: 'getBezierPath/backwards-0.5',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'left',
      targetPosition: 'right',
      curvature: 0.5,
    },
  },
  {
    id: 'getBezierPath/backwards--0.5',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'left',
      targetPosition: 'right',
      curvature: -0.5,
    },
  },
  {
    id: 'getBezierPath/positive-default',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
    },
  },
  {
    id: 'getBezierPath/positive-0',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      curvature: 0,
    },
  },
  {
    id: 'getBezierPath/positive-0.25',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      curvature: 0.25,
    },
  },
  {
    id: 'getBezierPath/positive-0.5',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      curvature: 0.5,
    },
  },
  {
    id: 'getBezierPath/positive--0.5',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      curvature: -0.5,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-default',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-borderRadius-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      borderRadius: 0,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-borderRadius-5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      borderRadius: 5,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-borderRadius-1000',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      borderRadius: 1000,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-borderRadius--5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      borderRadius: -5,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-offset-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      offset: 0,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-offset-20',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-offset-35',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      offset: 35,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-offset--10',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      offset: -10,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-stepPosition-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      stepPosition: 0,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-stepPosition-0.25',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      stepPosition: 0.25,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-stepPosition-0.5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      stepPosition: 0.5,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-stepPosition-1',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      stepPosition: 1,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-stepPosition--0.5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      stepPosition: -0.5,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-stepPosition-1.5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      stepPosition: 1.5,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-centerX-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      centerX: 0,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-centerX-23',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      centerX: 23,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-centerY-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      centerY: 0,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-centerY-37',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      centerY: 37,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-centers-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      centerX: 0,
      centerY: 0,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeHorizontal-centers-33',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'left',
      centerX: 33,
      centerY: 33,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-default',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-borderRadius-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      borderRadius: 0,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-borderRadius-5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      borderRadius: 5,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-borderRadius-1000',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      borderRadius: 1000,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-borderRadius--5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      borderRadius: -5,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-offset-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      offset: 0,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-offset-20',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-offset-35',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      offset: 35,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-offset--10',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      offset: -10,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-stepPosition-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      stepPosition: 0,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-stepPosition-0.25',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      stepPosition: 0.25,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-stepPosition-0.5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      stepPosition: 0.5,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-stepPosition-1',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      stepPosition: 1,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-stepPosition--0.5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      stepPosition: -0.5,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-stepPosition-1.5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      stepPosition: 1.5,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-centerX-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      centerX: 0,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-centerX-23',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      centerX: 23,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-centerY-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      centerY: 0,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-centerY-37',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      centerY: 37,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-centers-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      centerX: 0,
      centerY: 0,
    },
  },
  {
    id: 'getSmoothStepPath/oppositeVertical-centers-33',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'bottom',
      targetPosition: 'top',
      centerX: 33,
      centerY: 33,
    },
  },
  {
    id: 'getSmoothStepPath/same-default',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSmoothStepPath/same-borderRadius-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
      borderRadius: 0,
    },
  },
  {
    id: 'getSmoothStepPath/same-borderRadius-5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
      borderRadius: 5,
    },
  },
  {
    id: 'getSmoothStepPath/same-borderRadius-1000',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
      borderRadius: 1000,
    },
  },
  {
    id: 'getSmoothStepPath/same-borderRadius--5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
      borderRadius: -5,
    },
  },
  {
    id: 'getSmoothStepPath/same-offset-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
      offset: 0,
    },
  },
  {
    id: 'getSmoothStepPath/same-offset-20',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/same-offset-35',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
      offset: 35,
    },
  },
  {
    id: 'getSmoothStepPath/same-offset--10',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
      offset: -10,
    },
  },
  {
    id: 'getSmoothStepPath/same-stepPosition-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
      stepPosition: 0,
    },
  },
  {
    id: 'getSmoothStepPath/same-stepPosition-0.25',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
      stepPosition: 0.25,
    },
  },
  {
    id: 'getSmoothStepPath/same-stepPosition-0.5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
      stepPosition: 0.5,
    },
  },
  {
    id: 'getSmoothStepPath/same-stepPosition-1',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
      stepPosition: 1,
    },
  },
  {
    id: 'getSmoothStepPath/same-stepPosition--0.5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
      stepPosition: -0.5,
    },
  },
  {
    id: 'getSmoothStepPath/same-stepPosition-1.5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
      stepPosition: 1.5,
    },
  },
  {
    id: 'getSmoothStepPath/same-centerX-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
      centerX: 0,
    },
  },
  {
    id: 'getSmoothStepPath/same-centerX-23',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
      centerX: 23,
    },
  },
  {
    id: 'getSmoothStepPath/same-centerY-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
      centerY: 0,
    },
  },
  {
    id: 'getSmoothStepPath/same-centerY-37',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
      centerY: 37,
    },
  },
  {
    id: 'getSmoothStepPath/same-centers-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
      centerX: 0,
      centerY: 0,
    },
  },
  {
    id: 'getSmoothStepPath/same-centers-33',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'right',
      centerX: 33,
      centerY: 33,
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-default',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-borderRadius-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
      borderRadius: 0,
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-borderRadius-5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
      borderRadius: 5,
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-borderRadius-1000',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
      borderRadius: 1000,
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-borderRadius--5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
      borderRadius: -5,
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-offset-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
      offset: 0,
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-offset-20',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-offset-35',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
      offset: 35,
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-offset--10',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
      offset: -10,
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-stepPosition-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
      stepPosition: 0,
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-stepPosition-0.25',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
      stepPosition: 0.25,
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-stepPosition-0.5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
      stepPosition: 0.5,
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-stepPosition-1',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
      stepPosition: 1,
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-stepPosition--0.5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
      stepPosition: -0.5,
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-stepPosition-1.5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
      stepPosition: 1.5,
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-centerX-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
      centerX: 0,
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-centerX-23',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
      centerX: 23,
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-centerY-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
      centerY: 0,
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-centerY-37',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
      centerY: 37,
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-centers-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
      centerX: 0,
      centerY: 0,
    },
  },
  {
    id: 'getSmoothStepPath/orthogonal-centers-33',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      sourcePosition: 'right',
      targetPosition: 'bottom',
      centerX: 33,
      centerY: 33,
    },
  },
  {
    id: 'getSmoothStepPath/tie-default',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSmoothStepPath/tie-borderRadius-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      borderRadius: 0,
    },
  },
  {
    id: 'getSmoothStepPath/tie-borderRadius-5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      borderRadius: 5,
    },
  },
  {
    id: 'getSmoothStepPath/tie-borderRadius-1000',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      borderRadius: 1000,
    },
  },
  {
    id: 'getSmoothStepPath/tie-borderRadius--5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      borderRadius: -5,
    },
  },
  {
    id: 'getSmoothStepPath/tie-offset-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      offset: 0,
    },
  },
  {
    id: 'getSmoothStepPath/tie-offset-20',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/tie-offset-35',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      offset: 35,
    },
  },
  {
    id: 'getSmoothStepPath/tie-offset--10',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      offset: -10,
    },
  },
  {
    id: 'getSmoothStepPath/tie-stepPosition-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      stepPosition: 0,
    },
  },
  {
    id: 'getSmoothStepPath/tie-stepPosition-0.25',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      stepPosition: 0.25,
    },
  },
  {
    id: 'getSmoothStepPath/tie-stepPosition-0.5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      stepPosition: 0.5,
    },
  },
  {
    id: 'getSmoothStepPath/tie-stepPosition-1',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      stepPosition: 1,
    },
  },
  {
    id: 'getSmoothStepPath/tie-stepPosition--0.5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      stepPosition: -0.5,
    },
  },
  {
    id: 'getSmoothStepPath/tie-stepPosition-1.5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      stepPosition: 1.5,
    },
  },
  {
    id: 'getSmoothStepPath/tie-centerX-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      centerX: 0,
    },
  },
  {
    id: 'getSmoothStepPath/tie-centerX-23',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      centerX: 23,
    },
  },
  {
    id: 'getSmoothStepPath/tie-centerY-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      centerY: 0,
    },
  },
  {
    id: 'getSmoothStepPath/tie-centerY-37',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      centerY: 37,
    },
  },
  {
    id: 'getSmoothStepPath/tie-centers-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      centerX: 0,
      centerY: 0,
    },
  },
  {
    id: 'getSmoothStepPath/tie-centers-33',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      centerX: 33,
      centerY: 33,
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-default',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-borderRadius-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
      borderRadius: 0,
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-borderRadius-5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
      borderRadius: 5,
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-borderRadius-1000',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
      borderRadius: 1000,
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-borderRadius--5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
      borderRadius: -5,
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-offset-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
      offset: 0,
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-offset-20',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-offset-35',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
      offset: 35,
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-offset--10',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
      offset: -10,
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-stepPosition-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
      stepPosition: 0,
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-stepPosition-0.25',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
      stepPosition: 0.25,
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-stepPosition-0.5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
      stepPosition: 0.5,
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-stepPosition-1',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
      stepPosition: 1,
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-stepPosition--0.5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
      stepPosition: -0.5,
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-stepPosition-1.5',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
      stepPosition: 1.5,
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-centerX-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
      centerX: 0,
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-centerX-23',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
      centerX: 23,
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-centerY-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
      centerY: 0,
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-centerY-37',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
      centerY: 37,
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-centers-0',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
      centerX: 0,
      centerY: 0,
    },
  },
  {
    id: 'getSmoothStepPath/collapsed-centers-33',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'right',
      centerX: 33,
      centerY: 33,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-left-source-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: Number.NaN,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'left',
      targetPosition: 'left',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-left-target-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: Number.NaN,
      targetY: 100,
      sourcePosition: 'left',
      targetPosition: 'left',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-left-offset-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'left',
      targetPosition: 'left',
      offset: Number.NaN,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-left-finite-gap-10',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 10,
      targetY: 100,
      sourcePosition: 'left',
      targetPosition: 'left',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-left-finite-gap-20',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 20,
      targetY: 100,
      sourcePosition: 'left',
      targetPosition: 'left',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-left-finite-gap-30',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 30,
      targetY: 100,
      sourcePosition: 'left',
      targetPosition: 'left',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-right-source-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: Number.NaN,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-right-target-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: Number.NaN,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-right-offset-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      offset: Number.NaN,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-right-finite-gap-10',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 10,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-right-finite-gap-20',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 20,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-right-finite-gap-30',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 30,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'right',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-top-source-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: Number.NaN,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'top',
      targetPosition: 'top',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-top-target-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: Number.NaN,
      sourcePosition: 'top',
      targetPosition: 'top',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-top-offset-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'top',
      targetPosition: 'top',
      offset: Number.NaN,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-top-finite-gap-10',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 10,
      sourcePosition: 'top',
      targetPosition: 'top',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-top-finite-gap-20',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 20,
      sourcePosition: 'top',
      targetPosition: 'top',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-top-finite-gap-30',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 30,
      sourcePosition: 'top',
      targetPosition: 'top',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-bottom-source-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: Number.NaN,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'bottom',
      targetPosition: 'bottom',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-bottom-target-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: Number.NaN,
      sourcePosition: 'bottom',
      targetPosition: 'bottom',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-bottom-offset-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'bottom',
      targetPosition: 'bottom',
      offset: Number.NaN,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-bottom-finite-gap-10',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 10,
      sourcePosition: 'bottom',
      targetPosition: 'bottom',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-bottom-finite-gap-20',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 20,
      sourcePosition: 'bottom',
      targetPosition: 'bottom',
      offset: 20,
    },
  },
  {
    id: 'getSmoothStepPath/BUG-088-01-bottom-finite-gap-30',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 30,
      sourcePosition: 'bottom',
      targetPosition: 'bottom',
      offset: 20,
    },
  },
  {
    id: 'getBezierPath/curvature-own-undefined',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      curvature: undefined,
    },
  },
  {
    id: 'getBezierPath/curvature-NaN',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      curvature: Number.NaN,
    },
  },
  {
    id: 'getBezierPath/curvature-plusInfinity',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      curvature: Infinity,
    },
  },
  {
    id: 'getBezierPath/curvature-minusInfinity',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      curvature: -Infinity,
    },
  },
  {
    id: 'getBezierPath/curvature-large',
    helper: 'getBezierPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      curvature: 1e150,
    },
  },
  {
    id: 'getSmoothStepPath/borderRadius-own-undefined',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      borderRadius: undefined,
    },
  },
  {
    id: 'getSmoothStepPath/borderRadius-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      borderRadius: Number.NaN,
    },
  },
  {
    id: 'getSmoothStepPath/borderRadius-plusInfinity',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      borderRadius: Infinity,
    },
  },
  {
    id: 'getSmoothStepPath/borderRadius-minusInfinity',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      borderRadius: -Infinity,
    },
  },
  {
    id: 'getSmoothStepPath/borderRadius-large',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      borderRadius: 1e150,
    },
  },
  {
    id: 'getSmoothStepPath/offset-own-undefined',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      offset: undefined,
    },
  },
  {
    id: 'getSmoothStepPath/offset-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      offset: Number.NaN,
    },
  },
  {
    id: 'getSmoothStepPath/offset-plusInfinity',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      offset: Infinity,
    },
  },
  {
    id: 'getSmoothStepPath/offset-minusInfinity',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      offset: -Infinity,
    },
  },
  {
    id: 'getSmoothStepPath/offset-large',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      offset: 1e150,
    },
  },
  {
    id: 'getSmoothStepPath/stepPosition-own-undefined',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      stepPosition: undefined,
    },
  },
  {
    id: 'getSmoothStepPath/stepPosition-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      stepPosition: Number.NaN,
    },
  },
  {
    id: 'getSmoothStepPath/stepPosition-plusInfinity',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      stepPosition: Infinity,
    },
  },
  {
    id: 'getSmoothStepPath/stepPosition-minusInfinity',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      stepPosition: -Infinity,
    },
  },
  {
    id: 'getSmoothStepPath/stepPosition-large',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      stepPosition: 1e150,
    },
  },
  {
    id: 'getSmoothStepPath/centerX-own-undefined',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      centerX: undefined,
    },
  },
  {
    id: 'getSmoothStepPath/centerX-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      centerX: Number.NaN,
    },
  },
  {
    id: 'getSmoothStepPath/centerX-plusInfinity',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      centerX: Infinity,
    },
  },
  {
    id: 'getSmoothStepPath/centerX-minusInfinity',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      centerX: -Infinity,
    },
  },
  {
    id: 'getSmoothStepPath/centerX-large',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      centerX: 1e150,
    },
  },
  {
    id: 'getSmoothStepPath/centerY-own-undefined',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      centerY: undefined,
    },
  },
  {
    id: 'getSmoothStepPath/centerY-NaN',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      centerY: Number.NaN,
    },
  },
  {
    id: 'getSmoothStepPath/centerY-plusInfinity',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      centerY: Infinity,
    },
  },
  {
    id: 'getSmoothStepPath/centerY-minusInfinity',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      centerY: -Infinity,
    },
  },
  {
    id: 'getSmoothStepPath/centerY-large',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      centerY: 1e150,
    },
  },
  {
    id: 'getBezierPath/alias-default',
    helper: 'getBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getSimpleBezierPath/alias-simplebezier',
    helper: 'getSimpleBezierPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getSmoothStepPath/alias-step',
    helper: 'getSmoothStepPath',
    params: {
      sourceX: -30.5,
      sourceY: 12.25,
      targetX: 140.75,
      targetY: 93.5,
      borderRadius: 0,
    },
  },
  {
    id: 'getSmoothStepPath/alias-smoothstep',
    helper: 'getSmoothStepPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
  {
    id: 'getStraightPath/alias-straight',
    helper: 'getStraightPath',
    params: { sourceX: -30.5, sourceY: 12.25, targetX: 140.75, targetY: 93.5 },
  },
]

const serializePureTuple = (
  tuple: ReturnType<typeof getStraightPath> | ReturnType<typeof getEdgeCenter>
) =>
  tuple.map((value) => {
    if (Number.isNaN(value)) {
      return { tag: 'NaN' }
    }

    if (value === Infinity) {
      return { tag: '+Infinity' }
    }

    if (value === -Infinity) {
      return { tag: '-Infinity' }
    }

    if (Object.is(value, -0)) {
      return { tag: '-0' }
    }

    return value
  })

window.__flowPathHelperTuples = JSON.stringify(
  purePathInputs.map(({ id, helper, params }) => {
    const frozen = Object.freeze(params)
    const firstTuple = purePathHelpers[helper](frozen)
    const original = serializePureTuple(firstTuple)
    const repeated = purePathHelpers[helper](frozen)

    if (
      firstTuple === repeated ||
      JSON.stringify(original) !== JSON.stringify(serializePureTuple(repeated))
    ) {
      throw new Error(`Unstable installed helper ${id}`)
    }

    firstTuple[1] = 123_456

    if (
      JSON.stringify(original) !==
      JSON.stringify(serializePureTuple(purePathHelpers[helper](frozen)))
    ) {
      throw new Error(`Shared installed result ${id}`)
    }

    return { id, tuple: original }
  })
)
