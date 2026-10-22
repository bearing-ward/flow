import { FlowDocumentSchema } from '@flow/core'
import type { FlowDocument } from '@flow/core'
import { Schema as S } from 'effect'

const OptionsSchema = S.Struct({
  fitView: S.optionalKey(S.Boolean),
  minZoom: S.optionalKey(S.Number),
  maxZoom: S.optionalKey(S.Number),
  nodeDragThreshold: S.optionalKey(S.Number),
  selectNodesOnDrag: S.optionalKey(S.Boolean),
  elevateNodesOnSelect: S.optionalKey(S.Boolean),
  elevateEdgesOnSelect: S.optionalKey(S.Boolean),
  autoPanOnSelection: S.optionalKey(S.Boolean),
  selectionOnDrag: S.optionalKey(S.Boolean),
  selectionMode: S.optionalKey(S.Literals(['full', 'partial'])),
  panOnDrag: S.optionalKey(S.Array(S.Number)),
  panOnScroll: S.optionalKey(S.Boolean),
  paneClickDistance: S.optionalKey(S.Number),
  zoomActivationKeyCode: S.optionalKey(S.Literal('Meta')),
  multiSelectionKeyCode: S.optionalKey(S.Array(S.Literals(['Meta', 'Shift']))),
  nodesDraggable: S.optionalKey(S.Boolean),
  nodesConnectable: S.optionalKey(S.Boolean),
  elementsSelectable: S.optionalKey(S.Boolean),
  zoomOnScroll: S.optionalKey(S.Boolean),
  zoomOnPinch: S.optionalKey(S.Boolean),
  zoomOnDoubleClick: S.optionalKey(S.Boolean),
  onlyRenderVisibleElements: S.optionalKey(S.Boolean),
})

const ExampleConfigSchema = S.Struct({
  document: FlowDocumentSchema,
  options: OptionsSchema,
  controls: S.Boolean,
  minimap: S.Boolean,
  background: S.optionalKey(S.Literals(['dots', 'lines', 'cross'])),
  className: S.optionalKey(S.String),
})

export const decodeExampleConfig = S.decodeUnknownSync(ExampleConfigSchema)

export type ExampleConfig = typeof ExampleConfigSchema.Type

export type { FlowDocument } from '@flow/core'

export const addEmptyExampleNode = (
  document: FlowDocument,
  position: { x: number; y: number }
) => {
  const id = String(document.nodes.length + 1)

  return S.decodeUnknownSync(FlowDocumentSchema)({
    ...document,
    nodes: [
      ...document.nodes,
      {
        id,
        label: `Node: ${id}`,
        data: { label: `Node: ${id}` },
        position,
        size: { width: 150, height: 38 },
        handles: [
          { id: 'in', kind: 'target', side: 'top' },
          { id: 'out', kind: 'source', side: 'bottom' },
        ],
      },
    ],
  })
}
