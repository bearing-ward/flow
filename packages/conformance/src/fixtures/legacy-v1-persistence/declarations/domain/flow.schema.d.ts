import { Effect, Schema as S } from 'effect'

import { DuplicateEdgeId } from './duplicate-edge-id.ts'
import { DuplicateHandleId } from './duplicate-handle-id.ts'
import { DuplicateNodeId } from './duplicate-node-id.ts'
import { MissingEdgeEndpoint } from './missing-edge-endpoint.ts'
import { MissingEdgeHandle } from './missing-edge-handle.ts'
import { MissingParentNode } from './missing-parent-node.ts'
import { ParentCycle } from './parent-cycle.ts'
import { ParentExtentWithoutParent } from './parent-extent-without-parent.ts'
import { SelfParentNode } from './self-parent-node.ts'
export { DuplicateEdgeId } from './duplicate-edge-id.ts'
export { DuplicateHandleId } from './duplicate-handle-id.ts'
export { DuplicateNodeId } from './duplicate-node-id.ts'
export { MissingEdgeEndpoint } from './missing-edge-endpoint.ts'
export { MissingEdgeHandle } from './missing-edge-handle.ts'
export { MissingParentNode } from './missing-parent-node.ts'
export { ParentCycle } from './parent-cycle.ts'
export { ParentExtentWithoutParent } from './parent-extent-without-parent.ts'
export { SelfParentNode } from './self-parent-node.ts'
export {
  EdgeIdSchema,
  HandleIdSchema,
  NodeIdSchema,
  XYPositionSchema,
} from './flow-values.ts'
export type { EdgeId, HandleId, NodeId, XYPosition } from './flow-values.ts'
export declare const FlowHandleSchema: S.Struct<{
  readonly id: S.brand<S.NonEmptyString, 'HandleId'>
  readonly kind: S.Literals<readonly ['source', 'target']>
  readonly side: S.Literals<readonly ['top', 'right', 'bottom', 'left']>
}>
export type FlowHandle = typeof FlowHandleSchema.Type
export declare const NodeSizeSchema: S.Struct<{
  readonly width: S.Finite
  readonly height: S.Finite
}>
export type NodeSize = typeof NodeSizeSchema.Type
export declare const FlowNodeSchema: S.Struct<{
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
        readonly side: S.Literals<readonly ['top', 'right', 'bottom', 'left']>
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
export type FlowNode = typeof FlowNodeSchema.Type
export declare const FlowEdgePathSchema: S.Literals<
  readonly ['straight', 'bezier', 'step', 'smoothstep', 'simplebezier']
>
export type FlowEdgePath = typeof FlowEdgePathSchema.Type
export declare const FlowEdgeMarkerSchema: S.Literals<
  readonly ['arrow', 'arrowclosed']
>
export type FlowEdgeMarker = typeof FlowEdgeMarkerSchema.Type
export declare const FlowEdgeReconnectableSchema: S.Union<
  readonly [S.Boolean, S.Literals<readonly ['source', 'target']>]
>
export type FlowEdgeReconnectable = typeof FlowEdgeReconnectableSchema.Type
export declare const FlowEdgeStrokeSchema: S.String
export declare const FlowEdgeSchema: S.Struct<{
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
  readonly markerEnd: S.optional<S.Literals<readonly ['arrow', 'arrowclosed']>>
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
export type FlowEdge = typeof FlowEdgeSchema.Type
export declare const FlowDocumentSchema: S.Struct<{
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
export type FlowDocument = typeof FlowDocumentSchema.Type
export declare const FlowDocumentIntegrityErrorSchema: S.Union<
  readonly [
    typeof DuplicateNodeId,
    typeof DuplicateEdgeId,
    typeof DuplicateHandleId,
    typeof MissingEdgeEndpoint,
    typeof MissingEdgeHandle,
    typeof MissingParentNode,
    typeof SelfParentNode,
    typeof ParentCycle,
    typeof ParentExtentWithoutParent,
  ]
>
export type FlowDocumentIntegrityError =
  typeof FlowDocumentIntegrityErrorSchema.Type
declare const decodeUnknownFlowDocument: (
  input: unknown,
  options?: import('effect/SchemaAST').ParseOptions
) => Effect.Effect<
  {
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
  },
  S.SchemaError,
  never
>
export declare const validateFlowDocument: (
  document: FlowDocument
) => Effect.Effect<FlowDocument, FlowDocumentIntegrityError>
export type FlowDocumentInput = Parameters<typeof decodeUnknownFlowDocument>[0]
export declare const decodeFlowDocument: (
  input: FlowDocumentInput
) => Effect.Effect<
  {
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
  },
  | DuplicateEdgeId
  | DuplicateHandleId
  | DuplicateNodeId
  | MissingEdgeEndpoint
  | MissingEdgeHandle
  | MissingParentNode
  | ParentCycle
  | ParentExtentWithoutParent
  | SelfParentNode
  | S.SchemaError,
  never
>
