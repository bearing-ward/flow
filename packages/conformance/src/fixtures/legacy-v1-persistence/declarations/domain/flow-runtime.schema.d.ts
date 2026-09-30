import { Effect, Schema as S } from 'effect'

import type { SnapGrid } from './flow-snap-grid.schema.ts'
import type {
  FlowDocument,
  NodeId,
  NodeSize,
  XYPosition,
} from './flow.schema.ts'
export declare const FlowControlModeSchema: S.Literals<
  readonly ['controlled', 'uncontrolled']
>
export type FlowControlMode = typeof FlowControlModeSchema.Type
export declare const ViewportSchema: S.Struct<{
  readonly x: S.Number
  readonly y: S.Number
  readonly zoom: S.Finite
}>
export type Viewport = typeof ViewportSchema.Type
export declare const ViewportLimitsSchema: S.Struct<{
  readonly maxZoom: S.Finite
  readonly minZoom: S.Finite
}>
export type ViewportLimits = typeof ViewportLimitsSchema.Type
export declare const MeasuredNodeSchema: S.Struct<{
  readonly height: S.Finite
  readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
  readonly width: S.Finite
}>
export type MeasuredNode = typeof MeasuredNodeSchema.Type
export declare const ActiveNodeDragSchema: S.Struct<{
  readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
  readonly pointerId: S.Number
  readonly pointerOffset: S.Struct<{
    readonly x: S.Number
    readonly y: S.Number
  }>
}>
export type ActiveNodeDrag = typeof ActiveNodeDragSchema.Type
export declare const ActiveNodeGroupDragSchema: S.Struct<{
  readonly anchorNodeId: S.brand<S.NonEmptyString, 'NodeId'>
  readonly pointerId: S.Number
  readonly pointerStart: S.Struct<{
    readonly x: S.Number
    readonly y: S.Number
  }>
  readonly positions: S.$Array<
    S.Struct<{
      readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
      readonly position: S.Struct<{
        readonly x: S.Number
        readonly y: S.Number
      }>
    }>
  >
}>
export type ActiveNodeGroupDrag = typeof ActiveNodeGroupDragSchema.Type
export declare const ActiveViewportPanSchema: S.Struct<{
  readonly pointerId: S.Number
  readonly pointerStart: S.Struct<{
    readonly x: S.Number
    readonly y: S.Number
  }>
  readonly viewportStart: S.Struct<{
    readonly x: S.Number
    readonly y: S.Number
    readonly zoom: S.Finite
  }>
}>
export type ActiveViewportPan = typeof ActiveViewportPanSchema.Type
export declare const ActivePinchSchema: S.Struct<{
  readonly firstPointerId: S.Number
  readonly secondPointerId: S.Number
  readonly firstStart: S.Struct<{
    readonly x: S.Number
    readonly y: S.Number
  }>
  readonly secondStart: S.Struct<{
    readonly x: S.Number
    readonly y: S.Number
  }>
  readonly viewportStart: S.Struct<{
    readonly x: S.Number
    readonly y: S.Number
    readonly zoom: S.Finite
  }>
}>
export type ActivePinch = typeof ActivePinchSchema.Type
export declare const ActiveSelectionRectSchema: S.Struct<{
  readonly pointerId: S.Number
  readonly pointerStart: S.Struct<{
    readonly x: S.Number
    readonly y: S.Number
  }>
  readonly flowStart: S.Struct<{
    readonly x: S.Number
    readonly y: S.Number
  }>
}>
export type ActiveSelectionRect = typeof ActiveSelectionRectSchema.Type
export declare const NodeResizeDirectionSchema: S.Literals<
  readonly [
    'top',
    'right',
    'bottom',
    'left',
    'top-left',
    'top-right',
    'bottom-right',
    'bottom-left',
  ]
>
export type NodeResizeDirection = typeof NodeResizeDirectionSchema.Type
export declare const ActiveNodeResizeSchema: S.Struct<{
  readonly direction: S.Literals<
    readonly [
      'top',
      'right',
      'bottom',
      'left',
      'top-left',
      'top-right',
      'bottom-right',
      'bottom-left',
    ]
  >
  readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
  readonly positionStart: S.Struct<{
    readonly x: S.Number
    readonly y: S.Number
  }>
  readonly pointerId: S.Number
  readonly pointerStart: S.Struct<{
    readonly x: S.Number
    readonly y: S.Number
  }>
  readonly sizeStart: S.Struct<{
    readonly width: S.Finite
    readonly height: S.Finite
  }>
}>
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
export declare const FlowInteractionSessionSchema: S.Union<
  readonly [
    S.Struct<{
      readonly kind: S.Literal<'node-drag'>
      readonly phase: S.Literals<readonly ['pressed', 'active']>
      readonly drag: S.Union<
        readonly [
          S.Struct<{
            readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
            readonly pointerId: S.Number
            readonly pointerOffset: S.Struct<{
              readonly x: S.Number
              readonly y: S.Number
            }>
          }>,
          S.Struct<{
            readonly anchorNodeId: S.brand<S.NonEmptyString, 'NodeId'>
            readonly pointerId: S.Number
            readonly pointerStart: S.Struct<{
              readonly x: S.Number
              readonly y: S.Number
            }>
            readonly positions: S.$Array<
              S.Struct<{
                readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
                readonly position: S.Struct<{
                  readonly x: S.Number
                  readonly y: S.Number
                }>
              }>
            >
          }>,
        ]
      >
    }>,
    S.Struct<{
      readonly kind: S.Literal<'connection'>
      readonly connection: S.Struct<{
        readonly pointerId: S.Number
        readonly source: S.brand<S.NonEmptyString, 'NodeId'>
        readonly sourceHandle: S.brand<S.NonEmptyString, 'HandleId'>
      }>
    }>,
    S.Struct<{
      readonly kind: S.Literal<'reconnection'>
      readonly reconnection: S.Struct<{
        readonly edgeId: S.brand<S.NonEmptyString, 'EdgeId'>
        readonly endpoint: S.Literals<readonly ['source', 'target']>
        readonly pointerId: S.Number
      }>
    }>,
    S.Struct<{
      readonly kind: S.Literal<'pane-pan'>
      readonly pan: S.Struct<{
        readonly pointerId: S.Number
        readonly pointerStart: S.Struct<{
          readonly x: S.Number
          readonly y: S.Number
        }>
        readonly viewportStart: S.Struct<{
          readonly x: S.Number
          readonly y: S.Number
          readonly zoom: S.Finite
        }>
      }>
    }>,
    S.Struct<{
      readonly kind: S.Literal<'pinch'>
      readonly pinch: S.Struct<{
        readonly firstPointerId: S.Number
        readonly secondPointerId: S.Number
        readonly firstStart: S.Struct<{
          readonly x: S.Number
          readonly y: S.Number
        }>
        readonly secondStart: S.Struct<{
          readonly x: S.Number
          readonly y: S.Number
        }>
        readonly viewportStart: S.Struct<{
          readonly x: S.Number
          readonly y: S.Number
          readonly zoom: S.Finite
        }>
      }>
    }>,
    S.Struct<{
      readonly kind: S.Literal<'selection'>
      readonly selection: S.Struct<{
        readonly pointerId: S.Number
        readonly pointerStart: S.Struct<{
          readonly x: S.Number
          readonly y: S.Number
        }>
        readonly flowStart: S.Struct<{
          readonly x: S.Number
          readonly y: S.Number
        }>
      }>
    }>,
    S.Struct<{
      readonly kind: S.Literal<'node-resize'>
      readonly resize: S.Struct<{
        readonly direction: S.Literals<
          readonly [
            'top',
            'right',
            'bottom',
            'left',
            'top-left',
            'top-right',
            'bottom-right',
            'bottom-left',
          ]
        >
        readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
        readonly positionStart: S.Struct<{
          readonly x: S.Number
          readonly y: S.Number
        }>
        readonly pointerId: S.Number
        readonly pointerStart: S.Struct<{
          readonly x: S.Number
          readonly y: S.Number
        }>
        readonly sizeStart: S.Struct<{
          readonly width: S.Finite
          readonly height: S.Finite
        }>
      }>
    }>,
  ]
>
export type FlowInteractionSession = typeof FlowInteractionSessionSchema.Type
export declare const FlowInteractionSessionsSchema: S.$Array<
  S.Union<
    readonly [
      S.Struct<{
        readonly kind: S.Literal<'node-drag'>
        readonly phase: S.Literals<readonly ['pressed', 'active']>
        readonly drag: S.Union<
          readonly [
            S.Struct<{
              readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
              readonly pointerId: S.Number
              readonly pointerOffset: S.Struct<{
                readonly x: S.Number
                readonly y: S.Number
              }>
            }>,
            S.Struct<{
              readonly anchorNodeId: S.brand<S.NonEmptyString, 'NodeId'>
              readonly pointerId: S.Number
              readonly pointerStart: S.Struct<{
                readonly x: S.Number
                readonly y: S.Number
              }>
              readonly positions: S.$Array<
                S.Struct<{
                  readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
                  readonly position: S.Struct<{
                    readonly x: S.Number
                    readonly y: S.Number
                  }>
                }>
              >
            }>,
          ]
        >
      }>,
      S.Struct<{
        readonly kind: S.Literal<'connection'>
        readonly connection: S.Struct<{
          readonly pointerId: S.Number
          readonly source: S.brand<S.NonEmptyString, 'NodeId'>
          readonly sourceHandle: S.brand<S.NonEmptyString, 'HandleId'>
        }>
      }>,
      S.Struct<{
        readonly kind: S.Literal<'reconnection'>
        readonly reconnection: S.Struct<{
          readonly edgeId: S.brand<S.NonEmptyString, 'EdgeId'>
          readonly endpoint: S.Literals<readonly ['source', 'target']>
          readonly pointerId: S.Number
        }>
      }>,
      S.Struct<{
        readonly kind: S.Literal<'pane-pan'>
        readonly pan: S.Struct<{
          readonly pointerId: S.Number
          readonly pointerStart: S.Struct<{
            readonly x: S.Number
            readonly y: S.Number
          }>
          readonly viewportStart: S.Struct<{
            readonly x: S.Number
            readonly y: S.Number
            readonly zoom: S.Finite
          }>
        }>
      }>,
      S.Struct<{
        readonly kind: S.Literal<'pinch'>
        readonly pinch: S.Struct<{
          readonly firstPointerId: S.Number
          readonly secondPointerId: S.Number
          readonly firstStart: S.Struct<{
            readonly x: S.Number
            readonly y: S.Number
          }>
          readonly secondStart: S.Struct<{
            readonly x: S.Number
            readonly y: S.Number
          }>
          readonly viewportStart: S.Struct<{
            readonly x: S.Number
            readonly y: S.Number
            readonly zoom: S.Finite
          }>
        }>
      }>,
      S.Struct<{
        readonly kind: S.Literal<'selection'>
        readonly selection: S.Struct<{
          readonly pointerId: S.Number
          readonly pointerStart: S.Struct<{
            readonly x: S.Number
            readonly y: S.Number
          }>
          readonly flowStart: S.Struct<{
            readonly x: S.Number
            readonly y: S.Number
          }>
        }>
      }>,
      S.Struct<{
        readonly kind: S.Literal<'node-resize'>
        readonly resize: S.Struct<{
          readonly direction: S.Literals<
            readonly [
              'top',
              'right',
              'bottom',
              'left',
              'top-left',
              'top-right',
              'bottom-right',
              'bottom-left',
            ]
          >
          readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
          readonly positionStart: S.Struct<{
            readonly x: S.Number
            readonly y: S.Number
          }>
          readonly pointerId: S.Number
          readonly pointerStart: S.Struct<{
            readonly x: S.Number
            readonly y: S.Number
          }>
          readonly sizeStart: S.Struct<{
            readonly width: S.Finite
            readonly height: S.Finite
          }>
        }>
      }>,
    ]
  >
>
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
  | {
      readonly kind: 'unchanged'
      readonly sessions: FlowInteractionSessions
    }
/** Start a session only if none of its pointer ids are already owned. */
export declare const startFlowInteraction: (
  sessions: FlowInteractionSessions,
  session: FlowInteractionSession
) => FlowInteractionOutcome
/** Replace one existing session atomically, used when a second touch turns pan into pinch. */
export declare const replaceFlowInteraction: (
  sessions: FlowInteractionSessions,
  oldPointerId: number,
  replacement: FlowInteractionSession
) => FlowInteractionOutcome
/** Activate a node drag only after the host confirms its movement threshold. */
export declare const activateFlowInteraction: (
  sessions: FlowInteractionSessions,
  pointerId: number
) => FlowInteractionOutcome
/** Finish or cancel a session; repeated terminal events are harmless no-ops. */
export declare const finishFlowInteraction: (
  sessions: FlowInteractionSessions,
  pointerId: number
) => FlowInteractionOutcome
export declare const cancelFlowInteraction: (
  sessions: FlowInteractionSessions,
  pointerId: number
) => FlowInteractionOutcome
/** Cancel every session, returning one cleanup outcome per uniquely owned pointer set. */
export declare const cancelAllFlowInteractions: (
  sessions: FlowInteractionSessions
) => readonly FlowInteractionOutcome[]
export declare const NodePositionChangeSchema: S.Struct<{
  readonly kind: S.Literal<'node-position'>
  readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
  readonly position: S.Struct<{
    readonly x: S.Number
    readonly y: S.Number
  }>
}>
export type NodePositionChange = typeof NodePositionChangeSchema.Type
export declare const NodePositionsChangeSchema: S.Struct<{
  readonly kind: S.Literal<'node-positions'>
  readonly positions: S.$Array<
    S.Struct<{
      readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
      readonly position: S.Struct<{
        readonly x: S.Number
        readonly y: S.Number
      }>
    }>
  >
}>
export type NodePositionsChange = typeof NodePositionsChangeSchema.Type
export declare const NodeSizeChangeSchema: S.Struct<{
  readonly kind: S.Literal<'node-size'>
  readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
  readonly size: S.Struct<{
    readonly width: S.Finite
    readonly height: S.Finite
  }>
}>
export type NodeSizeChange = typeof NodeSizeChangeSchema.Type
export declare const NodeBoundsChangeSchema: S.Struct<{
  readonly kind: S.Literal<'node-bounds'>
  readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
  readonly position: S.Struct<{
    readonly x: S.Number
    readonly y: S.Number
  }>
  readonly size: S.Struct<{
    readonly width: S.Finite
    readonly height: S.Finite
  }>
  readonly childPositions: S.$Array<
    S.Struct<{
      readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
      readonly position: S.Struct<{
        readonly x: S.Number
        readonly y: S.Number
      }>
    }>
  >
}>
export type NodeBoundsChange = typeof NodeBoundsChangeSchema.Type
export declare const NodeResizeCalculationInputSchema: S.Struct<{
  readonly direction: S.Literals<
    readonly [
      'top',
      'right',
      'bottom',
      'left',
      'top-left',
      'top-right',
      'bottom-right',
      'bottom-left',
    ]
  >
  readonly positionStart: S.Struct<{
    readonly x: S.Finite
    readonly y: S.Finite
  }>
  readonly sizeStart: S.Struct<{
    readonly width: S.Finite
    readonly height: S.Finite
  }>
  readonly delta: S.Struct<{
    readonly x: S.Finite
    readonly y: S.Finite
  }>
  readonly minimumSize: S.Struct<{
    readonly width: S.Finite
    readonly height: S.Finite
  }>
  readonly bounds: S.optional<
    S.Struct<{
      readonly minX: S.Finite
      readonly minY: S.Finite
      readonly maxX: S.Finite
      readonly maxY: S.Finite
    }>
  >
}>
export type NodeResizeCalculationInput =
  typeof NodeResizeCalculationInputSchema.Type
export declare const NodeResizeBoundsIssueSchema: S.Literals<
  readonly [
    'minimum-exceeds-bounds',
    'stationary-edge-outside-bounds',
    'unresized-axis-outside-bounds',
  ]
>
export type NodeResizeBoundsIssue = typeof NodeResizeBoundsIssueSchema.Type
export declare const NodeResizeCalculationSchema: S.Struct<{
  readonly position: S.Struct<{
    readonly x: S.Finite
    readonly y: S.Finite
  }>
  readonly size: S.Struct<{
    readonly width: S.Finite
    readonly height: S.Finite
  }>
  /** Actual local movement after optional bounds are applied. */
  readonly positionDelta: S.Struct<{
    readonly x: S.Finite
    readonly y: S.Finite
  }>
  /** Apply to each direct child's local position to preserve its world position. */
  readonly childrenPositionDelta: S.Struct<{
    readonly x: S.Finite
    readonly y: S.Finite
  }>
  /**
   * Empty when bounds were omitted or the resulting rectangle fits them. A
   * non-empty value means no fully bounded candidate exists without violating
   * a resize invariant; hosts should not silently commit it as in-bounds.
   */
  readonly boundsIssues: S.$Array<
    S.Literals<
      readonly [
        'minimum-exceeds-bounds',
        'stationary-edge-outside-bounds',
        'unresized-axis-outside-bounds',
      ]
    >
  >
}>
export type NodeResizeCalculation = typeof NodeResizeCalculationSchema.Type
/** Calculate a bounded resize candidate in the node parent's local coordinate space. */
export declare const calculateNodeResize: (
  input: NodeResizeCalculationInput
) => NodeResizeCalculation
export declare const resizeNode: (
  nodeId: NodeId,
  initialSize: NodeSize,
  delta: XYPosition
) => NodeSizeChange
export declare const ViewportChangeSchema: S.Struct<{
  readonly kind: S.Literal<'viewport'>
  readonly viewport: S.Struct<{
    readonly x: S.Number
    readonly y: S.Number
    readonly zoom: S.Finite
  }>
}>
export type ViewportChange = typeof ViewportChangeSchema.Type
export declare const EdgeAddChangeSchema: S.Struct<{
  readonly kind: S.Literal<'edge-add'>
  readonly edge: S.Struct<{
    readonly id: S.brand<S.NonEmptyString, 'EdgeId'>
    readonly source: S.brand<S.NonEmptyString, 'NodeId'>
    readonly target: S.brand<S.NonEmptyString, 'NodeId'>
    readonly type: S.optional<S.NonEmptyString>
    readonly sourceHandle: S.optional<S.brand<S.NonEmptyString, 'HandleId'>>
    readonly targetHandle: S.optional<S.brand<S.NonEmptyString, 'HandleId'>>
    readonly path: S.optional<
      S.Literals<
        readonly ['straight', 'bezier', 'step', 'smoothstep', 'simplebezier']
      >
    >
    readonly label: S.optional<S.String>
    readonly data: S.optional<
      S.$Record<S.String, S.Codec<S.Json, S.Json, never, never>>
    >
    readonly markerStart: S.optional<
      S.Literals<readonly ['arrow', 'arrowclosed']>
    >
    readonly markerEnd: S.optional<
      S.Literals<readonly ['arrow', 'arrowclosed']>
    >
    readonly stroke: S.optional<S.String>
    readonly strokeWidth: S.optional<S.Finite>
    readonly selected: S.optional<S.Boolean>
    readonly deletable: S.optional<S.Boolean>
    readonly selectable: S.optional<S.Boolean>
    readonly focusable: S.optional<S.Boolean>
    readonly reconnectable: S.optional<
      S.Union<readonly [S.Boolean, S.Literals<readonly ['source', 'target']>]>
    >
    readonly interactionWidth: S.optional<S.Finite>
    readonly ariaLabel: S.optional<S.NonEmptyString>
    readonly hidden: S.optional<S.Boolean>
    readonly zIndex: S.optional<S.Finite>
  }>
}>
export type EdgeAddChange = typeof EdgeAddChangeSchema.Type
export declare const EdgeSelectionChangeSchema: S.Struct<{
  readonly kind: S.Literal<'edge-selection'>
  readonly edgeId: S.brand<S.NonEmptyString, 'EdgeId'>
  readonly selected: S.Boolean
}>
export type EdgeSelectionChange = typeof EdgeSelectionChangeSchema.Type
export declare const NodeSelectionChangeSchema: S.Struct<{
  readonly kind: S.Literal<'node-selection'>
  readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
  readonly selected: S.Boolean
}>
export type NodeSelectionChange = typeof NodeSelectionChangeSchema.Type
export declare const SelectionSetChangeSchema: S.Struct<{
  readonly kind: S.Literal<'selection-set'>
  readonly nodeIds: S.$Array<S.brand<S.NonEmptyString, 'NodeId'>>
  readonly edgeIds: S.$Array<S.brand<S.NonEmptyString, 'EdgeId'>>
}>
export type SelectionSetChange = typeof SelectionSetChangeSchema.Type
export declare const EdgeReconnectChangeSchema: S.Struct<{
  readonly kind: S.Literal<'edge-reconnect'>
  readonly edge: S.Struct<{
    readonly id: S.brand<S.NonEmptyString, 'EdgeId'>
    readonly source: S.brand<S.NonEmptyString, 'NodeId'>
    readonly target: S.brand<S.NonEmptyString, 'NodeId'>
    readonly type: S.optional<S.NonEmptyString>
    readonly sourceHandle: S.optional<S.brand<S.NonEmptyString, 'HandleId'>>
    readonly targetHandle: S.optional<S.brand<S.NonEmptyString, 'HandleId'>>
    readonly path: S.optional<
      S.Literals<
        readonly ['straight', 'bezier', 'step', 'smoothstep', 'simplebezier']
      >
    >
    readonly label: S.optional<S.String>
    readonly data: S.optional<
      S.$Record<S.String, S.Codec<S.Json, S.Json, never, never>>
    >
    readonly markerStart: S.optional<
      S.Literals<readonly ['arrow', 'arrowclosed']>
    >
    readonly markerEnd: S.optional<
      S.Literals<readonly ['arrow', 'arrowclosed']>
    >
    readonly stroke: S.optional<S.String>
    readonly strokeWidth: S.optional<S.Finite>
    readonly selected: S.optional<S.Boolean>
    readonly deletable: S.optional<S.Boolean>
    readonly selectable: S.optional<S.Boolean>
    readonly focusable: S.optional<S.Boolean>
    readonly reconnectable: S.optional<
      S.Union<readonly [S.Boolean, S.Literals<readonly ['source', 'target']>]>
    >
    readonly interactionWidth: S.optional<S.Finite>
    readonly ariaLabel: S.optional<S.NonEmptyString>
    readonly hidden: S.optional<S.Boolean>
    readonly zIndex: S.optional<S.Finite>
  }>
}>
export type EdgeReconnectChange = typeof EdgeReconnectChangeSchema.Type
export declare const EdgeRemoveChangeSchema: S.Struct<{
  readonly kind: S.Literal<'edge-remove'>
  readonly edgeId: S.brand<S.NonEmptyString, 'EdgeId'>
}>
export type EdgeRemoveChange = typeof EdgeRemoveChangeSchema.Type
export declare const FlowEditProposalChangeSchema: S.Struct<{
  readonly kind: S.Literal<'edit-proposal'>
  readonly document: S.Struct<{
    readonly edges: S.$Array<
      S.Struct<{
        readonly id: S.brand<S.NonEmptyString, 'EdgeId'>
        readonly source: S.brand<S.NonEmptyString, 'NodeId'>
        readonly target: S.brand<S.NonEmptyString, 'NodeId'>
        readonly type: S.optional<S.NonEmptyString>
        readonly sourceHandle: S.optional<S.brand<S.NonEmptyString, 'HandleId'>>
        readonly targetHandle: S.optional<S.brand<S.NonEmptyString, 'HandleId'>>
        readonly path: S.optional<
          S.Literals<
            readonly [
              'straight',
              'bezier',
              'step',
              'smoothstep',
              'simplebezier',
            ]
          >
        >
        readonly label: S.optional<S.String>
        readonly data: S.optional<
          S.$Record<S.String, S.Codec<S.Json, S.Json, never, never>>
        >
        readonly markerStart: S.optional<
          S.Literals<readonly ['arrow', 'arrowclosed']>
        >
        readonly markerEnd: S.optional<
          S.Literals<readonly ['arrow', 'arrowclosed']>
        >
        readonly stroke: S.optional<S.String>
        readonly strokeWidth: S.optional<S.Finite>
        readonly selected: S.optional<S.Boolean>
        readonly deletable: S.optional<S.Boolean>
        readonly selectable: S.optional<S.Boolean>
        readonly focusable: S.optional<S.Boolean>
        readonly reconnectable: S.optional<
          S.Union<
            readonly [S.Boolean, S.Literals<readonly ['source', 'target']>]
          >
        >
        readonly interactionWidth: S.optional<S.Finite>
        readonly ariaLabel: S.optional<S.NonEmptyString>
        readonly hidden: S.optional<S.Boolean>
        readonly zIndex: S.optional<S.Finite>
      }>
    >
    readonly nodes: S.$Array<
      S.Struct<{
        readonly id: S.brand<S.NonEmptyString, 'NodeId'>
        readonly label: S.String
        readonly position: S.Struct<{
          readonly x: S.Number
          readonly y: S.Number
        }>
        readonly parentId: S.optional<S.brand<S.NonEmptyString, 'NodeId'>>
        readonly type: S.optional<S.NonEmptyString>
        readonly data: S.optional<
          S.$Record<S.String, S.Codec<S.Json, S.Json, never, never>>
        >
        readonly zIndex: S.optional<S.Finite>
        readonly size: S.optional<
          S.Struct<{
            readonly width: S.Finite
            readonly height: S.Finite
          }>
        >
        readonly extent: S.optional<S.Literals<readonly ['parent']>>
        readonly handles: S.optional<
          S.$Array<
            S.Struct<{
              readonly id: S.brand<S.NonEmptyString, 'HandleId'>
              readonly kind: S.Literals<readonly ['source', 'target']>
              readonly side: S.Literals<
                readonly ['top', 'right', 'bottom', 'left']
              >
            }>
          >
        >
        readonly selected: S.optional<S.Boolean>
        readonly selectable: S.optional<S.Boolean>
        readonly focusable: S.optional<S.Boolean>
        readonly draggable: S.optional<S.Boolean>
        readonly deletable: S.optional<S.Boolean>
        readonly ariaLabel: S.optional<S.NonEmptyString>
        readonly ariaDescription: S.optional<S.NonEmptyString>
        readonly hidden: S.optional<S.Boolean>
      }>
    >
  }>
  readonly deletion: S.Struct<{
    readonly deletedNodeIds: S.$Array<S.brand<S.NonEmptyString, 'NodeId'>>
    readonly deletedEdgeIds: S.$Array<S.brand<S.NonEmptyString, 'EdgeId'>>
  }>
}>
export declare const FlowChangeSchema: S.Union<
  readonly [
    S.Struct<{
      readonly kind: S.Literal<'node-position'>
      readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
      readonly position: S.Struct<{
        readonly x: S.Number
        readonly y: S.Number
      }>
    }>,
    S.Struct<{
      readonly kind: S.Literal<'node-positions'>
      readonly positions: S.$Array<
        S.Struct<{
          readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
          readonly position: S.Struct<{
            readonly x: S.Number
            readonly y: S.Number
          }>
        }>
      >
    }>,
    S.Struct<{
      readonly kind: S.Literal<'node-size'>
      readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
      readonly size: S.Struct<{
        readonly width: S.Finite
        readonly height: S.Finite
      }>
    }>,
    S.Struct<{
      readonly kind: S.Literal<'node-bounds'>
      readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
      readonly position: S.Struct<{
        readonly x: S.Number
        readonly y: S.Number
      }>
      readonly size: S.Struct<{
        readonly width: S.Finite
        readonly height: S.Finite
      }>
      readonly childPositions: S.$Array<
        S.Struct<{
          readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
          readonly position: S.Struct<{
            readonly x: S.Number
            readonly y: S.Number
          }>
        }>
      >
    }>,
    S.Struct<{
      readonly kind: S.Literal<'viewport'>
      readonly viewport: S.Struct<{
        readonly x: S.Number
        readonly y: S.Number
        readonly zoom: S.Finite
      }>
    }>,
    S.Struct<{
      readonly kind: S.Literal<'edge-add'>
      readonly edge: S.Struct<{
        readonly id: S.brand<S.NonEmptyString, 'EdgeId'>
        readonly source: S.brand<S.NonEmptyString, 'NodeId'>
        readonly target: S.brand<S.NonEmptyString, 'NodeId'>
        readonly type: S.optional<S.NonEmptyString>
        readonly sourceHandle: S.optional<S.brand<S.NonEmptyString, 'HandleId'>>
        readonly targetHandle: S.optional<S.brand<S.NonEmptyString, 'HandleId'>>
        readonly path: S.optional<
          S.Literals<
            readonly [
              'straight',
              'bezier',
              'step',
              'smoothstep',
              'simplebezier',
            ]
          >
        >
        readonly label: S.optional<S.String>
        readonly data: S.optional<
          S.$Record<S.String, S.Codec<S.Json, S.Json, never, never>>
        >
        readonly markerStart: S.optional<
          S.Literals<readonly ['arrow', 'arrowclosed']>
        >
        readonly markerEnd: S.optional<
          S.Literals<readonly ['arrow', 'arrowclosed']>
        >
        readonly stroke: S.optional<S.String>
        readonly strokeWidth: S.optional<S.Finite>
        readonly selected: S.optional<S.Boolean>
        readonly deletable: S.optional<S.Boolean>
        readonly selectable: S.optional<S.Boolean>
        readonly focusable: S.optional<S.Boolean>
        readonly reconnectable: S.optional<
          S.Union<
            readonly [S.Boolean, S.Literals<readonly ['source', 'target']>]
          >
        >
        readonly interactionWidth: S.optional<S.Finite>
        readonly ariaLabel: S.optional<S.NonEmptyString>
        readonly hidden: S.optional<S.Boolean>
        readonly zIndex: S.optional<S.Finite>
      }>
    }>,
    S.Struct<{
      readonly kind: S.Literal<'edge-selection'>
      readonly edgeId: S.brand<S.NonEmptyString, 'EdgeId'>
      readonly selected: S.Boolean
    }>,
    S.Struct<{
      readonly kind: S.Literal<'node-selection'>
      readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
      readonly selected: S.Boolean
    }>,
    S.Struct<{
      readonly kind: S.Literal<'selection-set'>
      readonly nodeIds: S.$Array<S.brand<S.NonEmptyString, 'NodeId'>>
      readonly edgeIds: S.$Array<S.brand<S.NonEmptyString, 'EdgeId'>>
    }>,
    S.Struct<{
      readonly kind: S.Literal<'edge-reconnect'>
      readonly edge: S.Struct<{
        readonly id: S.brand<S.NonEmptyString, 'EdgeId'>
        readonly source: S.brand<S.NonEmptyString, 'NodeId'>
        readonly target: S.brand<S.NonEmptyString, 'NodeId'>
        readonly type: S.optional<S.NonEmptyString>
        readonly sourceHandle: S.optional<S.brand<S.NonEmptyString, 'HandleId'>>
        readonly targetHandle: S.optional<S.brand<S.NonEmptyString, 'HandleId'>>
        readonly path: S.optional<
          S.Literals<
            readonly [
              'straight',
              'bezier',
              'step',
              'smoothstep',
              'simplebezier',
            ]
          >
        >
        readonly label: S.optional<S.String>
        readonly data: S.optional<
          S.$Record<S.String, S.Codec<S.Json, S.Json, never, never>>
        >
        readonly markerStart: S.optional<
          S.Literals<readonly ['arrow', 'arrowclosed']>
        >
        readonly markerEnd: S.optional<
          S.Literals<readonly ['arrow', 'arrowclosed']>
        >
        readonly stroke: S.optional<S.String>
        readonly strokeWidth: S.optional<S.Finite>
        readonly selected: S.optional<S.Boolean>
        readonly deletable: S.optional<S.Boolean>
        readonly selectable: S.optional<S.Boolean>
        readonly focusable: S.optional<S.Boolean>
        readonly reconnectable: S.optional<
          S.Union<
            readonly [S.Boolean, S.Literals<readonly ['source', 'target']>]
          >
        >
        readonly interactionWidth: S.optional<S.Finite>
        readonly ariaLabel: S.optional<S.NonEmptyString>
        readonly hidden: S.optional<S.Boolean>
        readonly zIndex: S.optional<S.Finite>
      }>
    }>,
    S.Struct<{
      readonly kind: S.Literal<'edge-remove'>
      readonly edgeId: S.brand<S.NonEmptyString, 'EdgeId'>
    }>,
    S.Struct<{
      readonly kind: S.Literal<'edit-proposal'>
      readonly document: S.Struct<{
        readonly edges: S.$Array<
          S.Struct<{
            readonly id: S.brand<S.NonEmptyString, 'EdgeId'>
            readonly source: S.brand<S.NonEmptyString, 'NodeId'>
            readonly target: S.brand<S.NonEmptyString, 'NodeId'>
            readonly type: S.optional<S.NonEmptyString>
            readonly sourceHandle: S.optional<
              S.brand<S.NonEmptyString, 'HandleId'>
            >
            readonly targetHandle: S.optional<
              S.brand<S.NonEmptyString, 'HandleId'>
            >
            readonly path: S.optional<
              S.Literals<
                readonly [
                  'straight',
                  'bezier',
                  'step',
                  'smoothstep',
                  'simplebezier',
                ]
              >
            >
            readonly label: S.optional<S.String>
            readonly data: S.optional<
              S.$Record<S.String, S.Codec<S.Json, S.Json, never, never>>
            >
            readonly markerStart: S.optional<
              S.Literals<readonly ['arrow', 'arrowclosed']>
            >
            readonly markerEnd: S.optional<
              S.Literals<readonly ['arrow', 'arrowclosed']>
            >
            readonly stroke: S.optional<S.String>
            readonly strokeWidth: S.optional<S.Finite>
            readonly selected: S.optional<S.Boolean>
            readonly deletable: S.optional<S.Boolean>
            readonly selectable: S.optional<S.Boolean>
            readonly focusable: S.optional<S.Boolean>
            readonly reconnectable: S.optional<
              S.Union<
                readonly [S.Boolean, S.Literals<readonly ['source', 'target']>]
              >
            >
            readonly interactionWidth: S.optional<S.Finite>
            readonly ariaLabel: S.optional<S.NonEmptyString>
            readonly hidden: S.optional<S.Boolean>
            readonly zIndex: S.optional<S.Finite>
          }>
        >
        readonly nodes: S.$Array<
          S.Struct<{
            readonly id: S.brand<S.NonEmptyString, 'NodeId'>
            readonly label: S.String
            readonly position: S.Struct<{
              readonly x: S.Number
              readonly y: S.Number
            }>
            readonly parentId: S.optional<S.brand<S.NonEmptyString, 'NodeId'>>
            readonly type: S.optional<S.NonEmptyString>
            readonly data: S.optional<
              S.$Record<S.String, S.Codec<S.Json, S.Json, never, never>>
            >
            readonly zIndex: S.optional<S.Finite>
            readonly size: S.optional<
              S.Struct<{
                readonly width: S.Finite
                readonly height: S.Finite
              }>
            >
            readonly extent: S.optional<S.Literals<readonly ['parent']>>
            readonly handles: S.optional<
              S.$Array<
                S.Struct<{
                  readonly id: S.brand<S.NonEmptyString, 'HandleId'>
                  readonly kind: S.Literals<readonly ['source', 'target']>
                  readonly side: S.Literals<
                    readonly ['top', 'right', 'bottom', 'left']
                  >
                }>
              >
            >
            readonly selected: S.optional<S.Boolean>
            readonly selectable: S.optional<S.Boolean>
            readonly focusable: S.optional<S.Boolean>
            readonly draggable: S.optional<S.Boolean>
            readonly deletable: S.optional<S.Boolean>
            readonly ariaLabel: S.optional<S.NonEmptyString>
            readonly ariaDescription: S.optional<S.NonEmptyString>
            readonly hidden: S.optional<S.Boolean>
          }>
        >
      }>
      readonly deletion: S.Struct<{
        readonly deletedNodeIds: S.$Array<S.brand<S.NonEmptyString, 'NodeId'>>
        readonly deletedEdgeIds: S.$Array<S.brand<S.NonEmptyString, 'EdgeId'>>
      }>
    }>,
  ]
>
export type FlowChange = typeof FlowChangeSchema.Type
export declare const applyNodeBoundsChange: (
  document: FlowDocument,
  change: NodeBoundsChange
) => FlowDocument | undefined
export declare const applyNodeSizeChange: (
  document: FlowDocument,
  change: NodeSizeChange
) => FlowDocument | undefined
export declare const applyEdgeSelectionChange: (
  document: FlowDocument,
  change: EdgeSelectionChange
) => FlowDocument | undefined
export declare const applyNodeSelectionChange: (
  document: FlowDocument,
  change: NodeSelectionChange
) => FlowDocument | undefined
export declare const applySelectionSetChange: (
  document: FlowDocument,
  change: SelectionSetChange
) => FlowDocument | undefined
export declare const applyEdgeReconnectChange: (
  document: FlowDocument,
  change: EdgeReconnectChange
) => FlowDocument | undefined
export declare const applyEdgeRemoveChange: (
  document: FlowDocument,
  change: EdgeRemoveChange
) => FlowDocument | undefined
export declare const SetNodePositionCommandSchema: S.Struct<{
  readonly kind: S.Literal<'set-node-position'>
  readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
  readonly position: S.Struct<{
    readonly x: S.Number
    readonly y: S.Number
  }>
}>
export type SetNodePositionCommand = typeof SetNodePositionCommandSchema.Type
export declare const SetViewportCommandSchema: S.Struct<{
  readonly kind: S.Literal<'set-viewport'>
  readonly viewport: S.Struct<{
    readonly x: S.Number
    readonly y: S.Number
    readonly zoom: S.Finite
  }>
}>
export type SetViewportCommand = typeof SetViewportCommandSchema.Type
export declare const EditTransactionCommandSchema: S.Struct<{
  readonly kind: S.Literal<'edit-transaction'>
  readonly transaction: S.Struct<{
    readonly operations: S.$Array<
      S.Union<
        readonly [
          S.Struct<{
            readonly kind: S.Literal<'set-nodes'>
            readonly nodes: S.$Array<
              S.Struct<{
                readonly id: S.brand<S.NonEmptyString, 'NodeId'>
                readonly label: S.String
                readonly position: S.Struct<{
                  readonly x: S.Number
                  readonly y: S.Number
                }>
                readonly parentId: S.optional<
                  S.brand<S.NonEmptyString, 'NodeId'>
                >
                readonly type: S.optional<S.NonEmptyString>
                readonly data: S.optional<
                  S.$Record<S.String, S.Codec<S.Json, S.Json, never, never>>
                >
                readonly zIndex: S.optional<S.Finite>
                readonly size: S.optional<
                  S.Struct<{
                    readonly width: S.Finite
                    readonly height: S.Finite
                  }>
                >
                readonly extent: S.optional<S.Literals<readonly ['parent']>>
                readonly handles: S.optional<
                  S.$Array<
                    S.Struct<{
                      readonly id: S.brand<S.NonEmptyString, 'HandleId'>
                      readonly kind: S.Literals<readonly ['source', 'target']>
                      readonly side: S.Literals<
                        readonly ['top', 'right', 'bottom', 'left']
                      >
                    }>
                  >
                >
                readonly selected: S.optional<S.Boolean>
                readonly selectable: S.optional<S.Boolean>
                readonly focusable: S.optional<S.Boolean>
                readonly draggable: S.optional<S.Boolean>
                readonly deletable: S.optional<S.Boolean>
                readonly ariaLabel: S.optional<S.NonEmptyString>
                readonly ariaDescription: S.optional<S.NonEmptyString>
                readonly hidden: S.optional<S.Boolean>
              }>
            >
          }>,
          S.Struct<{
            readonly kind: S.Literal<'add-nodes'>
            readonly nodes: S.$Array<
              S.Struct<{
                readonly id: S.brand<S.NonEmptyString, 'NodeId'>
                readonly label: S.String
                readonly position: S.Struct<{
                  readonly x: S.Number
                  readonly y: S.Number
                }>
                readonly parentId: S.optional<
                  S.brand<S.NonEmptyString, 'NodeId'>
                >
                readonly type: S.optional<S.NonEmptyString>
                readonly data: S.optional<
                  S.$Record<S.String, S.Codec<S.Json, S.Json, never, never>>
                >
                readonly zIndex: S.optional<S.Finite>
                readonly size: S.optional<
                  S.Struct<{
                    readonly width: S.Finite
                    readonly height: S.Finite
                  }>
                >
                readonly extent: S.optional<S.Literals<readonly ['parent']>>
                readonly handles: S.optional<
                  S.$Array<
                    S.Struct<{
                      readonly id: S.brand<S.NonEmptyString, 'HandleId'>
                      readonly kind: S.Literals<readonly ['source', 'target']>
                      readonly side: S.Literals<
                        readonly ['top', 'right', 'bottom', 'left']
                      >
                    }>
                  >
                >
                readonly selected: S.optional<S.Boolean>
                readonly selectable: S.optional<S.Boolean>
                readonly focusable: S.optional<S.Boolean>
                readonly draggable: S.optional<S.Boolean>
                readonly deletable: S.optional<S.Boolean>
                readonly ariaLabel: S.optional<S.NonEmptyString>
                readonly ariaDescription: S.optional<S.NonEmptyString>
                readonly hidden: S.optional<S.Boolean>
              }>
            >
          }>,
          S.Struct<{
            readonly kind: S.Literal<'set-edges'>
            readonly edges: S.$Array<
              S.Struct<{
                readonly id: S.brand<S.NonEmptyString, 'EdgeId'>
                readonly source: S.brand<S.NonEmptyString, 'NodeId'>
                readonly target: S.brand<S.NonEmptyString, 'NodeId'>
                readonly type: S.optional<S.NonEmptyString>
                readonly sourceHandle: S.optional<
                  S.brand<S.NonEmptyString, 'HandleId'>
                >
                readonly targetHandle: S.optional<
                  S.brand<S.NonEmptyString, 'HandleId'>
                >
                readonly path: S.optional<
                  S.Literals<
                    readonly [
                      'straight',
                      'bezier',
                      'step',
                      'smoothstep',
                      'simplebezier',
                    ]
                  >
                >
                readonly label: S.optional<S.String>
                readonly data: S.optional<
                  S.$Record<S.String, S.Codec<S.Json, S.Json, never, never>>
                >
                readonly markerStart: S.optional<
                  S.Literals<readonly ['arrow', 'arrowclosed']>
                >
                readonly markerEnd: S.optional<
                  S.Literals<readonly ['arrow', 'arrowclosed']>
                >
                readonly stroke: S.optional<S.String>
                readonly strokeWidth: S.optional<S.Finite>
                readonly selected: S.optional<S.Boolean>
                readonly deletable: S.optional<S.Boolean>
                readonly selectable: S.optional<S.Boolean>
                readonly focusable: S.optional<S.Boolean>
                readonly reconnectable: S.optional<
                  S.Union<
                    readonly [
                      S.Boolean,
                      S.Literals<readonly ['source', 'target']>,
                    ]
                  >
                >
                readonly interactionWidth: S.optional<S.Finite>
                readonly ariaLabel: S.optional<S.NonEmptyString>
                readonly hidden: S.optional<S.Boolean>
                readonly zIndex: S.optional<S.Finite>
              }>
            >
          }>,
          S.Struct<{
            readonly kind: S.Literal<'add-edges'>
            readonly edges: S.$Array<
              S.Struct<{
                readonly id: S.brand<S.NonEmptyString, 'EdgeId'>
                readonly source: S.brand<S.NonEmptyString, 'NodeId'>
                readonly target: S.brand<S.NonEmptyString, 'NodeId'>
                readonly type: S.optional<S.NonEmptyString>
                readonly sourceHandle: S.optional<
                  S.brand<S.NonEmptyString, 'HandleId'>
                >
                readonly targetHandle: S.optional<
                  S.brand<S.NonEmptyString, 'HandleId'>
                >
                readonly path: S.optional<
                  S.Literals<
                    readonly [
                      'straight',
                      'bezier',
                      'step',
                      'smoothstep',
                      'simplebezier',
                    ]
                  >
                >
                readonly label: S.optional<S.String>
                readonly data: S.optional<
                  S.$Record<S.String, S.Codec<S.Json, S.Json, never, never>>
                >
                readonly markerStart: S.optional<
                  S.Literals<readonly ['arrow', 'arrowclosed']>
                >
                readonly markerEnd: S.optional<
                  S.Literals<readonly ['arrow', 'arrowclosed']>
                >
                readonly stroke: S.optional<S.String>
                readonly strokeWidth: S.optional<S.Finite>
                readonly selected: S.optional<S.Boolean>
                readonly deletable: S.optional<S.Boolean>
                readonly selectable: S.optional<S.Boolean>
                readonly focusable: S.optional<S.Boolean>
                readonly reconnectable: S.optional<
                  S.Union<
                    readonly [
                      S.Boolean,
                      S.Literals<readonly ['source', 'target']>,
                    ]
                  >
                >
                readonly interactionWidth: S.optional<S.Finite>
                readonly ariaLabel: S.optional<S.NonEmptyString>
                readonly hidden: S.optional<S.Boolean>
                readonly zIndex: S.optional<S.Finite>
              }>
            >
          }>,
          S.Struct<{
            readonly kind: S.Literal<'update-node'>
            readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
            readonly patch: S.$Record<
              S.String,
              S.Codec<S.Json, S.Json, never, never>
            >
            readonly replace: S.optional<S.Boolean>
          }>,
          S.Struct<{
            readonly kind: S.Literal<'update-edge'>
            readonly edgeId: S.brand<S.NonEmptyString, 'EdgeId'>
            readonly patch: S.$Record<
              S.String,
              S.Codec<S.Json, S.Json, never, never>
            >
            readonly replace: S.optional<S.Boolean>
          }>,
          S.Struct<{
            readonly kind: S.Literal<'update-node-data'>
            readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
            readonly data: S.$Record<
              S.String,
              S.Codec<S.Json, S.Json, never, never>
            >
            readonly replace: S.optional<S.Boolean>
          }>,
          S.Struct<{
            readonly kind: S.Literal<'update-edge-data'>
            readonly edgeId: S.brand<S.NonEmptyString, 'EdgeId'>
            readonly data: S.$Record<
              S.String,
              S.Codec<S.Json, S.Json, never, never>
            >
            readonly replace: S.optional<S.Boolean>
          }>,
          S.Struct<{
            readonly kind: S.Literal<'delete-elements'>
            readonly nodeIds: S.optional<
              S.$Array<S.brand<S.NonEmptyString, 'NodeId'>>
            >
            readonly edgeIds: S.optional<
              S.$Array<S.brand<S.NonEmptyString, 'EdgeId'>>
            >
          }>,
        ]
      >
    >
  }>
}>
export type EditTransactionCommand = typeof EditTransactionCommandSchema.Type
export declare const FlowCommandSchema: S.Union<
  readonly [
    S.Struct<{
      readonly kind: S.Literal<'set-node-position'>
      readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
      readonly position: S.Struct<{
        readonly x: S.Number
        readonly y: S.Number
      }>
    }>,
    S.Struct<{
      readonly kind: S.Literal<'set-viewport'>
      readonly viewport: S.Struct<{
        readonly x: S.Number
        readonly y: S.Number
        readonly zoom: S.Finite
      }>
    }>,
    S.Struct<{
      readonly kind: S.Literal<'edit-transaction'>
      readonly transaction: S.Struct<{
        readonly operations: S.$Array<
          S.Union<
            readonly [
              S.Struct<{
                readonly kind: S.Literal<'set-nodes'>
                readonly nodes: S.$Array<
                  S.Struct<{
                    readonly id: S.brand<S.NonEmptyString, 'NodeId'>
                    readonly label: S.String
                    readonly position: S.Struct<{
                      readonly x: S.Number
                      readonly y: S.Number
                    }>
                    readonly parentId: S.optional<
                      S.brand<S.NonEmptyString, 'NodeId'>
                    >
                    readonly type: S.optional<S.NonEmptyString>
                    readonly data: S.optional<
                      S.$Record<S.String, S.Codec<S.Json, S.Json, never, never>>
                    >
                    readonly zIndex: S.optional<S.Finite>
                    readonly size: S.optional<
                      S.Struct<{
                        readonly width: S.Finite
                        readonly height: S.Finite
                      }>
                    >
                    readonly extent: S.optional<S.Literals<readonly ['parent']>>
                    readonly handles: S.optional<
                      S.$Array<
                        S.Struct<{
                          readonly id: S.brand<S.NonEmptyString, 'HandleId'>
                          readonly kind: S.Literals<
                            readonly ['source', 'target']
                          >
                          readonly side: S.Literals<
                            readonly ['top', 'right', 'bottom', 'left']
                          >
                        }>
                      >
                    >
                    readonly selected: S.optional<S.Boolean>
                    readonly selectable: S.optional<S.Boolean>
                    readonly focusable: S.optional<S.Boolean>
                    readonly draggable: S.optional<S.Boolean>
                    readonly deletable: S.optional<S.Boolean>
                    readonly ariaLabel: S.optional<S.NonEmptyString>
                    readonly ariaDescription: S.optional<S.NonEmptyString>
                    readonly hidden: S.optional<S.Boolean>
                  }>
                >
              }>,
              S.Struct<{
                readonly kind: S.Literal<'add-nodes'>
                readonly nodes: S.$Array<
                  S.Struct<{
                    readonly id: S.brand<S.NonEmptyString, 'NodeId'>
                    readonly label: S.String
                    readonly position: S.Struct<{
                      readonly x: S.Number
                      readonly y: S.Number
                    }>
                    readonly parentId: S.optional<
                      S.brand<S.NonEmptyString, 'NodeId'>
                    >
                    readonly type: S.optional<S.NonEmptyString>
                    readonly data: S.optional<
                      S.$Record<S.String, S.Codec<S.Json, S.Json, never, never>>
                    >
                    readonly zIndex: S.optional<S.Finite>
                    readonly size: S.optional<
                      S.Struct<{
                        readonly width: S.Finite
                        readonly height: S.Finite
                      }>
                    >
                    readonly extent: S.optional<S.Literals<readonly ['parent']>>
                    readonly handles: S.optional<
                      S.$Array<
                        S.Struct<{
                          readonly id: S.brand<S.NonEmptyString, 'HandleId'>
                          readonly kind: S.Literals<
                            readonly ['source', 'target']
                          >
                          readonly side: S.Literals<
                            readonly ['top', 'right', 'bottom', 'left']
                          >
                        }>
                      >
                    >
                    readonly selected: S.optional<S.Boolean>
                    readonly selectable: S.optional<S.Boolean>
                    readonly focusable: S.optional<S.Boolean>
                    readonly draggable: S.optional<S.Boolean>
                    readonly deletable: S.optional<S.Boolean>
                    readonly ariaLabel: S.optional<S.NonEmptyString>
                    readonly ariaDescription: S.optional<S.NonEmptyString>
                    readonly hidden: S.optional<S.Boolean>
                  }>
                >
              }>,
              S.Struct<{
                readonly kind: S.Literal<'set-edges'>
                readonly edges: S.$Array<
                  S.Struct<{
                    readonly id: S.brand<S.NonEmptyString, 'EdgeId'>
                    readonly source: S.brand<S.NonEmptyString, 'NodeId'>
                    readonly target: S.brand<S.NonEmptyString, 'NodeId'>
                    readonly type: S.optional<S.NonEmptyString>
                    readonly sourceHandle: S.optional<
                      S.brand<S.NonEmptyString, 'HandleId'>
                    >
                    readonly targetHandle: S.optional<
                      S.brand<S.NonEmptyString, 'HandleId'>
                    >
                    readonly path: S.optional<
                      S.Literals<
                        readonly [
                          'straight',
                          'bezier',
                          'step',
                          'smoothstep',
                          'simplebezier',
                        ]
                      >
                    >
                    readonly label: S.optional<S.String>
                    readonly data: S.optional<
                      S.$Record<S.String, S.Codec<S.Json, S.Json, never, never>>
                    >
                    readonly markerStart: S.optional<
                      S.Literals<readonly ['arrow', 'arrowclosed']>
                    >
                    readonly markerEnd: S.optional<
                      S.Literals<readonly ['arrow', 'arrowclosed']>
                    >
                    readonly stroke: S.optional<S.String>
                    readonly strokeWidth: S.optional<S.Finite>
                    readonly selected: S.optional<S.Boolean>
                    readonly deletable: S.optional<S.Boolean>
                    readonly selectable: S.optional<S.Boolean>
                    readonly focusable: S.optional<S.Boolean>
                    readonly reconnectable: S.optional<
                      S.Union<
                        readonly [
                          S.Boolean,
                          S.Literals<readonly ['source', 'target']>,
                        ]
                      >
                    >
                    readonly interactionWidth: S.optional<S.Finite>
                    readonly ariaLabel: S.optional<S.NonEmptyString>
                    readonly hidden: S.optional<S.Boolean>
                    readonly zIndex: S.optional<S.Finite>
                  }>
                >
              }>,
              S.Struct<{
                readonly kind: S.Literal<'add-edges'>
                readonly edges: S.$Array<
                  S.Struct<{
                    readonly id: S.brand<S.NonEmptyString, 'EdgeId'>
                    readonly source: S.brand<S.NonEmptyString, 'NodeId'>
                    readonly target: S.brand<S.NonEmptyString, 'NodeId'>
                    readonly type: S.optional<S.NonEmptyString>
                    readonly sourceHandle: S.optional<
                      S.brand<S.NonEmptyString, 'HandleId'>
                    >
                    readonly targetHandle: S.optional<
                      S.brand<S.NonEmptyString, 'HandleId'>
                    >
                    readonly path: S.optional<
                      S.Literals<
                        readonly [
                          'straight',
                          'bezier',
                          'step',
                          'smoothstep',
                          'simplebezier',
                        ]
                      >
                    >
                    readonly label: S.optional<S.String>
                    readonly data: S.optional<
                      S.$Record<S.String, S.Codec<S.Json, S.Json, never, never>>
                    >
                    readonly markerStart: S.optional<
                      S.Literals<readonly ['arrow', 'arrowclosed']>
                    >
                    readonly markerEnd: S.optional<
                      S.Literals<readonly ['arrow', 'arrowclosed']>
                    >
                    readonly stroke: S.optional<S.String>
                    readonly strokeWidth: S.optional<S.Finite>
                    readonly selected: S.optional<S.Boolean>
                    readonly deletable: S.optional<S.Boolean>
                    readonly selectable: S.optional<S.Boolean>
                    readonly focusable: S.optional<S.Boolean>
                    readonly reconnectable: S.optional<
                      S.Union<
                        readonly [
                          S.Boolean,
                          S.Literals<readonly ['source', 'target']>,
                        ]
                      >
                    >
                    readonly interactionWidth: S.optional<S.Finite>
                    readonly ariaLabel: S.optional<S.NonEmptyString>
                    readonly hidden: S.optional<S.Boolean>
                    readonly zIndex: S.optional<S.Finite>
                  }>
                >
              }>,
              S.Struct<{
                readonly kind: S.Literal<'update-node'>
                readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
                readonly patch: S.$Record<
                  S.String,
                  S.Codec<S.Json, S.Json, never, never>
                >
                readonly replace: S.optional<S.Boolean>
              }>,
              S.Struct<{
                readonly kind: S.Literal<'update-edge'>
                readonly edgeId: S.brand<S.NonEmptyString, 'EdgeId'>
                readonly patch: S.$Record<
                  S.String,
                  S.Codec<S.Json, S.Json, never, never>
                >
                readonly replace: S.optional<S.Boolean>
              }>,
              S.Struct<{
                readonly kind: S.Literal<'update-node-data'>
                readonly nodeId: S.brand<S.NonEmptyString, 'NodeId'>
                readonly data: S.$Record<
                  S.String,
                  S.Codec<S.Json, S.Json, never, never>
                >
                readonly replace: S.optional<S.Boolean>
              }>,
              S.Struct<{
                readonly kind: S.Literal<'update-edge-data'>
                readonly edgeId: S.brand<S.NonEmptyString, 'EdgeId'>
                readonly data: S.$Record<
                  S.String,
                  S.Codec<S.Json, S.Json, never, never>
                >
                readonly replace: S.optional<S.Boolean>
              }>,
              S.Struct<{
                readonly kind: S.Literal<'delete-elements'>
                readonly nodeIds: S.optional<
                  S.$Array<S.brand<S.NonEmptyString, 'NodeId'>>
                >
                readonly edgeIds: S.optional<
                  S.$Array<S.brand<S.NonEmptyString, 'EdgeId'>>
                >
              }>,
            ]
          >
        >
      }>
    }>,
  ]
>
export type FlowCommand = typeof FlowCommandSchema.Type
export declare const screenToFlowPosition: (
  position: XYPosition,
  viewport: Viewport
) => XYPosition
export declare const flowToScreenPosition: (
  position: XYPosition,
  viewport: Viewport
) => XYPosition
export declare const clampViewport: (
  viewport: Viewport,
  limits: ViewportLimits
) => Viewport
export declare const panViewport: (
  viewport: Viewport,
  delta: XYPosition
) => Viewport
export declare const selectionAutoPanDelta: (
  pointer: XYPosition,
  width: number,
  height: number,
  band?: number,
  speed?: number
) => XYPosition
export declare const zoomViewportAt: (
  viewport: Viewport,
  requestedZoom: number,
  anchor: XYPosition,
  limits: ViewportLimits
) => Viewport
export declare const beginViewportPan: (
  viewport: Viewport,
  pointerPosition: XYPosition,
  pointerId: number
) => ActiveViewportPan
export declare const moveViewportPan: (
  pan: ActiveViewportPan,
  pointerPosition: XYPosition
) => Viewport
export declare const movePinch: (
  pinch: ActivePinch,
  first: XYPosition,
  second: XYPosition,
  limits: ViewportLimits
) => Viewport
export declare const beginNodeDrag: (
  nodeId: NodeId,
  nodePosition: XYPosition,
  pointerPosition: XYPosition,
  pointerId: number
) => ActiveNodeDrag
export declare const moveNodeDrag: (
  drag: ActiveNodeDrag,
  pointerPosition: XYPosition,
  grid?: SnapGrid
) => XYPosition
export declare const completeNodeDrag: (
  drag: ActiveNodeDrag,
  pointerPosition: XYPosition,
  grid?: SnapGrid
) => NodePositionChange
export declare const moveNodeGroupDrag: (
  drag: ActiveNodeGroupDrag,
  pointerPosition: XYPosition,
  grid?: SnapGrid
) => NodePositionsChange
export declare const moveSelectedNodes: (
  document: FlowDocument,
  delta: XYPosition,
  grid?: SnapGrid
) => NodePositionsChange
export declare const commandToChange: (
  command: Exclude<FlowCommand, EditTransactionCommand>
) => FlowChange
/** Resolve a command that needs the accepted document before it can become a semantic change. */
export declare const prepareFlowCommand: (
  document: FlowDocument,
  command: FlowCommand
) =>
  | Effect.Effect<
      {
        kind: 'edit-proposal'
        document: {
          readonly nodes: readonly {
            readonly id: string & import('effect/Brand').Brand<'NodeId'>
            readonly label: string
            readonly position: {
              readonly x: number
              readonly y: number
            }
            readonly parentId?:
              | (string & import('effect/Brand').Brand<'NodeId'>)
              | undefined
            readonly type?: string | undefined
            readonly data?:
              | {
                  readonly [x: string]: S.Json
                }
              | undefined
            readonly zIndex?: number | undefined
            readonly size?:
              | {
                  readonly width: number
                  readonly height: number
                }
              | undefined
            readonly extent?: 'parent' | undefined
            readonly handles?:
              | readonly {
                  readonly id: string & import('effect/Brand').Brand<'HandleId'>
                  readonly kind: 'source' | 'target'
                  readonly side: 'top' | 'right' | 'bottom' | 'left'
                }[]
              | undefined
            readonly selected?: boolean | undefined
            readonly selectable?: boolean | undefined
            readonly focusable?: boolean | undefined
            readonly draggable?: boolean | undefined
            readonly deletable?: boolean | undefined
            readonly ariaLabel?: string | undefined
            readonly ariaDescription?: string | undefined
            readonly hidden?: boolean | undefined
          }[]
          readonly edges: readonly {
            readonly source: string & import('effect/Brand').Brand<'NodeId'>
            readonly target: string & import('effect/Brand').Brand<'NodeId'>
            readonly id: string & import('effect/Brand').Brand<'EdgeId'>
            readonly type?: string | undefined
            readonly data?:
              | {
                  readonly [x: string]: S.Json
                }
              | undefined
            readonly zIndex?: number | undefined
            readonly selected?: boolean | undefined
            readonly selectable?: boolean | undefined
            readonly focusable?: boolean | undefined
            readonly deletable?: boolean | undefined
            readonly ariaLabel?: string | undefined
            readonly hidden?: boolean | undefined
            readonly label?: string | undefined
            readonly sourceHandle?:
              | (string & import('effect/Brand').Brand<'HandleId'>)
              | undefined
            readonly targetHandle?:
              | (string & import('effect/Brand').Brand<'HandleId'>)
              | undefined
            readonly path?:
              | 'straight'
              | 'bezier'
              | 'step'
              | 'smoothstep'
              | 'simplebezier'
              | undefined
            readonly markerStart?: 'arrow' | 'arrowclosed' | undefined
            readonly markerEnd?: 'arrow' | 'arrowclosed' | undefined
            readonly stroke?: string | undefined
            readonly strokeWidth?: number | undefined
            readonly reconnectable?: boolean | 'source' | 'target' | undefined
            readonly interactionWidth?: number | undefined
          }[]
        }
        deletion: {
          readonly deletedNodeIds: readonly (string &
            import('effect/Brand').Brand<'NodeId'>)[]
          readonly deletedEdgeIds: readonly (string &
            import('effect/Brand').Brand<'EdgeId'>)[]
        }
      },
      | import('./duplicate-edge-id.ts').DuplicateEdgeId
      | import('./duplicate-handle-id.ts').DuplicateHandleId
      | import('./duplicate-node-id.ts').DuplicateNodeId
      | import('./missing-edge-endpoint.ts').MissingEdgeEndpoint
      | import('./missing-edge-handle.ts').MissingEdgeHandle
      | import('./missing-parent-node.ts').MissingParentNode
      | import('./parent-cycle.ts').ParentCycle
      | import('./parent-extent-without-parent.ts').ParentExtentWithoutParent
      | import('./self-parent-node.ts').SelfParentNode
      | S.SchemaError
      | import('./flow-edit-error.ts').ProtectedDeletionConflict,
      never
    >
  | Effect.Effect<
      | {
          readonly kind: 'node-position'
          readonly nodeId: string & import('effect/Brand').Brand<'NodeId'>
          readonly position: {
            readonly x: number
            readonly y: number
          }
        }
      | {
          readonly kind: 'node-positions'
          readonly positions: readonly {
            readonly nodeId: string & import('effect/Brand').Brand<'NodeId'>
            readonly position: {
              readonly x: number
              readonly y: number
            }
          }[]
        }
      | {
          readonly kind: 'node-size'
          readonly nodeId: string & import('effect/Brand').Brand<'NodeId'>
          readonly size: {
            readonly width: number
            readonly height: number
          }
        }
      | {
          readonly kind: 'node-bounds'
          readonly nodeId: string & import('effect/Brand').Brand<'NodeId'>
          readonly position: {
            readonly x: number
            readonly y: number
          }
          readonly size: {
            readonly width: number
            readonly height: number
          }
          readonly childPositions: readonly {
            readonly nodeId: string & import('effect/Brand').Brand<'NodeId'>
            readonly position: {
              readonly x: number
              readonly y: number
            }
          }[]
        }
      | {
          readonly kind: 'viewport'
          readonly viewport: {
            readonly x: number
            readonly y: number
            readonly zoom: number
          }
        }
      | {
          readonly kind: 'edge-add'
          readonly edge: {
            readonly source: string & import('effect/Brand').Brand<'NodeId'>
            readonly target: string & import('effect/Brand').Brand<'NodeId'>
            readonly id: string & import('effect/Brand').Brand<'EdgeId'>
            readonly type?: string | undefined
            readonly data?:
              | {
                  readonly [x: string]: S.Json
                }
              | undefined
            readonly zIndex?: number | undefined
            readonly selected?: boolean | undefined
            readonly selectable?: boolean | undefined
            readonly focusable?: boolean | undefined
            readonly deletable?: boolean | undefined
            readonly ariaLabel?: string | undefined
            readonly hidden?: boolean | undefined
            readonly label?: string | undefined
            readonly sourceHandle?:
              | (string & import('effect/Brand').Brand<'HandleId'>)
              | undefined
            readonly targetHandle?:
              | (string & import('effect/Brand').Brand<'HandleId'>)
              | undefined
            readonly path?:
              | 'straight'
              | 'bezier'
              | 'step'
              | 'smoothstep'
              | 'simplebezier'
              | undefined
            readonly markerStart?: 'arrow' | 'arrowclosed' | undefined
            readonly markerEnd?: 'arrow' | 'arrowclosed' | undefined
            readonly stroke?: string | undefined
            readonly strokeWidth?: number | undefined
            readonly reconnectable?: boolean | 'source' | 'target' | undefined
            readonly interactionWidth?: number | undefined
          }
        }
      | {
          readonly kind: 'edge-selection'
          readonly edgeId: string & import('effect/Brand').Brand<'EdgeId'>
          readonly selected: boolean
        }
      | {
          readonly kind: 'node-selection'
          readonly nodeId: string & import('effect/Brand').Brand<'NodeId'>
          readonly selected: boolean
        }
      | {
          readonly kind: 'selection-set'
          readonly nodeIds: readonly (string &
            import('effect/Brand').Brand<'NodeId'>)[]
          readonly edgeIds: readonly (string &
            import('effect/Brand').Brand<'EdgeId'>)[]
        }
      | {
          readonly kind: 'edge-reconnect'
          readonly edge: {
            readonly source: string & import('effect/Brand').Brand<'NodeId'>
            readonly target: string & import('effect/Brand').Brand<'NodeId'>
            readonly id: string & import('effect/Brand').Brand<'EdgeId'>
            readonly type?: string | undefined
            readonly data?:
              | {
                  readonly [x: string]: S.Json
                }
              | undefined
            readonly zIndex?: number | undefined
            readonly selected?: boolean | undefined
            readonly selectable?: boolean | undefined
            readonly focusable?: boolean | undefined
            readonly deletable?: boolean | undefined
            readonly ariaLabel?: string | undefined
            readonly hidden?: boolean | undefined
            readonly label?: string | undefined
            readonly sourceHandle?:
              | (string & import('effect/Brand').Brand<'HandleId'>)
              | undefined
            readonly targetHandle?:
              | (string & import('effect/Brand').Brand<'HandleId'>)
              | undefined
            readonly path?:
              | 'straight'
              | 'bezier'
              | 'step'
              | 'smoothstep'
              | 'simplebezier'
              | undefined
            readonly markerStart?: 'arrow' | 'arrowclosed' | undefined
            readonly markerEnd?: 'arrow' | 'arrowclosed' | undefined
            readonly stroke?: string | undefined
            readonly strokeWidth?: number | undefined
            readonly reconnectable?: boolean | 'source' | 'target' | undefined
            readonly interactionWidth?: number | undefined
          }
        }
      | {
          readonly kind: 'edge-remove'
          readonly edgeId: string & import('effect/Brand').Brand<'EdgeId'>
        }
      | {
          readonly kind: 'edit-proposal'
          readonly document: {
            readonly edges: readonly {
              readonly source: string & import('effect/Brand').Brand<'NodeId'>
              readonly target: string & import('effect/Brand').Brand<'NodeId'>
              readonly id: string & import('effect/Brand').Brand<'EdgeId'>
              readonly type?: string | undefined
              readonly data?:
                | {
                    readonly [x: string]: S.Json
                  }
                | undefined
              readonly zIndex?: number | undefined
              readonly selected?: boolean | undefined
              readonly selectable?: boolean | undefined
              readonly focusable?: boolean | undefined
              readonly deletable?: boolean | undefined
              readonly ariaLabel?: string | undefined
              readonly hidden?: boolean | undefined
              readonly label?: string | undefined
              readonly sourceHandle?:
                | (string & import('effect/Brand').Brand<'HandleId'>)
                | undefined
              readonly targetHandle?:
                | (string & import('effect/Brand').Brand<'HandleId'>)
                | undefined
              readonly path?:
                | 'straight'
                | 'bezier'
                | 'step'
                | 'smoothstep'
                | 'simplebezier'
                | undefined
              readonly markerStart?: 'arrow' | 'arrowclosed' | undefined
              readonly markerEnd?: 'arrow' | 'arrowclosed' | undefined
              readonly stroke?: string | undefined
              readonly strokeWidth?: number | undefined
              readonly reconnectable?: boolean | 'source' | 'target' | undefined
              readonly interactionWidth?: number | undefined
            }[]
            readonly nodes: readonly {
              readonly id: string & import('effect/Brand').Brand<'NodeId'>
              readonly label: string
              readonly position: {
                readonly x: number
                readonly y: number
              }
              readonly parentId?:
                | (string & import('effect/Brand').Brand<'NodeId'>)
                | undefined
              readonly type?: string | undefined
              readonly data?:
                | {
                    readonly [x: string]: S.Json
                  }
                | undefined
              readonly zIndex?: number | undefined
              readonly size?:
                | {
                    readonly width: number
                    readonly height: number
                  }
                | undefined
              readonly extent?: 'parent' | undefined
              readonly handles?:
                | readonly {
                    readonly id: string &
                      import('effect/Brand').Brand<'HandleId'>
                    readonly kind: 'source' | 'target'
                    readonly side: 'top' | 'right' | 'bottom' | 'left'
                  }[]
                | undefined
              readonly selected?: boolean | undefined
              readonly selectable?: boolean | undefined
              readonly focusable?: boolean | undefined
              readonly draggable?: boolean | undefined
              readonly deletable?: boolean | undefined
              readonly ariaLabel?: string | undefined
              readonly ariaDescription?: string | undefined
              readonly hidden?: boolean | undefined
            }[]
          }
          readonly deletion: {
            readonly deletedNodeIds: readonly (string &
              import('effect/Brand').Brand<'NodeId'>)[]
            readonly deletedEdgeIds: readonly (string &
              import('effect/Brand').Brand<'EdgeId'>)[]
          }
        },
      never,
      never
    >
export declare const applyNodePositionChange: (
  document: FlowDocument,
  change: NodePositionChange
) => FlowDocument | undefined
export declare const applyNodePositionsChange: (
  document: FlowDocument,
  change: NodePositionsChange
) => FlowDocument | undefined
