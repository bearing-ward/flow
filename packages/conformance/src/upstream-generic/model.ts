import { FlowDocumentSchema } from '@flow/core'
import { Schema as S } from 'effect'

const OptionsSchema = S.Struct({
  fitView: S.optional(S.Boolean),
  minZoom: S.optional(S.Number),
  maxZoom: S.optional(S.Number),
  defaultViewport: S.optional(
    S.Struct({ x: S.Number, y: S.Number, zoom: S.Number })
  ),
  deleteKeyCode: S.optional(S.String),
  multiSelectionKeyCode: S.optional(S.String),
  nodeDragThreshold: S.optional(S.Number),
  panOnScroll: S.optional(S.Boolean),
  panOnDrag: S.optional(S.Array(S.Number)),
  panActivationKeyCode: S.optional(S.Literal('Control')),
  selectionOnDrag: S.optional(S.Boolean),
  zoomOnScroll: S.optional(S.Boolean),
  autoPanOnConnect: S.optional(S.Boolean),
  autoPanOnNodeDrag: S.optional(S.Boolean),
})

const GenericConfigSchema = S.Struct({
  document: FlowDocumentSchema,
  options: OptionsSchema,
})

export const decodeGenericConfig = S.decodeUnknownSync(GenericConfigSchema)

export type GenericConfig = typeof GenericConfigSchema.Type

export const toolbarOptions = (
  node: (typeof FlowDocumentSchema.Type.nodes)[number]
) =>
  S.decodeUnknownSync(
    S.Struct({
      toolbarPosition: S.Literals(['top', 'right', 'bottom', 'left']),
      toolbarAlign: S.optional(S.Literals(['start', 'center', 'end'])),
      toolbarVisible: S.optional(S.Boolean),
    })
  )(node.data)
