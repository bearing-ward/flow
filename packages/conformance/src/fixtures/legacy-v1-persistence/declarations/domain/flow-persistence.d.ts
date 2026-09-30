import { Effect, Schema as S } from 'effect'

import type { Viewport } from './flow-runtime.schema.ts'
import type { FlowDocument } from './flow.schema.ts'
/** Session envelope composes the v1 saved document with viewport state. */
export declare const SavedFlowSessionSchema: S.Struct<{
  readonly version: S.Literal<1>
  readonly document: S.Struct<{
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
        readonly selectable: S.optional<S.Boolean>
        readonly focusable: S.optional<S.Boolean>
        readonly draggable: S.optional<S.Boolean>
        readonly deletable: S.optional<S.Boolean>
        readonly ariaLabel: S.optional<S.NonEmptyString>
        readonly ariaDescription: S.optional<S.NonEmptyString>
        readonly hidden: S.optional<S.Boolean>
      }>
    >
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
  }>
  readonly viewport: S.Struct<{
    readonly x: S.Number
    readonly y: S.Number
    readonly zoom: S.Finite
  }>
}>
export type SavedFlowSession = typeof SavedFlowSessionSchema.Encoded
export declare const SavedFlowDocumentSchema: S.Struct<{
  readonly version: S.Literal<1>
  readonly document: S.Struct<{
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
        readonly selectable: S.optional<S.Boolean>
        readonly focusable: S.optional<S.Boolean>
        readonly draggable: S.optional<S.Boolean>
        readonly deletable: S.optional<S.Boolean>
        readonly ariaLabel: S.optional<S.NonEmptyString>
        readonly ariaDescription: S.optional<S.NonEmptyString>
        readonly hidden: S.optional<S.Boolean>
      }>
    >
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
  }>
}>
export type SavedFlowDocument = typeof SavedFlowDocumentSchema.Encoded
/** Encode only declared document fields; transient selection and host state are omitted. */
export declare const encodeSavedFlowDocument: (
  document: FlowDocument
) => SavedFlowDocument
/** Decode the versioned envelope, then apply the normal graph integrity workflow. */
export declare const decodeSavedFlowDocument: <Input>(
  savedFlowDocument: Input
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
  | import('./duplicate-edge-id.ts').DuplicateEdgeId
  | import('./duplicate-handle-id.ts').DuplicateHandleId
  | import('./duplicate-node-id.ts').DuplicateNodeId
  | import('./missing-edge-endpoint.ts').MissingEdgeEndpoint
  | import('./missing-edge-handle.ts').MissingEdgeHandle
  | import('./missing-parent-node.ts').MissingParentNode
  | import('./parent-cycle.ts').ParentCycle
  | import('./parent-extent-without-parent.ts').ParentExtentWithoutParent
  | import('./self-parent-node.ts').SelfParentNode
  | S.SchemaError,
  never
>
/** Encode accepted graph content and viewport; selection remains transient. */
export declare const encodeSavedFlowSession: (
  document: FlowDocument,
  viewport: Viewport
) => SavedFlowSession
/** Decode and validate a saved session through the normal document boundary. */
export declare const decodeSavedFlowSession: <Input>(
  savedFlowSession: Input
) => Effect.Effect<
  {
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
    }
    readonly viewport: {
      readonly x: number
      readonly y: number
      readonly zoom: number
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
  | S.SchemaError,
  never
>
