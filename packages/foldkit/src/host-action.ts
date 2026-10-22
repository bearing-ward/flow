import {
  FlowColorModeSchema,
  FlowCommandSchema,
  FlowDocumentSchema,
  NodeMeasurementInputSchema,
  ViewportSchema,
} from '@flow/core'
import { Schema } from 'effect'
import { Message as FoldMessage } from 'foldkit'

import { CanvasOptionsSchema } from './graph.ts'

export const HostAction = FoldMessage.defineMessageUnion({
  RefreshRenderers: {},
  SetInteractionHandlers: {
    nodePointerHandlers: Schema.Boolean,
    edgeClickHandler: Schema.Boolean,
  },
  RequestKeyboardDelete: {},
  SetCanvasOptions: { options: CanvasOptionsSchema },
  ReplaceDocument: { document: FlowDocumentSchema },
  ReplaceViewport: { viewport: ViewportSchema },
  SetAllowedTargets: { targets: Schema.Array(Schema.String) },
  DispatchCommand: { command: FlowCommandSchema },
  MeasureNode: {
    requestId: Schema.String,
    measurement: NodeMeasurementInputSchema,
  },
  /** React Flow `colorMode` (`light`, `dark` or `system`) at runtime. */
  SetColorMode: { mode: FlowColorModeSchema },
  /** Change `nodesDraggable`, `nodesConnectable` and `elementsSelectable` at runtime. */
  SetInteractivity: {
    nodesDraggable: Schema.optional(Schema.Boolean),
    nodesConnectable: Schema.optional(Schema.Boolean),
    elementsSelectable: Schema.optional(Schema.Boolean),
  },
})

export type HostActionData = typeof HostAction.Type
