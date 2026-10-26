import {
  getBezierPath,
  getSimpleBezierPath,
  getSmoothStepPath,
  getStraightPath,
  getEdgeCenter,
  encodeVersionedFlowDocument,
  encodeVersionedFlowSession,
  decodeVersionedFlowSession,
  NodeOriginSchema,
  FlowInternalNodeSchema,
  MeasuredHandleSchema,
  decodeFlowDocument,
} from '@flow/core'
import type {
  GetBezierPathParams,
  GetSimpleBezierPathParams,
  GetSmoothStepPathParams,
  GetStraightPathParams,
  SavedVersionedFlowSession,
  FlowSnapshot,
  FlowDocument,
  FlowNode,
  FlowHandleSchema,
  NodeIdSchema,
  HandleIdSchema,
} from '@flow/core'
import {
  FlowBaseHandle,
  FlowBaseNode,
  FlowCanvas,
  useFlow,
  FlowControlButton,
  StatusIndicator,
  FlowAppendix,
  FlowTooltip,
  FlowLabeledHandle,
  DatabaseSchema,
  FlowPlaceholder,
} from '@flow/vue'
import type { FlowActions, FlowSelection } from '@flow/vue'
import { Effect, Schema as S } from 'effect'
import { defineComponent, h } from 'vue'

const document: FlowDocument = Effect.runSync(
  decodeFlowDocument({
    nodes: [{ id: 'vue-type', label: 'Vue', position: { x: 0, y: 0 } }],
    edges: [],
  })
)

export const NodeView = defineComponent({
  setup() {
    const flow: FlowActions = useFlow()

    return () =>
      h(
        FlowBaseNode,
        { title: 'Typed node' },
        {
          default: () => [
            h(StatusIndicator, { status: 'ready', label: 'Schema' }),
            h(
              FlowTooltip,
              { text: 'Refresh schema' },
              {
                default: () =>
                  h(
                    FlowControlButton,
                    {
                      type: 'button',
                      disabled: false,
                      name: 'schema-action',
                      value: 'refresh',
                      'aria-label': 'Refresh schema',
                      style: { color: 'navy' },
                      onClick: (event: MouseEvent) =>
                        flow.updateNode('vue-type', {
                          label: `Button ${event.button}`,
                        }),
                    },
                    { default: () => 'Refresh' }
                  ),
              }
            ),
            h(
              FlowAppendix,
              { id: 'packed-schema-details', label: 'Details' },
              {
                default: () =>
                  h(DatabaseSchema, {
                    table: {
                      name: 'users',
                      fields: [
                        {
                          id: 'id',
                          name: 'id',
                          type: 'uuid',
                          kind: 'source',
                          side: 'right',
                        },
                      ],
                    },
                  }),
              }
            ),
            h(FlowLabeledHandle, {
              id: 'output',
              label: 'Output',
              side: 'right',
            }),
            h(FlowPlaceholder, {
              label: 'Add table',
              disabled: false,
              onActivate: () =>
                flow.updateNode('vue-type', { label: 'New table' }),
            }),
            h(FlowBaseHandle, {
              id: 'output',
              kind: 'source',
              side: 'right',
            }),
          ],
        }
      )
  },
})

const selected: FlowSelection = { nodes: [], edges: [] }

const node: FlowNode | undefined = document.nodes[0]

void [NodeView, selected, FlowBaseHandle, FlowCanvas, node]

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
export const consumeRefreshMembers = (owner: FlowActions): void => {
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

export const completeVersion: 1 | 2 | 3 | 4 = completeVersionedSession.version

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
    // v2 edges carry only marker kinds; Plan 114 marker configurations need v3.
    edges: document.edges.map(
      ({ markerStart: _start, markerEnd: _end, ...edge }) => edge
    ),
    nodeOrigin: S.decodeUnknownSync(NodeOriginSchema)([-0.5, 1.5]),
  },
  viewport: { x: 0, y: 0, zoom: 1 },
}

export const invalidVersionedFormat: SavedVersionedFlowSession = {
  ...completeVersionedSession,
  // @ts-expect-error Version 5 is outside the supported v1/v2/v3/v4 contract.
  version: 5,
}

export const inspectPublicPersistence = (flow: FlowActions) => {
  const oldVersion: 1 = flow.getSavedSession().version
  const saved: SavedVersionedFlowSession = flow.getVersionedSavedSession()
  const prepared: Promise<FlowSnapshot> = flow.prepareVersionedRestore(saved)

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

export const transactionHistoryConsumer = async (flow: FlowActions) => {
  const before = flow.history.value
  await flow.undo()
  await flow.redo()
  flow.rejectHistory('packed-consumer-rejection')

  return before
}
