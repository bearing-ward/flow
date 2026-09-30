import type { FlowInternalNodeSchema } from '@flow/core'
import {
  FlowEditTransactionSchema,
  FlowDocumentSchema,
  FlowEdgeSchema,
  FlowNodeSchema,
  FlowSnapshotSchema,
  FlowStateChangeSchema,
  ViewportSchema,
  FlowEditErrorSchema,
  FlowConnectionSchema,
  ConnectionModeSchema,
  ConnectionIssueSchema,
  ReconnectEndpointSchema,
  NodeSizeSchema,
  XYPositionSchema,
} from '@flow/core'
import { Schema } from 'effect'

export type ConformanceDocument = typeof FlowDocumentSchema.Encoded

export interface ConformanceViewport {
  readonly x: number
  readonly y: number
  readonly zoom: number
}

export type ConformanceAction =
  | { readonly kind: 'update-document'; readonly document: ConformanceDocument }
  | {
      readonly kind: 'drag-node'
      readonly nodeId: string
      readonly dx: number
      readonly dy: number
      readonly cancel?: boolean | undefined
    }
  | {
      readonly kind: 'connect'
      readonly sourceNodeId: string
      readonly sourceHandleId: string
      readonly targetNodeId: string
      readonly targetHandleId: string
    }
  | { readonly kind: 'update-viewport'; readonly viewport: ConformanceViewport }

export interface ConformanceFixture {
  readonly version: 1
  readonly id: string
  readonly description: string
  readonly documentMode: 'controlled' | 'uncontrolled'
  readonly viewportMode: 'controlled' | 'uncontrolled'
  readonly renderOnlyVisible?: boolean
  readonly allowedConnectionTargets?: readonly string[]
  readonly document: ConformanceDocument
  readonly actions: readonly ConformanceAction[]
  readonly expected: {
    readonly nodeIds: readonly string[]
    readonly edgeIds: readonly string[]
    readonly positions: readonly {
      readonly id: string
      readonly x: number
      readonly y: number
    }[]
    readonly changeKinds: readonly string[]
    readonly preservedIdentityIds?: readonly string[]
  }
}

export interface ConformanceSnapshot {
  readonly nodeIds: readonly string[]
  readonly edgeIds: readonly string[]
  readonly positions: readonly {
    readonly id: string
    readonly x: number
    readonly y: number
  }[]
  readonly identityMarkers: readonly string[]
}

/** DOM selectors and browser-specific mechanics belong in an adapter implementation. */
export interface ConformanceAdapter {
  mount: (fixture: ConformanceFixture) => Promise<void>
  perform: (action: ConformanceAction) => Promise<void>
  snapshot: () => Promise<ConformanceSnapshot>
  markIdentity: (nodeId: string, marker: string) => Promise<void>
  changeKinds: () => Promise<readonly string[]>
  readState: (query: PublicStateQuery) => Promise<PublicStateRead>
  acceptedStates: () => Promise<readonly PublicStateChange[]>
  destroy: () => Promise<{
    readonly mountedElements: number
    readonly changesAfterDestroy: number
    readonly acceptedStatesAfterDestroy: number
  }>
}

export type MeasuredGeometryNode = typeof FlowInternalNodeSchema.Encoded

const RendererContractSceneSchema = Schema.Struct({
  id: Schema.String,
  type: Schema.optional(Schema.String),
  path: Schema.optional(Schema.String),
  label: Schema.optional(Schema.String),
  markerStart: Schema.optional(Schema.String),
  markerEnd: Schema.optional(Schema.String),
})

export const RendererContractFixtureSchema = Schema.Struct({
  contract: Schema.Literal('flow-renderer-contract-v1'),
  document: FlowDocumentSchema,
  expected: Schema.Struct({
    nodeTypes: Schema.Array(RendererContractSceneSchema),
    edgeTypes: Schema.Array(RendererContractSceneSchema),
    builtInPaths: Schema.Array(Schema.String),
    customEdgeType: Schema.String,
    unknownTypeFallback: Schema.String,
    dynamicHandle: Schema.Struct({
      nodeId: Schema.String,
      handleId: Schema.String,
      initialTop: Schema.Number,
      resizedTop: Schema.Number,
    }),
    interactiveDescendant: Schema.String,
    labelOwner: Schema.Literal('host-overlay'),
  }),
})

export type RendererContractFixture =
  typeof RendererContractFixtureSchema.Encoded

const InteractionSelectionCaseSchema = Schema.Struct({
  mode: Schema.Literals(['full', 'partial']),
  rect: Schema.Struct({
    x: Schema.Number,
    y: Schema.Number,
    width: Schema.Number,
    height: Schema.Number,
  }),
  nodeIds: Schema.Array(Schema.String),
})

const InteractionResizeCaseSchema = Schema.Struct({
  direction: Schema.Literals([
    'top',
    'right',
    'bottom',
    'left',
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
  ]),
  delta: XYPositionSchema,
  position: XYPositionSchema,
  size: NodeSizeSchema,
  childPosition: XYPositionSchema,
})

const InteractionConnectionCaseSchema = Schema.Struct({
  id: Schema.String,
  document: Schema.Literals(['connection', 'duplicate']),
  mode: ConnectionModeSchema,
  connection: FlowConnectionSchema,
  outcome: Schema.Literals(['accepted', 'rejected']),
  normalized: Schema.optional(FlowConnectionSchema),
  expectedEdgeId: Schema.optional(Schema.String),
  reason: Schema.optional(ConnectionIssueSchema),
  eventOrder: Schema.Array(Schema.String),
})

const InteractionReconnectionCaseSchema = Schema.Struct({
  id: Schema.String,
  endpoint: ReconnectEndpointSchema,
  nodeId: Schema.String,
  handleId: Schema.String,
  outcome: Schema.Literals(['accepted', 'rejected', 'unchanged']),
  expectedEdge: Schema.optional(FlowEdgeSchema),
  reason: Schema.optional(ConnectionIssueSchema),
})

const InteractionCancellationRetryCaseSchema = Schema.Struct({
  reason: Schema.String,
  attempt: FlowConnectionSchema,
  retry: FlowConnectionSchema,
  expectedRetryEdgeId: Schema.String,
  eventOrder: Schema.Array(Schema.String),
})

export const InteractionLifecycleFixtureSchema = Schema.Struct({
  contract: Schema.Literal('flow-interaction-lifecycle-v1'),
  units: Schema.Literal('unscaled-local-graph-units'),
  document: FlowDocumentSchema,
  connectionDocument: FlowDocumentSchema,
  duplicateDocument: FlowDocumentSchema,
  reconnectDocument: FlowDocumentSchema,
  connectionCases: Schema.Array(InteractionConnectionCaseSchema),
  reconnectionCases: Schema.Array(InteractionReconnectionCaseSchema),
  cancellationRetryCases: Schema.Array(InteractionCancellationRetryCaseSchema),
  selectionCases: Schema.Array(InteractionSelectionCaseSchema),
  resizeStart: Schema.Struct({
    position: XYPositionSchema,
    size: NodeSizeSchema,
    minimumSize: NodeSizeSchema,
  }),
  resizeCases: Schema.Array(InteractionResizeCaseSchema),
  cancellationReasons: Schema.Array(Schema.String),
  proposalOrder: Schema.Array(
    Schema.Literals([
      'preview',
      'proposal',
      'accepted-notification',
      'terminal-event',
    ])
  ),
})

export type InteractionLifecycleFixture =
  typeof InteractionLifecycleFixtureSchema.Encoded

const MeasuredGeometryCaseSchema = Schema.Struct({
  name: Schema.String,
  nodes: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      parentId: Schema.optional(Schema.String),
      hidden: Schema.optional(Schema.Boolean),
      position: XYPositionSchema,
      size: Schema.optional(NodeSizeSchema),
    })
  ),
  expectedAbsolutePosition: Schema.optional(XYPositionSchema),
  expectedMeasurement: Schema.optional(NodeSizeSchema),
  expectedReady: Schema.optional(
    Schema.Struct({
      includeHidden: Schema.Boolean,
      excludeHidden: Schema.Boolean,
    })
  ),
  measurement: Schema.optional(
    Schema.Struct({ width: Schema.Number, height: Schema.Number })
  ),
  isMeasured: Schema.optional(Schema.Boolean),
  isDomMeasured: Schema.optional(Schema.Boolean),
  fitDimensions: Schema.optional(NodeSizeSchema),
  nodeId: Schema.optional(Schema.String),
  firstGeneration: Schema.optional(Schema.Number),
  replacementGeneration: Schema.optional(Schema.Number),
  staleGenerationAccepted: Schema.optional(Schema.Boolean),
})

export const MeasuredGeometryContractSchema = Schema.Struct({
  contract: Schema.Literal('flow-measured-geometry-v1'),
  units: Schema.Literal('unscaled-local-graph-units'),
  cases: Schema.Array(MeasuredGeometryCaseSchema),
})

export type MeasuredGeometryCase = typeof MeasuredGeometryCaseSchema.Encoded

export interface MeasuredGeometryAdapter {
  mountMeasurementDocument: (
    document: ConformanceDocument,
    renderOnlyVisible: boolean
  ) => Promise<void>
  updateMeasurementDocument: (document: ConformanceDocument) => Promise<void>
  internalNode: (nodeId: string) => Promise<MeasuredGeometryNode | null>
  nodesInitialized: (includeHidden: boolean) => Promise<boolean>
  renderedNodeExists: (nodeId: string) => Promise<boolean>
  resizeAndRefresh: (
    nodeId: string,
    size: { readonly width: number; readonly height: number }
  ) => Promise<{
    readonly status: string
    readonly width: number | null
    readonly height: number | null
  }>
  removeAndReadd: (nodeId: string) => Promise<void>
  destroyMeasurementDocument: () => Promise<void>
}

export const PublicStateQuerySchema = Schema.Struct({
  nodeId: Schema.optional(Schema.String),
  edgeId: Schema.optional(Schema.String),
})

export type PublicStateQuery = typeof PublicStateQuerySchema.Encoded

export const PublicStateReadSchema = Schema.Struct({
  snapshot: FlowSnapshotSchema,
  node: Schema.NullOr(FlowNodeSchema),
  edge: Schema.NullOr(FlowEdgeSchema),
})

export type PublicStateRead = typeof PublicStateReadSchema.Encoded

export const PublicStateChangeSchema = FlowStateChangeSchema

export type PublicStateChange = typeof PublicStateChangeSchema.Encoded

const ConformanceActionSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal('update-document'),
    document: FlowDocumentSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal('drag-node'),
    nodeId: Schema.String,
    dx: Schema.Number,
    dy: Schema.Number,
    cancel: Schema.optional(Schema.Boolean),
  }),
  Schema.Struct({
    kind: Schema.Literal('update-viewport'),
    viewport: ViewportSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal('connect'),
    sourceNodeId: Schema.String,
    sourceHandleId: Schema.String,
    targetNodeId: Schema.String,
    targetHandleId: Schema.String,
  }),
])

const ConformanceFixtureSchema = Schema.Struct({
  version: Schema.Literal(1),
  id: Schema.String,
  description: Schema.String,
  documentMode: Schema.Literals(['controlled', 'uncontrolled']),
  viewportMode: Schema.Literals(['controlled', 'uncontrolled']),
  renderOnlyVisible: Schema.optional(Schema.Boolean),
  allowedConnectionTargets: Schema.optional(Schema.Array(Schema.String)),
  document: FlowDocumentSchema,
  actions: Schema.Array(ConformanceActionSchema),
  expected: Schema.Struct({
    nodeIds: Schema.Array(Schema.String),
    edgeIds: Schema.Array(Schema.String),
    positions: Schema.Array(
      Schema.Struct({ id: Schema.String, x: Schema.Number, y: Schema.Number })
    ),
    changeKinds: Schema.Array(Schema.String),
    preservedIdentityIds: Schema.optional(Schema.Array(Schema.String)),
  }),
})

const StateContractStepSchema = Schema.Struct({
  action: Schema.optional(ConformanceActionSchema),
  query: PublicStateQuerySchema,
  expected: Schema.Struct({
    read: PublicStateReadSchema,
    semanticKinds: Schema.Array(Schema.String),
    acceptedStates: Schema.Array(PublicStateChangeSchema),
    neighborNodeIds: Schema.Array(Schema.String),
    connectedEdgeIds: Schema.Array(Schema.String),
    rendered: Schema.Struct({
      nodeIds: Schema.Array(Schema.String),
      edgeIds: Schema.Array(Schema.String),
      edgeIdsByHost: Schema.Struct({
        vanilla: Schema.Array(Schema.String),
        vue: Schema.Array(Schema.String),
        foldkit: Schema.Array(Schema.String),
      }),
      positions: Schema.Array(
        Schema.Struct({ id: Schema.String, x: Schema.Number, y: Schema.Number })
      ),
    }),
  }),
})

export const PublicStateContractFixtureSchema = Schema.Struct({
  version: Schema.Literal(1),
  id: Schema.String,
  description: Schema.String,
  fixture: ConformanceFixtureSchema,
  graphQuery: Schema.Struct({ nodeId: Schema.String }),
  steps: Schema.Array(StateContractStepSchema),
  expectedDisposal: Schema.Struct({
    mountedElements: Schema.Literal(0),
    changesAfterDestroy: Schema.Literal(0),
    acceptedStatesAfterDestroy: Schema.Literal(0),
  }),
})

export const PublicEditContractFixtureSchema = Schema.Struct({
  version: Schema.Literal(1),
  id: Schema.String,
  description: Schema.String,
  documentMode: Schema.Literals(['controlled', 'uncontrolled']),
  document: FlowDocumentSchema,
  transaction: FlowEditTransactionSchema,
  expected: Schema.Struct({
    document: FlowDocumentSchema,
    deletedNodeIds: Schema.Array(Schema.String),
    deletedEdgeIds: Schema.Array(Schema.String),
    error: Schema.optional(FlowEditErrorSchema),
  }),
})

export type PublicEditContractFixture =
  typeof PublicEditContractFixtureSchema.Encoded

export const PublicEditQueuedDisposalSchema = Schema.Struct({
  version: Schema.Literal(1),
  id: Schema.Literal('queued-disposal'),
  description: Schema.String,
  document: FlowDocumentSchema,
  trigger: FlowEditTransactionSchema,
  queued: FlowEditTransactionSchema,
  expected: Schema.Struct({
    triggerOutcome: Schema.Literal('accepted'),
    queuedOutcome: Schema.Literal('disposed'),
    lateNotifications: Schema.Literal(0),
  }),
})

export type PublicEditQueuedDisposal =
  typeof PublicEditQueuedDisposalSchema.Encoded

export const validatePublicEditContractFixtures = (
  fixtures: readonly PublicEditContractFixture[]
): void => {
  const fixtureIds = new Set<string>()

  for (const fixture of fixtures) {
    if (
      fixture.version !== 1 ||
      fixture.id.length === 0 ||
      fixtureIds.has(fixture.id) ||
      fixture.transaction.operations.length === 0
    ) {
      throw new Error(
        `Invalid or duplicate public edit fixture id: ${fixture.id}`
      )
    }

    fixtureIds.add(fixture.id)
  }
}

export type PublicStateContractFixture =
  typeof PublicStateContractFixtureSchema.Encoded

export const validatePublicStateContractFixtures = (
  fixtures: readonly PublicStateContractFixture[]
): void => {
  const fixtureIds = new Set<string>()

  for (const fixture of fixtures) {
    if (
      fixture.version !== 1 ||
      fixture.id.length === 0 ||
      fixtureIds.has(fixture.id) ||
      fixture.fixture.id !== fixture.id ||
      fixture.steps.length === 0 ||
      fixture.steps[0]?.action !== undefined
    ) {
      throw new Error(
        `Invalid or duplicate public state fixture id: ${fixture.id}`
      )
    }

    fixtureIds.add(fixture.id)

    for (const step of fixture.steps) {
      if (
        step.expected.read.snapshot.document.nodes.length === 0 ||
        step.expected.read.snapshot.viewport.zoom <= 0 ||
        step.expected.rendered.nodeIds.length === 0
      ) {
        throw new Error(
          `Incomplete public state fixture expectation: ${fixture.id}`
        )
      }
    }
  }
}

export const conformanceFixtures: readonly ConformanceFixture[] = [
  {
    version: 1,
    id: 'keyed-update',
    description:
      'Preserve keyed identity while replacing node order and labels.',
    documentMode: 'controlled',
    viewportMode: 'controlled',
    document: {
      edges: [],
      nodes: [
        { id: 'first', label: 'First', position: { x: 40, y: 50 } },
        { id: 'second', label: 'Second', position: { x: 260, y: 90 } },
      ],
    },
    actions: [
      {
        kind: 'update-document',
        document: {
          edges: [],
          nodes: [
            { id: 'third', label: 'Third', position: { x: 420, y: 150 } },
            { id: 'first', label: 'First updated', position: { x: 70, y: 65 } },
          ],
        },
      },
    ],
    expected: {
      nodeIds: ['third', 'first'],
      edgeIds: [],
      positions: [
        { id: 'third', x: 420, y: 150 },
        { id: 'first', x: 70, y: 65 },
      ],
      changeKinds: [],
      preservedIdentityIds: ['first'],
    },
  },
  {
    version: 1,
    id: 'nested-absolute-position',
    description: 'Render a child at parent plus local position.',
    documentMode: 'uncontrolled',
    viewportMode: 'uncontrolled',
    document: {
      edges: [],
      nodes: [
        { id: 'parent', label: 'Parent', position: { x: 100, y: 110 } },
        {
          id: 'child',
          label: 'Child',
          parentId: 'parent',
          position: { x: 25, y: 35 },
        },
      ],
    },
    actions: [],
    expected: {
      nodeIds: ['parent', 'child'],
      edgeIds: [],
      positions: [
        { id: 'parent', x: 100, y: 110 },
        { id: 'child', x: 125, y: 145 },
      ],
      changeKinds: [],
    },
  },
  {
    version: 1,
    id: 'nested-grandchild-parent-update',
    description:
      'Resolve three levels of ancestry in non-ancestral document order after the caller updates the root.',
    documentMode: 'controlled',
    viewportMode: 'controlled',
    document: {
      edges: [],
      nodes: [
        {
          id: 'grandchild',
          label: 'Grandchild',
          parentId: 'child',
          position: { x: 7, y: 9 },
        },
        { id: 'root', label: 'Root', position: { x: 100, y: 110 } },
        {
          id: 'child',
          label: 'Child',
          parentId: 'root',
          position: { x: 25, y: 35 },
        },
      ],
    },
    actions: [
      {
        kind: 'update-document',
        document: {
          edges: [],
          nodes: [
            {
              id: 'grandchild',
              label: 'Grandchild',
              parentId: 'child',
              position: { x: 7, y: 9 },
            },
            { id: 'root', label: 'Root', position: { x: 200, y: 220 } },
            {
              id: 'child',
              label: 'Child',
              parentId: 'root',
              position: { x: 25, y: 35 },
            },
          ],
        },
      },
    ],
    expected: {
      nodeIds: ['root', 'child', 'grandchild'],
      edgeIds: [],
      positions: [
        { id: 'root', x: 200, y: 220 },
        { id: 'child', x: 225, y: 255 },
        { id: 'grandchild', x: 232, y: 264 },
      ],
      changeKinds: [],
    },
  },
  {
    version: 1,
    id: 'hidden-ancestor',
    description:
      'Hide descendants and edges incident to descendants of a hidden ancestor.',
    documentMode: 'uncontrolled',
    viewportMode: 'uncontrolled',
    document: {
      nodes: [
        {
          id: 'grandchild',
          label: 'Grandchild',
          parentId: 'child',
          position: { x: 7, y: 9 },
        },
        { id: 'visible', label: 'Visible', position: { x: 500, y: 20 } },
        {
          id: 'root',
          label: 'Root',
          hidden: true,
          position: { x: 100, y: 110 },
        },
        {
          id: 'child',
          label: 'Child',
          parentId: 'root',
          position: { x: 25, y: 35 },
        },
      ],
      edges: [
        { id: 'root-child', source: 'root', target: 'child' },
        { id: 'grandchild-visible', source: 'grandchild', target: 'visible' },
      ],
    },
    actions: [],
    expected: {
      nodeIds: ['visible'],
      edgeIds: [],
      positions: [{ id: 'visible', x: 500, y: 20 }],
      changeKinds: [],
    },
  },
  {
    version: 1,
    id: 'controlled-acknowledgement',
    description:
      'Emit a drag candidate, wait for authoritative acknowledgement, then render it.',
    documentMode: 'controlled',
    viewportMode: 'controlled',
    document: {
      edges: [],
      nodes: [{ id: 'move', label: 'Move', position: { x: 80, y: 100 } }],
    },
    actions: [
      { kind: 'drag-node', nodeId: 'move', dx: 40, dy: 20 },
      {
        kind: 'update-document',
        document: {
          edges: [],
          nodes: [{ id: 'move', label: 'Move', position: { x: 120, y: 120 } }],
        },
      },
    ],
    expected: {
      nodeIds: ['move'],
      edgeIds: [],
      positions: [{ id: 'move', x: 120, y: 120 }],
      changeKinds: ['node-position'],
    },
  },
  {
    version: 1,
    id: 'connection-validity',
    description:
      'Reject a disallowed connection and accept the allowed target.',
    documentMode: 'uncontrolled',
    viewportMode: 'uncontrolled',
    allowedConnectionTargets: ['approved'],
    document: {
      edges: [],
      nodes: [
        {
          id: 'source',
          label: 'Source',
          position: { x: 80, y: 120 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'rejected',
          label: 'Rejected',
          position: { x: 300, y: 120 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
        {
          id: 'approved',
          label: 'Approved',
          position: { x: 520, y: 120 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
    },
    actions: [
      {
        kind: 'connect',
        sourceNodeId: 'source',
        sourceHandleId: 'out',
        targetNodeId: 'rejected',
        targetHandleId: 'in',
      },
      {
        kind: 'connect',
        sourceNodeId: 'source',
        sourceHandleId: 'out',
        targetNodeId: 'approved',
        targetHandleId: 'in',
      },
    ],
    expected: {
      nodeIds: ['source', 'rejected', 'approved'],
      edgeIds: ['edge-1'],
      positions: [
        { id: 'source', x: 80, y: 120 },
        { id: 'rejected', x: 300, y: 120 },
        { id: 'approved', x: 520, y: 120 },
      ],
      changeKinds: ['edge-add'],
    },
  },
  {
    version: 1,
    id: 'gesture-cancellation',
    description: 'Cancel a node drag without a semantic position change.',
    documentMode: 'uncontrolled',
    viewportMode: 'uncontrolled',
    document: {
      edges: [],
      nodes: [{ id: 'cancel', label: 'Cancel', position: { x: 100, y: 120 } }],
    },
    actions: [
      { kind: 'drag-node', nodeId: 'cancel', dx: 80, dy: 40, cancel: true },
    ],
    expected: {
      nodeIds: ['cancel'],
      edgeIds: [],
      positions: [{ id: 'cancel', x: 100, y: 120 }],
      changeKinds: [],
    },
  },
  {
    version: 1,
    id: 'viewport-culling',
    description:
      'Cull offscreen nodes and render them after viewport movement.',
    documentMode: 'uncontrolled',
    viewportMode: 'uncontrolled',
    renderOnlyVisible: true,
    document: {
      edges: [],
      nodes: [
        { id: 'near', label: 'Near', position: { x: 100, y: 100 } },
        { id: 'far', label: 'Far', position: { x: 1500, y: 100 } },
      ],
    },
    actions: [
      { kind: 'update-viewport', viewport: { x: -1300, y: 0, zoom: 1 } },
    ],
    expected: {
      nodeIds: ['far'],
      edgeIds: [],
      positions: [{ id: 'far', x: 1500, y: 100 }],
      changeKinds: [],
    },
  },
]

export const validateConformanceFixtures = (
  fixtures: readonly ConformanceFixture[]
): void => {
  const ids = new Set<string>()

  for (const fixture of fixtures) {
    if (
      fixture.version !== 1 ||
      fixture.id.length === 0 ||
      ids.has(fixture.id)
    ) {
      throw new Error(
        `Invalid or duplicate conformance fixture id: ${fixture.id}`
      )
    }

    ids.add(fixture.id)
  }
}
