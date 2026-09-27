import { Effect, Schema as S } from 'effect'

import { ActiveConnectionSchema } from './flow-connection.schema.ts'
import {
  FlowEditTransactionSchema,
  FlowDeleteResultSchema,
} from './flow-edit.schema.ts'
import { prepareFlowEdit } from './flow-edit.ts'
import { NodeExtentSchema } from './flow-node-extent.schema.ts'
import {
  canReconnectEdge,
  ActiveEdgeReconnectSchema,
} from './flow-reconnection.schema.ts'
import { snapGroupDelta, snapPosition } from './flow-snap-grid.schema.ts'
import type { SnapGrid } from './flow-snap-grid.schema.ts'
import {
  FlowEdgeSchema,
  FlowDocumentSchema,
  EdgeIdSchema,
  NodeIdSchema,
  NodeSizeSchema,
  XYPositionSchema,
} from './flow.schema.ts'
import type {
  FlowDocument,
  NodeId,
  NodeSize,
  XYPosition,
} from './flow.schema.ts'

export const FlowControlModeSchema = S.Literals(['controlled', 'uncontrolled'])

export type FlowControlMode = typeof FlowControlModeSchema.Type

export const ViewportSchema = S.Struct({
  x: S.Number,
  y: S.Number,
  zoom: S.Finite.check(S.isGreaterThan(0)),
})

export type Viewport = typeof ViewportSchema.Type

export const ViewportLimitsSchema = S.Struct({
  maxZoom: S.Finite.check(S.isGreaterThan(0)),
  minZoom: S.Finite.check(S.isGreaterThan(0)),
}).check(
  S.makeFilter((limits) =>
    limits.minZoom <= limits.maxZoom
      ? undefined
      : 'minZoom must be less than or equal to maxZoom'
  )
)

export type ViewportLimits = typeof ViewportLimitsSchema.Type

export const MeasuredNodeSchema = S.Struct({
  height: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
  nodeId: NodeIdSchema,
  width: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
})

export type MeasuredNode = typeof MeasuredNodeSchema.Type

export const ActiveNodeDragSchema = S.Struct({
  nodeId: NodeIdSchema,
  pointerId: S.Number,
  pointerOffset: XYPositionSchema,
})

export type ActiveNodeDrag = typeof ActiveNodeDragSchema.Type

export const ActiveNodeGroupDragSchema = S.Struct({
  anchorNodeId: NodeIdSchema,
  pointerId: S.Number,
  pointerStart: XYPositionSchema,
  positions: S.Array(
    S.Struct({ nodeId: NodeIdSchema, position: XYPositionSchema })
  ),
})

export type ActiveNodeGroupDrag = typeof ActiveNodeGroupDragSchema.Type

export const ActiveViewportPanSchema = S.Struct({
  pointerId: S.Number,
  pointerStart: XYPositionSchema,
  viewportStart: ViewportSchema,
})

export type ActiveViewportPan = typeof ActiveViewportPanSchema.Type

export const ActivePinchSchema = S.Struct({
  firstPointerId: S.Number,
  secondPointerId: S.Number,
  firstStart: XYPositionSchema,
  secondStart: XYPositionSchema,
  viewportStart: ViewportSchema,
})

export type ActivePinch = typeof ActivePinchSchema.Type

export const ActiveSelectionRectSchema = S.Struct({
  pointerId: S.Number,
  pointerStart: XYPositionSchema,
  flowStart: XYPositionSchema,
})

export type ActiveSelectionRect = typeof ActiveSelectionRectSchema.Type

export const NodeResizeDirectionSchema = S.Literals([
  'top',
  'right',
  'bottom',
  'left',
  'top-left',
  'top-right',
  'bottom-right',
  'bottom-left',
])

export type NodeResizeDirection = typeof NodeResizeDirectionSchema.Type

export const ActiveNodeResizeSchema = S.Struct({
  direction: NodeResizeDirectionSchema,
  nodeId: NodeIdSchema,
  positionStart: XYPositionSchema,
  pointerId: S.Number,
  pointerStart: XYPositionSchema,
  sizeStart: NodeSizeSchema,
})

export type ActiveNodeResize = typeof ActiveNodeResizeSchema.Type

/**
 * Pointer session transitions (pointer ownership is always explicit):
 * idle -> node-pressed -> node-drag -> completed | cancelled;
 * idle -> connection | reconnection | pane-pan | selection | node-resize -> completed | cancelled;
 * pane-pan + a second distinct touch pointer -> one pinch session -> completed | cancelled.
 * Distinct pointers may own concurrent sessions (for example connection + node drag).
 * Click-to-connect is a separate persistent session because it outlives pointerup.
 * Keyboard movement is an immediate command and does not enter this state model.
 */
export const FlowInteractionSessionSchema = S.Union([
  S.Struct({
    kind: S.Literal('node-drag'),
    phase: S.Literals(['pressed', 'active']),
    drag: S.Union([ActiveNodeDragSchema, ActiveNodeGroupDragSchema]),
  }),
  S.Struct({
    kind: S.Literal('connection'),
    connection: ActiveConnectionSchema,
  }),
  S.Struct({
    kind: S.Literal('reconnection'),
    reconnection: ActiveEdgeReconnectSchema,
  }),
  S.Struct({ kind: S.Literal('pane-pan'), pan: ActiveViewportPanSchema }),
  S.Struct({ kind: S.Literal('pinch'), pinch: ActivePinchSchema }),
  S.Struct({
    kind: S.Literal('selection'),
    selection: ActiveSelectionRectSchema,
  }),
  S.Struct({ kind: S.Literal('node-resize'), resize: ActiveNodeResizeSchema }),
])

export type FlowInteractionSession = typeof FlowInteractionSessionSchema.Type

type PointerIds = readonly [number, ...number[]]

const pointerIdsForSession = (session: FlowInteractionSession): PointerIds => {
  switch (session.kind) {
    case 'node-drag': {
      return [session.drag.pointerId]
    }

    case 'connection': {
      return [session.connection.pointerId]
    }

    case 'reconnection': {
      return [session.reconnection.pointerId]
    }

    case 'pane-pan': {
      return [session.pan.pointerId]
    }

    case 'pinch': {
      return [session.pinch.firstPointerId, session.pinch.secondPointerId]
    }

    case 'selection': {
      return [session.selection.pointerId]
    }

    case 'node-resize': {
      return [session.resize.pointerId]
    }

    default: {
      const exhaustive: never = session

      return exhaustive
    }
  }
}

export const FlowInteractionSessionsSchema = S.Array(
  FlowInteractionSessionSchema
).check(
  S.makeFilter((sessions) => {
    const owned = sessions.flatMap(pointerIdsForSession)

    return new Set(owned).size === owned.length
      ? undefined
      : 'A pointer id can belong to only one interaction session'
  })
)

export type FlowInteractionSessions = typeof FlowInteractionSessionsSchema.Type

export type FlowInteractionSemanticEvent =
  | 'node-position'
  | 'node-positions'
  | 'node-size'
  | 'node-bounds'
  | 'edge-add'
  | 'edge-reconnect'
  | 'viewport'
  | 'selection-set'

export type FlowInteractionOutcome =
  | {
      readonly kind: 'started'
      readonly sessions: FlowInteractionSessions
      readonly session: FlowInteractionSession
    }
  | {
      readonly kind: 'rejected'
      readonly sessions: FlowInteractionSessions
      readonly reason: 'pointer-already-owned'
    }
  | {
      readonly kind: 'activated'
      readonly sessions: FlowInteractionSessions
      readonly session: FlowInteractionSession
    }
  | {
      readonly kind: 'finished' | 'cancelled'
      readonly sessions: FlowInteractionSessions
      readonly session: FlowInteractionSession
      readonly pointerIds: readonly number[]
      readonly preview:
        | 'node'
        | 'node-size'
        | 'node-bounds'
        | 'connection'
        | 'viewport'
        | 'selection'
      readonly frame: 'connection-autopan' | 'selection-autopan' | undefined
      readonly semanticEvent: FlowInteractionSemanticEvent | undefined
    }
  | { readonly kind: 'unchanged'; readonly sessions: FlowInteractionSessions }

const sessionIndexForPointer = (
  sessions: FlowInteractionSessions,
  pointerId: number
): number =>
  sessions.findIndex((session) =>
    pointerIdsForSession(session).includes(pointerId)
  )

/** Start a session only if none of its pointer ids are already owned. */
export const startFlowInteraction = (
  sessions: FlowInteractionSessions,
  session: FlowInteractionSession
): FlowInteractionOutcome => {
  const candidateIds = pointerIdsForSession(session)
  const occupied = new Set(sessions.flatMap(pointerIdsForSession))

  if (
    new Set(candidateIds).size !== candidateIds.length ||
    candidateIds.some((pointerId) => occupied.has(pointerId))
  ) {
    return { kind: 'rejected', sessions, reason: 'pointer-already-owned' }
  }

  return { kind: 'started', sessions: [...sessions, session], session }
}

/** Replace one existing session atomically, used when a second touch turns pan into pinch. */
export const replaceFlowInteraction = (
  sessions: FlowInteractionSessions,
  oldPointerId: number,
  replacement: FlowInteractionSession
): FlowInteractionOutcome => {
  const index = sessionIndexForPointer(sessions, oldPointerId)

  if (index < 0) {
    return { kind: 'unchanged', sessions }
  }

  const remaining = sessions.filter((_, item) => item !== index)
  const result = startFlowInteraction(remaining, replacement)

  return result.kind === 'started'
    ? result
    : { kind: 'rejected', sessions, reason: 'pointer-already-owned' }
}

/** Activate a node drag only after the host confirms its movement threshold. */
export const activateFlowInteraction = (
  sessions: FlowInteractionSessions,
  pointerId: number
): FlowInteractionOutcome => {
  const index = sessionIndexForPointer(sessions, pointerId)
  const session = sessions[index]

  if (session?.kind !== 'node-drag' || session.phase !== 'pressed') {
    return { kind: 'unchanged', sessions }
  }

  const activated: FlowInteractionSession = { ...session, phase: 'active' }

  return {
    kind: 'activated',
    sessions: sessions.map((item, at) => (at === index ? activated : item)),
    session: activated,
  }
}

const previewForSession = (
  session: FlowInteractionSession
):
  | 'node'
  | 'node-size'
  | 'node-bounds'
  | 'connection'
  | 'viewport'
  | 'selection' => {
  switch (session.kind) {
    case 'node-drag': {
      return 'node'
    }

    case 'connection':
    case 'reconnection': {
      return 'connection'
    }

    case 'pane-pan':
    case 'pinch': {
      return 'viewport'
    }

    case 'selection': {
      return 'selection'
    }

    case 'node-resize': {
      return 'node-bounds'
    }

    default: {
      const exhaustive: never = session

      return exhaustive
    }
  }
}

const frameForSession = (
  session: FlowInteractionSession
): 'connection-autopan' | 'selection-autopan' | undefined => {
  switch (session.kind) {
    case 'connection': {
      return 'connection-autopan'
    }

    case 'selection': {
      return 'selection-autopan'
    }

    default: {
      return undefined
    }
  }
}

const semanticEventForSession = (
  session: FlowInteractionSession
): FlowInteractionSemanticEvent | undefined => {
  switch (session.kind) {
    case 'node-drag': {
      if (session.phase === 'pressed') {
        return undefined
      }

      return 'positions' in session.drag ? 'node-positions' : 'node-position'
    }

    case 'connection': {
      return 'edge-add'
    }

    case 'reconnection': {
      return 'edge-reconnect'
    }

    case 'pane-pan':
    case 'pinch': {
      return 'viewport'
    }

    case 'selection': {
      return 'selection-set'
    }

    case 'node-resize': {
      return 'node-bounds'
    }

    default: {
      const exhaustive: never = session

      return exhaustive
    }
  }
}

const terminateFlowInteraction = (
  sessions: FlowInteractionSessions,
  pointerId: number,
  kind: 'finished' | 'cancelled'
): FlowInteractionOutcome => {
  const index = sessionIndexForPointer(sessions, pointerId)
  const session = sessions[index]

  if (session === undefined) {
    return { kind: 'unchanged', sessions }
  }

  return {
    kind,
    sessions: sessions.filter((_, at) => at !== index),
    session,
    pointerIds: pointerIdsForSession(session),
    preview: previewForSession(session),
    frame: frameForSession(session),
    semanticEvent:
      kind === 'finished' ? semanticEventForSession(session) : undefined,
  }
}

/** Finish or cancel a session; repeated terminal events are harmless no-ops. */
export const finishFlowInteraction = (
  sessions: FlowInteractionSessions,
  pointerId: number
): FlowInteractionOutcome =>
  terminateFlowInteraction(sessions, pointerId, 'finished')

export const cancelFlowInteraction = (
  sessions: FlowInteractionSessions,
  pointerId: number
): FlowInteractionOutcome =>
  terminateFlowInteraction(sessions, pointerId, 'cancelled')

/** Cancel every session, returning one cleanup outcome per uniquely owned pointer set. */
export const cancelAllFlowInteractions = (
  sessions: FlowInteractionSessions
): readonly FlowInteractionOutcome[] => {
  let remaining = sessions
  const outcomes: FlowInteractionOutcome[] = []

  for (const session of sessions) {
    const [pointerId] = pointerIdsForSession(session)
    const outcome = cancelFlowInteraction(remaining, pointerId)

    outcomes.push(outcome)
    remaining = outcome.sessions
  }

  return outcomes
}

export const NodePositionChangeSchema = S.Struct({
  kind: S.Literal('node-position'),
  nodeId: NodeIdSchema,
  position: XYPositionSchema,
})

export type NodePositionChange = typeof NodePositionChangeSchema.Type

export const NodePositionsChangeSchema = S.Struct({
  kind: S.Literal('node-positions'),
  positions: S.Array(
    S.Struct({ nodeId: NodeIdSchema, position: XYPositionSchema })
  ),
})

export type NodePositionsChange = typeof NodePositionsChangeSchema.Type

export const NodeSizeChangeSchema = S.Struct({
  kind: S.Literal('node-size'),
  nodeId: NodeIdSchema,
  size: NodeSizeSchema,
})

export type NodeSizeChange = typeof NodeSizeChangeSchema.Type

export const NodeBoundsChangeSchema = S.Struct({
  kind: S.Literal('node-bounds'),
  nodeId: NodeIdSchema,
  position: XYPositionSchema,
  size: NodeSizeSchema,
  childPositions: S.Array(
    S.Struct({ nodeId: NodeIdSchema, position: XYPositionSchema })
  ),
}).check(
  S.makeFilter((change) =>
    new Set(change.childPositions.map((item) => item.nodeId)).size ===
    change.childPositions.length
      ? undefined
      : 'childPositions must not contain duplicate node ids'
  )
)

export type NodeBoundsChange = typeof NodeBoundsChangeSchema.Type

const FinitePositionSchema = S.Struct({ x: S.Finite, y: S.Finite })

export const NodeResizeCalculationInputSchema = S.Struct({
  direction: NodeResizeDirectionSchema,
  positionStart: FinitePositionSchema,
  sizeStart: NodeSizeSchema,
  delta: FinitePositionSchema,
  minimumSize: NodeSizeSchema,
  bounds: S.optional(NodeExtentSchema),
})

export type NodeResizeCalculationInput =
  typeof NodeResizeCalculationInputSchema.Type

export const NodeResizeBoundsIssueSchema = S.Literals([
  'minimum-exceeds-bounds',
  'stationary-edge-outside-bounds',
  'unresized-axis-outside-bounds',
])

export type NodeResizeBoundsIssue = typeof NodeResizeBoundsIssueSchema.Type

export const NodeResizeCalculationSchema = S.Struct({
  position: FinitePositionSchema,
  size: NodeSizeSchema,
  /** Actual local movement after optional bounds are applied. */
  positionDelta: FinitePositionSchema,
  /** Apply to each direct child's local position to preserve its world position. */
  childrenPositionDelta: FinitePositionSchema,
  /**
   * Empty when bounds were omitted or the resulting rectangle fits them. A
   * non-empty value means no fully bounded candidate exists without violating
   * a resize invariant; hosts should not silently commit it as in-bounds.
   */
  boundsIssues: S.Array(NodeResizeBoundsIssueSchema),
})

export type NodeResizeCalculation = typeof NodeResizeCalculationSchema.Type

type NodeResizeBounds = NonNullable<NodeResizeCalculationInput['bounds']>

interface BoundedAxisResize {
  readonly position: number
  readonly size: number
}

const applyAxisBounds = (
  start: number,
  startSize: number,
  size: number,
  minimumSize: number,
  lowerBound: number,
  upperBound: number,
  fromLowerBound: boolean,
  issues: Set<NodeResizeBoundsIssue>
): BoundedAxisResize => {
  const fixedEdge = fromLowerBound ? start + startSize : start

  if (fixedEdge < lowerBound || fixedEdge > upperBound) {
    issues.add('stationary-edge-outside-bounds')
  }

  const availableSize = fromLowerBound
    ? fixedEdge - lowerBound
    : upperBound - start

  let boundedSize = Math.min(size, availableSize)

  if (availableSize < minimumSize) {
    issues.add('minimum-exceeds-bounds')
    boundedSize = minimumSize
  }

  return {
    position: fromLowerBound ? fixedEdge - boundedSize : start,
    size: boundedSize,
  }
}

const applyResizeBounds = (
  bounds: NodeResizeBounds,
  horizontal: boolean,
  vertical: boolean,
  fromLeft: boolean,
  fromTop: boolean,
  startX: number,
  startY: number,
  startWidth: number,
  startHeight: number,
  minimumWidth: number,
  minimumHeight: number,
  currentX: number,
  currentY: number,
  currentWidth: number,
  currentHeight: number,
  issues: Set<NodeResizeBoundsIssue>
) => {
  const { minX, minY, maxX, maxY } = bounds
  let x = currentX
  let y = currentY
  let width = currentWidth
  let height = currentHeight

  if (horizontal) {
    const bounded = applyAxisBounds(
      startX,
      startWidth,
      width,
      minimumWidth,
      minX,
      maxX,
      fromLeft,
      issues
    )

    x = bounded.position
    width = bounded.size
  } else if (startX < minX || startX + width > maxX) {
    issues.add('unresized-axis-outside-bounds')
  }

  if (vertical) {
    const bounded = applyAxisBounds(
      startY,
      startHeight,
      height,
      minimumHeight,
      minY,
      maxY,
      fromTop,
      issues
    )

    y = bounded.position
    height = bounded.size
  } else if (startY < minY || startY + height > maxY) {
    issues.add('unresized-axis-outside-bounds')
  }

  return { x, y, width, height }
}

/** Calculate a bounded resize candidate in the node parent's local coordinate space. */
export const calculateNodeResize = (
  input: NodeResizeCalculationInput
): NodeResizeCalculation => {
  const decoded = S.decodeUnknownSync(NodeResizeCalculationInputSchema)(input)

  const horizontal =
    decoded.direction.includes('left') || decoded.direction.includes('right')

  const vertical =
    decoded.direction.startsWith('top') ||
    decoded.direction.startsWith('bottom')

  const fromLeft =
    decoded.direction === 'left' || decoded.direction.endsWith('-left')

  const fromTop =
    decoded.direction === 'top' || decoded.direction.startsWith('top-')

  const boundsIssues = new Set<NodeResizeBoundsIssue>()

  const { x: startX, y: startY } = decoded.positionStart
  const { width: startWidth, height: startHeight } = decoded.sizeStart
  const { width: minimumWidth, height: minimumHeight } = decoded.minimumSize
  let { width } = decoded.sizeStart
  let { height } = decoded.sizeStart

  if (horizontal) {
    width = Math.max(
      decoded.minimumSize.width,
      width + decoded.delta.x * (fromLeft ? -1 : 1)
    )
  }

  if (vertical) {
    height = Math.max(
      decoded.minimumSize.height,
      height + decoded.delta.y * (fromTop ? -1 : 1)
    )
  }

  let x = fromLeft
    ? decoded.positionStart.x + decoded.sizeStart.width - width
    : decoded.positionStart.x

  let y = fromTop
    ? decoded.positionStart.y + decoded.sizeStart.height - height
    : decoded.positionStart.y

  if (decoded.bounds !== undefined) {
    const bounded = applyResizeBounds(
      decoded.bounds,
      horizontal,
      vertical,
      fromLeft,
      fromTop,
      startX,
      startY,
      startWidth,
      startHeight,
      minimumWidth,
      minimumHeight,
      x,
      y,
      width,
      height,
      boundsIssues
    )

    ;({ x, y, width, height } = bounded)
  }

  const position = { x, y }

  const positionDelta = {
    x: position.x - decoded.positionStart.x,
    y: position.y - decoded.positionStart.y,
  }

  return S.decodeUnknownSync(NodeResizeCalculationSchema)({
    position,
    size: { width, height },
    positionDelta,
    boundsIssues: [...boundsIssues],
    childrenPositionDelta: {
      x: positionDelta.x === 0 ? 0 : -positionDelta.x,
      y: positionDelta.y === 0 ? 0 : -positionDelta.y,
    },
  })
}

export const resizeNode = (
  nodeId: NodeId,
  initialSize: NodeSize,
  delta: XYPosition
): NodeSizeChange => ({
  kind: 'node-size',
  nodeId,
  size: S.decodeUnknownSync(NodeSizeSchema)({
    width: Math.max(40, initialSize.width + delta.x),
    height: Math.max(24, initialSize.height + delta.y),
  }),
})

export const ViewportChangeSchema = S.Struct({
  kind: S.Literal('viewport'),
  viewport: ViewportSchema,
})

export type ViewportChange = typeof ViewportChangeSchema.Type

export const EdgeAddChangeSchema = S.Struct({
  kind: S.Literal('edge-add'),
  edge: FlowEdgeSchema,
})

export type EdgeAddChange = typeof EdgeAddChangeSchema.Type

export const EdgeSelectionChangeSchema = S.Struct({
  kind: S.Literal('edge-selection'),
  edgeId: EdgeIdSchema,
  selected: S.Boolean,
})

export type EdgeSelectionChange = typeof EdgeSelectionChangeSchema.Type

export const NodeSelectionChangeSchema = S.Struct({
  kind: S.Literal('node-selection'),
  nodeId: NodeIdSchema,
  selected: S.Boolean,
})

export type NodeSelectionChange = typeof NodeSelectionChangeSchema.Type

export const SelectionSetChangeSchema = S.Struct({
  kind: S.Literal('selection-set'),
  nodeIds: S.Array(NodeIdSchema),
  edgeIds: S.Array(EdgeIdSchema),
})

export type SelectionSetChange = typeof SelectionSetChangeSchema.Type

export const EdgeReconnectChangeSchema = S.Struct({
  kind: S.Literal('edge-reconnect'),
  edge: FlowEdgeSchema,
})

export type EdgeReconnectChange = typeof EdgeReconnectChangeSchema.Type

export const EdgeRemoveChangeSchema = S.Struct({
  kind: S.Literal('edge-remove'),
  edgeId: EdgeIdSchema,
})

export type EdgeRemoveChange = typeof EdgeRemoveChangeSchema.Type

export const FlowEditProposalChangeSchema = S.Struct({
  kind: S.Literal('edit-proposal'),
  document: FlowDocumentSchema,
  deletion: FlowDeleteResultSchema,
})

export const FlowChangeSchema = S.Union([
  NodePositionChangeSchema,
  NodePositionsChangeSchema,
  NodeSizeChangeSchema,
  NodeBoundsChangeSchema,
  ViewportChangeSchema,
  EdgeAddChangeSchema,
  EdgeSelectionChangeSchema,
  NodeSelectionChangeSchema,
  SelectionSetChangeSchema,
  EdgeReconnectChangeSchema,
  EdgeRemoveChangeSchema,
  FlowEditProposalChangeSchema,
])

export type FlowChange = typeof FlowChangeSchema.Type

export const applyNodeBoundsChange = (
  document: FlowDocument,
  change: NodeBoundsChange
): FlowDocument | undefined => {
  const decoded = S.decodeUnknownSync(NodeBoundsChangeSchema)(change)
  const resized = document.nodes.find((node) => node.id === decoded.nodeId)

  if (
    resized === undefined ||
    decoded.childPositions.some(
      ({ nodeId }) => !document.nodes.some((node) => node.id === nodeId)
    )
  ) {
    return
  }

  const positions = new Map(
    decoded.childPositions.map(({ nodeId, position }) => [nodeId, position])
  )

  return {
    ...document,
    nodes: document.nodes.map((node) => {
      if (node.id === decoded.nodeId) {
        return { ...node, position: decoded.position, size: decoded.size }
      }

      const position = positions.get(node.id)

      return position === undefined ? node : { ...node, position }
    }),
  }
}

export const applyNodeSizeChange = (
  document: FlowDocument,
  change: NodeSizeChange
): FlowDocument | undefined => {
  const found = document.nodes.some((node) => node.id === change.nodeId)

  if (!found) {
    return
  }

  return {
    ...document,
    nodes: document.nodes.map((node) =>
      node.id === change.nodeId ? { ...node, size: change.size } : node
    ),
  }
}

export const applyEdgeSelectionChange = (
  document: FlowDocument,
  change: EdgeSelectionChange
): FlowDocument | undefined => {
  const target = document.edges.find((edge) => edge.id === change.edgeId)

  if (
    target === undefined ||
    (change.selected && (target.selectable === false || target.hidden === true))
  ) {
    return
  }

  return {
    ...document,
    nodes: change.selected
      ? document.nodes.map((node) =>
          node.selected === true ? { ...node, selected: false } : node
        )
      : document.nodes,
    edges: document.edges.map((edge) => {
      let selected = edge.selected === true

      if (edge.id === change.edgeId) {
        const { selected: nextSelected } = change
        selected = nextSelected
      } else if (change.selected) {
        selected = false
      }

      return edge.selected === selected ? edge : { ...edge, selected }
    }),
  }
}

export const applyNodeSelectionChange = (
  document: FlowDocument,
  change: NodeSelectionChange
): FlowDocument | undefined => {
  const target = document.nodes.find((node) => node.id === change.nodeId)

  if (
    target === undefined ||
    (change.selected && (target.selectable === false || target.hidden === true))
  ) {
    return
  }

  return {
    ...document,
    nodes: document.nodes.map((node) => {
      let selected = node.selected === true
      const { nodeId, selected: changeSelected } = change

      if (node.id === nodeId) {
        selected = changeSelected
      } else if (changeSelected) {
        selected = false
      }

      return node.selected === selected ? node : { ...node, selected }
    }),
    edges: change.selected
      ? document.edges.map((edge) =>
          edge.selected === true ? { ...edge, selected: false } : edge
        )
      : document.edges,
  }
}

export const applySelectionSetChange = (
  document: FlowDocument,
  change: SelectionSetChange
): FlowDocument | undefined => {
  const nodeIds = new Set(change.nodeIds)
  const edgeIds = new Set(change.edgeIds)

  if (
    change.nodeIds.some(
      (id) =>
        !document.nodes.some(
          (node) =>
            node.id === id && node.selectable !== false && node.hidden !== true
        )
    ) ||
    change.edgeIds.some(
      (id) =>
        !document.edges.some(
          (edge) =>
            edge.id === id &&
            edge.selectable !== false &&
            edge.hidden !== true &&
            document.nodes.some(
              (node) => node.id === edge.source && node.hidden !== true
            ) &&
            document.nodes.some(
              (node) => node.id === edge.target && node.hidden !== true
            )
        )
    )
  ) {
    return
  }

  return {
    ...document,
    nodes: document.nodes.map((node) => {
      const selected = nodeIds.has(node.id)

      return node.selected === selected ? node : { ...node, selected }
    }),
    edges: document.edges.map((edge) => {
      const selected = edgeIds.has(edge.id)

      return edge.selected === selected ? edge : { ...edge, selected }
    }),
  }
}

export const applyEdgeReconnectChange = (
  document: FlowDocument,
  change: EdgeReconnectChange
): FlowDocument | undefined => {
  const previous = document.edges.find((edge) => edge.id === change.edge.id)

  const sourceChanged =
    previous?.source !== change.edge.source ||
    previous?.sourceHandle !== change.edge.sourceHandle

  const targetChanged =
    previous?.target !== change.edge.target ||
    previous?.targetHandle !== change.edge.targetHandle

  if (
    previous === undefined ||
    sourceChanged === targetChanged ||
    (sourceChanged && !canReconnectEdge(previous, 'source')) ||
    (targetChanged && !canReconnectEdge(previous, 'target'))
  ) {
    return
  }

  return {
    ...document,
    edges: document.edges.map((edge) =>
      edge.id === change.edge.id ? change.edge : edge
    ),
  }
}

export const applyEdgeRemoveChange = (
  document: FlowDocument,
  change: EdgeRemoveChange
): FlowDocument | undefined => {
  const edge = document.edges.find((item) => item.id === change.edgeId)

  if (edge === undefined || edge.deletable === false) {
    return
  }

  return {
    ...document,
    edges: document.edges.filter((item) => item.id !== change.edgeId),
  }
}

export const SetNodePositionCommandSchema = S.Struct({
  kind: S.Literal('set-node-position'),
  nodeId: NodeIdSchema,
  position: XYPositionSchema,
})

export type SetNodePositionCommand = typeof SetNodePositionCommandSchema.Type

export const SetViewportCommandSchema = S.Struct({
  kind: S.Literal('set-viewport'),
  viewport: ViewportSchema,
})

export type SetViewportCommand = typeof SetViewportCommandSchema.Type

export const EditTransactionCommandSchema = S.Struct({
  kind: S.Literal('edit-transaction'),
  transaction: FlowEditTransactionSchema,
})

export type EditTransactionCommand = typeof EditTransactionCommandSchema.Type

export const FlowCommandSchema = S.Union([
  SetNodePositionCommandSchema,
  SetViewportCommandSchema,
  EditTransactionCommandSchema,
])

export type FlowCommand = typeof FlowCommandSchema.Type

export const screenToFlowPosition = (
  position: XYPosition,
  viewport: Viewport
): XYPosition => ({
  x: (position.x - viewport.x) / viewport.zoom,
  y: (position.y - viewport.y) / viewport.zoom,
})

export const flowToScreenPosition = (
  position: XYPosition,
  viewport: Viewport
): XYPosition => ({
  x: position.x * viewport.zoom + viewport.x,
  y: position.y * viewport.zoom + viewport.y,
})

export const clampViewport = (
  viewport: Viewport,
  limits: ViewportLimits
): Viewport => ({
  ...viewport,
  zoom: Math.min(limits.maxZoom, Math.max(limits.minZoom, viewport.zoom)),
})

export const panViewport = (
  viewport: Viewport,
  delta: XYPosition
): Viewport => ({
  ...viewport,
  x: viewport.x + delta.x,
  y: viewport.y + delta.y,
})

export const selectionAutoPanDelta = (
  pointer: XYPosition,
  width: number,
  height: number,
  band = 40,
  speed = 15
): XYPosition => {
  const x = pointer.x < band ? speed : 0
  const y = pointer.y < band ? speed : 0

  return {
    x: pointer.x > width - band ? -speed : x,
    y: pointer.y > height - band ? -speed : y,
  }
}

export const zoomViewportAt = (
  viewport: Viewport,
  requestedZoom: number,
  anchor: XYPosition,
  limits: ViewportLimits
): Viewport => {
  const zoom = Math.min(limits.maxZoom, Math.max(limits.minZoom, requestedZoom))

  const flowAnchor = screenToFlowPosition(anchor, viewport)

  return {
    x: anchor.x - flowAnchor.x * zoom,
    y: anchor.y - flowAnchor.y * zoom,
    zoom,
  }
}

export const beginViewportPan = (
  viewport: Viewport,
  pointerPosition: XYPosition,
  pointerId: number
): ActiveViewportPan => ({
  pointerId,
  pointerStart: pointerPosition,
  viewportStart: viewport,
})

export const moveViewportPan = (
  pan: ActiveViewportPan,
  pointerPosition: XYPosition
): Viewport =>
  panViewport(pan.viewportStart, {
    x: pointerPosition.x - pan.pointerStart.x,
    y: pointerPosition.y - pan.pointerStart.y,
  })

export const movePinch = (
  pinch: ActivePinch,
  first: XYPosition,
  second: XYPosition,
  limits: ViewportLimits
): Viewport => {
  const startMidpoint = {
    x: (pinch.firstStart.x + pinch.secondStart.x) / 2,
    y: (pinch.firstStart.y + pinch.secondStart.y) / 2,
  }

  const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }

  const startDistance = Math.hypot(
    pinch.secondStart.x - pinch.firstStart.x,
    pinch.secondStart.y - pinch.firstStart.y
  )

  const distance = Math.hypot(second.x - first.x, second.y - first.y)

  const zoom = Math.min(
    limits.maxZoom,
    Math.max(
      limits.minZoom,
      startDistance === 0
        ? pinch.viewportStart.zoom
        : (pinch.viewportStart.zoom * distance) / startDistance
    )
  )

  const anchor = screenToFlowPosition(startMidpoint, pinch.viewportStart)

  return {
    x: midpoint.x - anchor.x * zoom,
    y: midpoint.y - anchor.y * zoom,
    zoom,
  }
}

export const beginNodeDrag = (
  nodeId: NodeId,
  nodePosition: XYPosition,
  pointerPosition: XYPosition,
  pointerId: number
): ActiveNodeDrag => ({
  nodeId,
  pointerId,
  pointerOffset: {
    x: pointerPosition.x - nodePosition.x,
    y: pointerPosition.y - nodePosition.y,
  },
})

export const moveNodeDrag = (
  drag: ActiveNodeDrag,
  pointerPosition: XYPosition,
  grid?: SnapGrid
): XYPosition => {
  const position = {
    x: pointerPosition.x - drag.pointerOffset.x,
    y: pointerPosition.y - drag.pointerOffset.y,
  }

  return grid === undefined ? position : snapPosition(position, grid)
}

export const completeNodeDrag = (
  drag: ActiveNodeDrag,
  pointerPosition: XYPosition,
  grid?: SnapGrid
): NodePositionChange => ({
  kind: 'node-position',
  nodeId: drag.nodeId,
  position: moveNodeDrag(drag, pointerPosition, grid),
})

export const moveNodeGroupDrag = (
  drag: ActiveNodeGroupDrag,
  pointerPosition: XYPosition,
  grid?: SnapGrid
): NodePositionsChange => {
  const unsnappedDelta = {
    x: pointerPosition.x - drag.pointerStart.x,
    y: pointerPosition.y - drag.pointerStart.y,
  }

  const [first] = drag.positions

  const delta =
    grid === undefined || first === undefined
      ? unsnappedDelta
      : snapGroupDelta(first.position, unsnappedDelta, grid)

  return {
    kind: 'node-positions',
    positions: drag.positions.map(({ nodeId, position }) => ({
      nodeId,
      position: { x: position.x + delta.x, y: position.y + delta.y },
    })),
  }
}

export const moveSelectedNodes = (
  document: FlowDocument,
  delta: XYPosition,
  grid?: SnapGrid
): NodePositionsChange => {
  const nodesById = new Map(document.nodes.map((node) => [node.id, node]))

  const hasSelectedAncestor = (nodeId: NodeId): boolean => {
    let parentId = nodesById.get(nodeId)?.parentId

    while (parentId !== undefined) {
      const parent = nodesById.get(parentId)

      if (parent?.selected === true && parent.draggable !== false) {
        return true
      }

      parentId = parent?.parentId
    }

    return false
  }

  return {
    kind: 'node-positions',
    positions: document.nodes
      .filter(
        (node) =>
          node.selected === true &&
          node.hidden !== true &&
          node.draggable !== false &&
          !hasSelectedAncestor(node.id)
      )
      .map((node) => ({
        nodeId: node.id,
        position:
          grid === undefined
            ? { x: node.position.x + delta.x, y: node.position.y + delta.y }
            : snapPosition(
                { x: node.position.x + delta.x, y: node.position.y + delta.y },
                grid
              ),
      })),
  }
}

export const commandToChange = (
  command: Exclude<FlowCommand, EditTransactionCommand>
): FlowChange => {
  switch (command.kind) {
    case 'set-node-position': {
      return {
        kind: 'node-position',
        nodeId: command.nodeId,
        position: command.position,
      }
    }

    case 'set-viewport': {
      return { kind: 'viewport', viewport: command.viewport }
    }

    default: {
      const exhaustive: never = command

      return exhaustive
    }
  }
}

/** Resolve a command that needs the accepted document before it can become a semantic change. */
export const prepareFlowCommand = (
  document: FlowDocument,
  command: FlowCommand
) =>
  command.kind === 'edit-transaction'
    ? prepareFlowEdit(document, command.transaction).pipe(
        Effect.map(({ document: candidate, deletion }) => ({
          kind: 'edit-proposal' as const,
          document: candidate,
          deletion,
        }))
      )
    : Effect.succeed(commandToChange(command))

export const applyNodePositionChange = (
  document: FlowDocument,
  change: NodePositionChange
): FlowDocument | undefined => {
  let found = false

  const nodes = document.nodes.map((node) => {
    if (node.id !== change.nodeId) {
      return node
    }

    if (node.draggable === false) {
      return node
    }

    found = true

    return { ...node, position: change.position }
  })

  return found ? { ...document, nodes } : undefined
}

export const applyNodePositionsChange = (
  document: FlowDocument,
  change: NodePositionsChange
): FlowDocument | undefined => {
  const positions = new Map(
    change.positions.map(({ nodeId, position }) => [nodeId, position])
  )

  if (
    positions.size !== change.positions.length ||
    [...positions.keys()].some(
      (id) =>
        !document.nodes.some(
          (node) => node.id === id && node.draggable !== false
        )
    )
  ) {
    return
  }

  return {
    ...document,
    nodes: document.nodes.map((node) => {
      const position = positions.get(node.id)

      return position === undefined ? node : { ...node, position }
    }),
  }
}
