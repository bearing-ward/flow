import {
  encodeVersionedFlowDocument,
  encodeVersionedFlowSession,
  decodeVersionedFlowSession,
  NodeOriginSchema,
  FlowInternalNodeSchema,
  MeasuredHandleSchema,
  decodeFlowDocument,
} from '@flow/core'
import type {
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

export const inspectPublicPersistence = (flow: FlowActions) => {
  const oldVersion: 1 = flow.getSavedSession().version
  const saved: SavedVersionedFlowSession = flow.getVersionedSavedSession()
  const prepared: Promise<FlowSnapshot> = flow.prepareVersionedRestore(saved)

  return { oldVersion, saved, prepared }
}
