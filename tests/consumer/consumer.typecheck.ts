import {
  encodeVersionedFlowDocument,
  encodeVersionedFlowSession,
  decodeVersionedFlowSession,
  NodeOriginSchema,
  FlowInternalNodeSchema,
  MeasuredHandleSchema,
  HandleIdSchema,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  decodeFlowDocument,
  EdgeIdSchema,
  getEdgeCenter,
  getBezierPath,
  getConnectedEdges,
  getIncomers,
  getOutgoers,
  getSimpleBezierPath,
  getSmoothStepPath,
  getStraightPath,
  isEdge,
  isNode,
  reconnectEdge,
} from '@flow/core'
import type {
  GetBezierPathParams,
  GetSimpleBezierPathParams,
  GetSmoothStepPathParams,
  GetStraightPathParams,
  SavedVersionedFlowSession,
  FlowSnapshot,
  EdgeChange,
  FlowChange,
  FlowDocument,
  FlowEdge,
  FlowNode,
  FlowStateChange,
  NodeChange,
  FlowHandleSchema,
  NodeIdSchema,
} from '@flow/core'
import {
  createFlow,
  createFlowBackground,
  createFlowBaseHandle,
  createFlowBaseNode,
  createFlowControlButton,
  createFlowStatusIndicator,
  updateFlowStatusIndicator,
  createFlowAppendix,
  createFlowTooltip,
  createFlowLabeledHandleLabel,
  createFlowDatabaseSchema,
  createFlowPlaceholder,
  mountFlow,
} from '@flow/vanilla'
import type {
  FlowBaseHandleOptions,
  FlowBaseNodeOptions,
  FlowCanvasEventPayload,
  FlowNodeDragPayload,
  FlowNodeDragStopPayload,
  JavaScriptFlowController,
} from '@flow/vanilla'
import { Effect, Schema as S } from 'effect'

export { FlowSnapshotSchema } from '@flow/core'

const document: FlowDocument = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      { id: 'consumer-node', label: 'Consumer', position: { x: 10, y: 20 } },
    ],
    edges: [],
  })
)

const viewport = {
  mode: 'uncontrolled' as const,
  initial: { x: 0, y: 0, zoom: 1 },
  limits: { minZoom: 0.5, maxZoom: 2 },
}

const options = { documentMode: 'controlled' as const, viewport }

export const packedBaseHandle: FlowBaseHandleOptions = createFlowBaseHandle({
  id: S.decodeUnknownSync(HandleIdSchema)('consumer-handle'),
  kind: 'source',
  side: 'right',
})

const onChange = (_change: FlowChange): void => undefined

const consumeState = (_change: FlowStateChange): void => undefined

export const syncMount: typeof mountFlow = mountFlow

export const asyncMount: typeof createFlow = createFlow

export const controllerPromise: Promise<JavaScriptFlowController> = createFlow(
  globalThis.document.body,
  document,
  { ...options, onChange }
)

/** Public UI helpers accept the controller `mountFlow` and `createFlow` return. */
export const mountBackground = async (): Promise<() => void> => {
  const controller = await controllerPromise
  const background = createFlowBackground(globalThis.document.body, controller)

  return background.destroy
}

export const onNodeDrag = (drag: FlowNodeDragPayload): number =>
  drag.positions.length

export const onNodeDragStop = (drag: FlowNodeDragStopPayload): string =>
  drag.outcome

export const onNodeClick = (
  event: FlowCanvasEventPayload
): string | undefined => event.nodeId

export const snapshot: FlowSnapshot = {
  document,
  viewport: { x: 0, y: 0, zoom: 1 },
}

export const readAndSubscribe = async (): Promise<void> => {
  const controller = await controllerPromise
  const current: FlowSnapshot = controller.getSnapshot()
  const nodes: readonly FlowNode[] = controller.getNodes()
  const edges: readonly FlowEdge[] = controller.getEdges()
  const node: FlowNode | undefined = controller.getNode('consumer-node')
  const edge: FlowEdge | undefined = controller.getEdge('missing')
  const currentViewport = controller.getViewport()
  await controller.setNodes(nodes)
  await controller.setNodes((nextNodes) => nextNodes)
  const [firstNode] = nodes

  if (firstNode !== undefined) {
    await controller.addNodes(firstNode)
  }

  await controller.setEdges(edges)
  await controller.setEdges((nextEdges) => nextEdges)
  await controller.addEdges(edges)
  await controller.updateNode('consumer-node', { label: 'updated' })
  await controller.updateNode('consumer-node', (currentNode) => ({
    label: `${currentNode.label} updated`,
  }))
  await controller.updateNodeData('consumer-node', { value: 1 })
  await controller.updateNodeData('consumer-node', (data) => ({
    ...data,
    value: 2,
  }))
  await controller.updateEdge('missing', { label: 'updated' })
  await controller.updateEdge('missing', (currentEdge) => ({
    label: currentEdge.label,
  }))
  await controller.updateEdgeData('missing', { value: 1 }, { replace: true })
  await controller.updateEdgeData(
    'missing',
    (data) => ({ ...data, value: 2 }),
    { replace: true }
  )
  const deletion = await controller.deleteElements({ nodeIds: ['missing'] })

  const transaction = await controller.applyEdit({
    operations: [{ kind: 'delete-elements', nodeIds: ['missing'] }],
  })

  const unsubscribe = controller.subscribeState(consumeState)
  unsubscribe()
  void [
    current,
    nodes,
    edges,
    node,
    edge,
    currentViewport,
    deletion,
    transaction,
  ]
}

const graphNodes: readonly FlowNode[] = document.nodes

const graphEdges: readonly FlowEdge[] = document.edges

const selectedNode = document.nodes.find((node) => node.id === 'consumer-node')

if (selectedNode === undefined) {
  throw new Error('Consumer fixture is missing its node')
}

const selectedNodeId = { id: selectedNode.id }

export const graphIncomers: readonly FlowNode[] = getIncomers(
  selectedNode,
  graphNodes,
  graphEdges
)

export const graphOutgoers: readonly FlowNode[] = getOutgoers(
  selectedNodeId,
  graphNodes,
  graphEdges
)

export const graphConnectedEdges: readonly FlowEdge[] = getConnectedEdges(
  [selectedNode],
  graphEdges
)

const nodeChanges: readonly NodeChange[] = [
  { id: selectedNode.id, type: 'select', selected: true },
  {
    id: selectedNode.id,
    type: 'dimensions',
    dimensions: { width: 90, height: 50 },
  },
]

const edgeChanges: readonly EdgeChange[] = [
  {
    type: 'add',
    item: {
      id: S.decodeUnknownSync(EdgeIdSchema)('consumer-edge'),
      source: selectedNode.id,
      target: selectedNode.id,
    },
  },
]

export const utilityConsumer = {
  nodes: applyNodeChanges(nodeChanges, document.nodes),
  edges: applyEdgeChanges(edgeChanges, document.edges),
  addEdge: addEdge(
    { source: selectedNode.id, target: selectedNode.id },
    document.edges
  ),
  reconnectEdge: reconnectEdge(
    {
      id: S.decodeUnknownSync(EdgeIdSchema)('consumer-edge'),
      source: selectedNode.id,
      target: selectedNode.id,
    },
    { source: selectedNode.id, target: selectedNode.id },
    [
      {
        id: S.decodeUnknownSync(EdgeIdSchema)('consumer-edge'),
        source: selectedNode.id,
        target: selectedNode.id,
      },
    ]
  ),
  predicates: [
    isNode(selectedNode),
    isEdge({ id: 'e', source: 'a', target: 'b' }),
  ],
  edgeCenter: getEdgeCenter({
    sourceX: 0,
    sourceY: 0,
    targetX: 20,
    targetY: 10,
  }),
  straightPath: getStraightPath({
    sourceX: 0,
    sourceY: 0,
    targetX: 10,
    targetY: 10,
  }),
  bezierPath: getBezierPath({
    sourceX: 0,
    sourceY: 0,
    targetX: 10,
    targetY: 10,
  }),
  simpleBezierPath: getSimpleBezierPath({
    sourceX: 0,
    sourceY: 0,
    targetX: 10,
    targetY: 10,
  }),
  smoothStepPath: getSmoothStepPath({
    sourceX: 0,
    sourceY: 0,
    targetX: 10,
    targetY: 10,
  }),
}

const mutableCenter = getEdgeCenter({
  sourceX: 0,
  sourceY: 0,
  targetX: 2,
  targetY: 2,
})

mutableCenter[0] = 1

const baseNodeOptions: FlowBaseNodeOptions = {
  title: 'Packed node',
  content: globalThis.document.createElement('button'),
}

const baseNode = createFlowBaseNode(globalThis.document, baseNodeOptions)

export const mountPackedNodeContent = (owner: Document): (() => void) => {
  const content = owner.createElement('div')
  const status = createFlowStatusIndicator(owner, { status: 'waiting' })

  const action = createFlowControlButton(owner, {
    type: 'button',
    name: 'schema-action',
    value: 'refresh',
    disabled: false,
    style: { color: 'navy', '--consumer-accent': 'blue' },
    aria: { 'aria-label': 'Refresh schema' },
    children: [owner.createTextNode('Refresh')],
    onClick: (event) => {
      updateFlowStatusIndicator(
        status,
        'ready',
        `Loaded with button ${event.button}`
      )
    },
  })

  const schema = createFlowDatabaseSchema(owner, {
    name: 'users',
    fields: [
      { id: 'id', name: 'id', type: 'uuid', kind: 'source', side: 'right' },
    ],
  })

  const label = createFlowLabeledHandleLabel(
    { handle: packedBaseHandle, label: 'Output' },
    owner
  )

  const appendix = createFlowAppendix(owner, {
    id: 'packed-schema-details',
    label: 'Details',
    content: schema,
    initiallyExpanded: true,
  })

  const placeholder = createFlowPlaceholder(owner, {
    label: 'Add table',
    onActivate: () => updateFlowStatusIndicator(status, 'waiting'),
  })

  content.append(status, action, label, appendix.element, placeholder)
  baseNode.append(content)
  owner.body.append(baseNode)

  const tooltip = createFlowTooltip(owner, {
    trigger: action,
    text: 'Refresh caller-owned data',
  })

  return () => {
    tooltip.destroy()
    appendix.destroy()
    baseNode.remove()
  }
}

// Original 065 acceptance through installed public declarations.
export const consumeMeasuredMembers = (
  internal: typeof FlowInternalNodeSchema.Type
): void => {
  const numericWidth: number = internal.width
  const numericHeight: number = internal.height

  const status: 'hidden' | 'measured' | 'unmeasured' =
    internal.measurementStatus

  const records: readonly (typeof MeasuredHandleSchema.Type)[] =
    internal.handles

  const declarations: readonly (typeof FlowHandleSchema.Type)[] =
    internal.node.handles ?? []

  const encoded = {
    nodeId: 'consumer',
    handleId: 'source-top',
    offset: { x: 5, y: 8 },
    width: 10,
    height: 12,
  } satisfies typeof MeasuredHandleSchema.Encoded

  const handle = S.decodeUnknownSync(MeasuredHandleSchema)(encoded)
  const owner: typeof NodeIdSchema.Type = handle.nodeId
  const identity: typeof HandleIdSchema.Type = handle.handleId
  const centerX: number = handle.offset.x
  const centerY: number = handle.offset.y
  const encodedInternal = S.encodeSync(FlowInternalNodeSchema)(internal)

  const nullWidth: typeof FlowInternalNodeSchema.Encoded = {
    ...encodedInternal,
    // @ts-expect-error Native dimension output is total, never null.
    width: null,
  }

  const missingHeight: typeof FlowInternalNodeSchema.Encoded = {
    ...encodedInternal,
    // @ts-expect-error Native dimension output is total, never undefined.
    height: undefined,
  }

  const nullHeight: typeof FlowInternalNodeSchema.Encoded = {
    ...encodedInternal,
    // @ts-expect-error Native height output is never null.
    height: null,
  }

  const absentWidth: typeof FlowInternalNodeSchema.Encoded = {
    ...encodedInternal,
    // @ts-expect-error Native width output is never missing.
    width: undefined,
  }

  // @ts-expect-error Native geometry uses status and flat dimensions.
  const measuredObject = internal.measured
  // @ts-expect-error Native geometry never exports a React internals object.
  const internalsObject = internal.internals

  const nullRecords: typeof FlowInternalNodeSchema.Encoded = {
    ...encodedInternal,
    // @ts-expect-error Native handle collections are non-null readonly arrays.
    handles: null,
  }

  const absentRecords: typeof FlowInternalNodeSchema.Encoded = {
    ...encodedInternal,
    // @ts-expect-error Missing handle collections are not native output.
    handles: undefined,
  }

  // @ts-expect-error IDs are required at the encoded boundary.
  const absentId: typeof MeasuredHandleSchema.Encoded = {
    nodeId: 'consumer',
    offset: { x: 0, y: 0 },
    width: 0,
    height: 0,
  }

  const nullId: typeof MeasuredHandleSchema.Encoded = {
    ...encoded,
    // @ts-expect-error Null IDs have no native inhabitant.
    handleId: null,
  }

  // @ts-expect-error Native internal handle IDs remain branded.
  const unbrandedId: typeof HandleIdSchema.Type = 'source-top'
  // @ts-expect-error Public handle collections cannot be mutated.
  internal.handles.push(handle)
  // @ts-expect-error Measured handles retain graph-owned side on declarations.
  const duplicatePosition = handle.position
  // @ts-expect-error Measured handles retain graph-owned kind on declarations.
  const duplicateType = handle.type
  // @ts-expect-error Measured handles expose centers through offset, not top-left x.
  const rawX = handle.x
  // @ts-expect-error Measured handles expose centers through offset, not top-left y.
  const rawY = handle.y

  const sides: readonly (typeof FlowHandleSchema.Encoded)['side'][] = [
    'top',
    'right',
    'bottom',
    'left',
  ]

  const kinds: readonly (typeof FlowHandleSchema.Encoded)['kind'][] = [
    'source',
    'target',
  ]

  // @ts-expect-error Side variants are exhaustive.
  const invalidSide: (typeof FlowHandleSchema.Encoded)['side'] = 'diagonal'
  // @ts-expect-error Kind variants are exhaustive.
  const invalidKind: (typeof FlowHandleSchema.Encoded)['kind'] = 'both'

  const nullDeclaration: typeof FlowHandleSchema.Encoded = {
    // @ts-expect-error Nullable declaration IDs are rejected too.
    id: null,
    kind: 'source',
    side: 'top',
  }

  // @ts-expect-error Omitted declaration IDs are rejected too.
  const absentDeclaration: typeof FlowHandleSchema.Encoded = {
    kind: 'source',
    side: 'top',
  }

  void [
    numericWidth,
    numericHeight,
    status,
    records,
    declarations,
    owner,
    identity,
    centerX,
    centerY,
    nullWidth,
    nullHeight,
    absentWidth,
    missingHeight,
    measuredObject,
    internalsObject,
    nullRecords,
    absentRecords,
    absentId,
    nullId,
    unbrandedId,
    duplicatePosition,
    duplicateType,
    rawX,
    rawY,
    sides,
    kinds,
    invalidSide,
    invalidKind,
    nullDeclaration,
    absentDeclaration,
  ]
}

// Installed native refresh signatures preserve asynchronous ordered statuses.
export const consumeRefreshMembers = (
  owner: JavaScriptFlowController
): void => {
  const one = owner.updateNodeInternals('consumer')
  const batch = owner.updateNodeInternals(['consumer'])

  const asynchronous: Promise<
    readonly {
      readonly nodeId: typeof NodeIdSchema.Type
      readonly status: 'requested' | 'missing' | 'disposed' | 'failed'
    }[]
  > = batch

  // @ts-expect-error The native facade returns a promise rather than undefined.
  const reactVoid: undefined = one
  // @ts-expect-error Refresh IDs cannot be numbers.
  owner.updateNodeInternals(1)
  void [one, batch, asynchronous, reactVoid]
}

// Installed declarations must retain exact approved fields without widening the edge contract.
export const nativeNodeFields = [
  { connectable: false, ariaRole: '', ariaLabel: '', ariaDescription: '' },
  {
    connectable: true,
    ariaRole: 'custom role',
    ariaLabel: '   ',
    ariaDescription: 'Description',
  },
  {
    connectable: undefined,
    ariaRole: undefined,
    ariaLabel: undefined,
    ariaDescription: undefined,
  },
] satisfies Pick<
  FlowDocument['nodes'][number],
  'connectable' | 'ariaRole' | 'ariaLabel' | 'ariaDescription'
>[]

export const nativeEdgeFields = [
  { ariaRole: '', ariaLabel: '' },
  { ariaRole: 'custom role', ariaLabel: '   ' },
  { ariaRole: undefined, ariaLabel: undefined },
] satisfies Pick<FlowDocument['edges'][number], 'ariaRole' | 'ariaLabel'>[]

// @ts-expect-error Null is not optional Boolean absence.
export const invalidConnectable: FlowDocument['nodes'][number]['connectable'] =
  null

// @ts-expect-error A numeric role is not native String metadata.
export const invalidNodeRole: FlowDocument['nodes'][number]['ariaRole'] = 1

// @ts-expect-error A Boolean role is not native String metadata.
export const invalidEdgeRole: FlowDocument['edges'][number]['ariaRole'] = false

// @ts-expect-error Null is not optional label absence.
export const invalidNodeLabel: FlowDocument['nodes'][number]['ariaLabel'] = null

// @ts-expect-error A Boolean description is not native String metadata.
export const invalidDescription: FlowDocument['nodes'][number]['ariaDescription'] = false

// @ts-expect-error A numeric edge label is not native String metadata.
export const invalidEdgeLabel: FlowDocument['edges'][number]['ariaLabel'] = 1

export type UnapprovedEdgeDescription =
  // @ts-expect-error Edge ariaDescription is outside the approved native field contract.
  FlowDocument['edges'][number]['ariaDescription']

// Complete additive persistence retains literal-v1 callers and narrows one v1/v2 union.
export const completeVersionedDocument = encodeVersionedFlowDocument(document)

export const completeVersionedSession = encodeVersionedFlowSession(document, {
  x: 0,
  y: 0,
  zoom: 1,
})

export const completeVersion: 1 | 2 = completeVersionedSession.version

// @ts-expect-error An additive encoder cannot promise literal-v1 output.
export const additiveLiteralOne: 1 = completeVersionedSession.version

export const decodedVersioned = decodeVersionedFlowSession({
  version: 2,
  document: { ...document, nodeOrigin: [0, 0] },
  viewport: { x: 0, y: 0, zoom: 1 },
})

export const explicitVersionTwo: SavedVersionedFlowSession = {
  version: 2,
  document: {
    ...document,
    nodeOrigin: S.decodeUnknownSync(NodeOriginSchema)([-0.5, 1.5]),
  },
  viewport: { x: 0, y: 0, zoom: 1 },
}

export const invalidVersionedFormat: SavedVersionedFlowSession = {
  ...completeVersionedSession,
  // @ts-expect-error A third unreleased format is outside the single-v2 contract.
  version: 3,
}

export const inspectPublicPersistence = (
  controller: JavaScriptFlowController
) => {
  const oldVersion: 1 = controller.getSavedSession().version
  const saved: SavedVersionedFlowSession = controller.getVersionedSavedSession()

  const prepared: Promise<FlowSnapshot> =
    controller.prepareVersionedRestore(saved)

  return { oldVersion, saved, prepared }
}

export const compilePurePathHelperContracts = () => {
  const coordinates: GetStraightPathParams = {
    sourceX: -0.25,
    sourceY: Number.NaN,
    targetX: Infinity,
    targetY: -Infinity,
  }

  const sides = ['left', 'right', 'top', 'bottom'] satisfies NonNullable<
    GetBezierPathParams['sourcePosition']
  >[]

  const bezier: GetBezierPathParams = {
    ...coordinates,
    curvature: -0.5,
    sourcePosition: undefined,
    targetPosition: undefined,
  }

  const simple: GetSimpleBezierPathParams = {
    ...coordinates,
    sourcePosition: undefined,
    targetPosition: undefined,
  }

  const smooth: GetSmoothStepPathParams = {
    ...coordinates,
    borderRadius: -5,
    offset: -10,
    stepPosition: 1.5,
    centerX: undefined,
    centerY: undefined,
  }

  const ownUndefinedBezier: GetBezierPathParams = {
    ...coordinates,
    sourcePosition: undefined,
    targetPosition: undefined,
    curvature: undefined,
  }

  const ownUndefinedSimple: GetSimpleBezierPathParams = {
    ...coordinates,
    sourcePosition: undefined,
    targetPosition: undefined,
  }

  const ownUndefinedSmooth: GetSmoothStepPathParams = {
    ...coordinates,
    sourcePosition: undefined,
    targetPosition: undefined,
    borderRadius: undefined,
    offset: undefined,
    stepPosition: undefined,
    centerX: undefined,
    centerY: undefined,
  }

  getBezierPath(ownUndefinedBezier)
  getSimpleBezierPath(ownUndefinedSimple)
  getSmoothStepPath(ownUndefinedSmooth)

  for (const sourcePosition of sides) {
    getBezierPath({ ...bezier, sourcePosition })
    getSimpleBezierPath({ ...simple, sourcePosition })
    getSmoothStepPath({ ...smooth, sourcePosition })
  }

  const paths = [
    getStraightPath(coordinates),
    getBezierPath(bezier),
    getSimpleBezierPath(simple),
    getSmoothStepPath(smooth),
  ]

  for (const result of paths) {
    const path: string = result[0]
    const values: number[] = [result[1], result[2], result[3], result[4]]
    result[0] = path
    result[1] = values[0] ?? 0
    result[2] = 1
    result[3] = 2
    result[4] = 3
    // @ts-expect-error Five-tuples have no sixth result.
    result[5] = 9
    // @ts-expect-error Path position is string.
    result[0] = 9
    // @ts-expect-error Numeric label position is number.
    result[1] = 'label'
  }

  const center = getEdgeCenter(coordinates)
  const fourNumbers: [number, number, number, number] = center
  center[0] = 1
  center[1] = 2
  center[2] = 3
  center[3] = 4
  // @ts-expect-error Center is exactly four numbers.
  center[4] = 9
  // @ts-expect-error Center positions are numbers.
  center[0] = 'center'
  // @ts-expect-error Readonly parameter coordinates cannot be assigned.
  coordinates.sourceX = 9
  // @ts-expect-error Readonly parameter options cannot be assigned.
  bezier.curvature = 1
  // @ts-expect-error getStraightPath requires sourceX.
  getStraightPath({ sourceY: 1, targetX: 1, targetY: 1 })
  // @ts-expect-error getStraightPath requires sourceY.
  getStraightPath({ sourceX: 1, targetX: 1, targetY: 1 })
  // @ts-expect-error getStraightPath requires targetX.
  getStraightPath({ sourceX: 1, sourceY: 1, targetY: 1 })
  // @ts-expect-error getStraightPath requires targetY.
  getStraightPath({ sourceX: 1, sourceY: 1, targetX: 1 })
  // @ts-expect-error Required coordinates reject strings.
  getStraightPath({ ...coordinates, sourceX: '0' })
  // @ts-expect-error Required coordinates reject null.
  getStraightPath({ ...coordinates, targetY: null })
  // @ts-expect-error Required coordinates reject undefined.
  getStraightPath({ ...coordinates, sourceY: undefined })
  // @ts-expect-error Fresh arguments reject undeclared options.
  getStraightPath({ ...coordinates, undeclared: 1 })
  // @ts-expect-error getBezierPath requires sourceX.
  getBezierPath({ sourceY: 1, targetX: 1, targetY: 1 })
  // @ts-expect-error getBezierPath requires sourceY.
  getBezierPath({ sourceX: 1, targetX: 1, targetY: 1 })
  // @ts-expect-error getBezierPath requires targetX.
  getBezierPath({ sourceX: 1, sourceY: 1, targetY: 1 })
  // @ts-expect-error getBezierPath requires targetY.
  getBezierPath({ sourceX: 1, sourceY: 1, targetX: 1 })
  // @ts-expect-error Required coordinates reject strings.
  getBezierPath({ ...coordinates, sourceX: '0' })
  // @ts-expect-error Required coordinates reject null.
  getBezierPath({ ...coordinates, targetY: null })
  // @ts-expect-error Required coordinates reject undefined.
  getBezierPath({ ...coordinates, sourceY: undefined })
  // @ts-expect-error Fresh arguments reject undeclared options.
  getBezierPath({ ...coordinates, undeclared: 1 })
  // @ts-expect-error getSimpleBezierPath requires sourceX.
  getSimpleBezierPath({ sourceY: 1, targetX: 1, targetY: 1 })
  // @ts-expect-error getSimpleBezierPath requires sourceY.
  getSimpleBezierPath({ sourceX: 1, targetX: 1, targetY: 1 })
  // @ts-expect-error getSimpleBezierPath requires targetX.
  getSimpleBezierPath({ sourceX: 1, sourceY: 1, targetY: 1 })
  // @ts-expect-error getSimpleBezierPath requires targetY.
  getSimpleBezierPath({ sourceX: 1, sourceY: 1, targetX: 1 })
  // @ts-expect-error Required coordinates reject strings.
  getSimpleBezierPath({ ...coordinates, sourceX: '0' })
  // @ts-expect-error Required coordinates reject null.
  getSimpleBezierPath({ ...coordinates, targetY: null })
  // @ts-expect-error Required coordinates reject undefined.
  getSimpleBezierPath({ ...coordinates, sourceY: undefined })
  // @ts-expect-error Fresh arguments reject undeclared options.
  getSimpleBezierPath({ ...coordinates, undeclared: 1 })
  // @ts-expect-error getSmoothStepPath requires sourceX.
  getSmoothStepPath({ sourceY: 1, targetX: 1, targetY: 1 })
  // @ts-expect-error getSmoothStepPath requires sourceY.
  getSmoothStepPath({ sourceX: 1, targetX: 1, targetY: 1 })
  // @ts-expect-error getSmoothStepPath requires targetX.
  getSmoothStepPath({ sourceX: 1, sourceY: 1, targetY: 1 })
  // @ts-expect-error getSmoothStepPath requires targetY.
  getSmoothStepPath({ sourceX: 1, sourceY: 1, targetX: 1 })
  // @ts-expect-error Required coordinates reject strings.
  getSmoothStepPath({ ...coordinates, sourceX: '0' })
  // @ts-expect-error Required coordinates reject null.
  getSmoothStepPath({ ...coordinates, targetY: null })
  // @ts-expect-error Required coordinates reject undefined.
  getSmoothStepPath({ ...coordinates, sourceY: undefined })
  // @ts-expect-error Fresh arguments reject undeclared options.
  getSmoothStepPath({ ...coordinates, undeclared: 1 })
  // @ts-expect-error getEdgeCenter requires sourceX.
  getEdgeCenter({ sourceY: 1, targetX: 1, targetY: 1 })
  // @ts-expect-error getEdgeCenter requires sourceY.
  getEdgeCenter({ sourceX: 1, targetX: 1, targetY: 1 })
  // @ts-expect-error getEdgeCenter requires targetX.
  getEdgeCenter({ sourceX: 1, sourceY: 1, targetY: 1 })
  // @ts-expect-error getEdgeCenter requires targetY.
  getEdgeCenter({ sourceX: 1, sourceY: 1, targetX: 1 })
  // @ts-expect-error Required coordinates reject strings.
  getEdgeCenter({ ...coordinates, sourceX: '0' })
  // @ts-expect-error Required coordinates reject null.
  getEdgeCenter({ ...coordinates, targetY: null })
  // @ts-expect-error Required coordinates reject undefined.
  getEdgeCenter({ ...coordinates, sourceY: undefined })
  // @ts-expect-error Fresh arguments reject undeclared options.
  getEdgeCenter({ ...coordinates, undeclared: 1 })
  // @ts-expect-error sourcePosition is not nullable in getBezierPath.
  getBezierPath({ ...coordinates, sourcePosition: null })
  // @ts-expect-error targetPosition is not nullable in getBezierPath.
  getBezierPath({ ...coordinates, targetPosition: null })
  // @ts-expect-error curvature is not nullable in getBezierPath.
  getBezierPath({ ...coordinates, curvature: null })
  // @ts-expect-error Literal sides reject arbitrary strings.
  getBezierPath({ ...coordinates, sourcePosition: 'center' })
  // @ts-expect-error sourcePosition is not nullable in getSimpleBezierPath.
  getSimpleBezierPath({ ...coordinates, sourcePosition: null })
  // @ts-expect-error targetPosition is not nullable in getSimpleBezierPath.
  getSimpleBezierPath({ ...coordinates, targetPosition: null })
  // @ts-expect-error Literal sides reject arbitrary strings.
  getSimpleBezierPath({ ...coordinates, sourcePosition: 'center' })
  // @ts-expect-error sourcePosition is not nullable in getSmoothStepPath.
  getSmoothStepPath({ ...coordinates, sourcePosition: null })
  // @ts-expect-error targetPosition is not nullable in getSmoothStepPath.
  getSmoothStepPath({ ...coordinates, targetPosition: null })
  // @ts-expect-error borderRadius is not nullable in getSmoothStepPath.
  getSmoothStepPath({ ...coordinates, borderRadius: null })
  // @ts-expect-error offset is not nullable in getSmoothStepPath.
  getSmoothStepPath({ ...coordinates, offset: null })
  // @ts-expect-error stepPosition is not nullable in getSmoothStepPath.
  getSmoothStepPath({ ...coordinates, stepPosition: null })
  // @ts-expect-error centerX is not nullable in getSmoothStepPath.
  getSmoothStepPath({ ...coordinates, centerX: null })
  // @ts-expect-error centerY is not nullable in getSmoothStepPath.
  getSmoothStepPath({ ...coordinates, centerY: null })
  // @ts-expect-error Literal sides reject arbitrary strings.
  getSmoothStepPath({ ...coordinates, sourcePosition: 'center' })

  return { paths, center: fourNumbers }
}
