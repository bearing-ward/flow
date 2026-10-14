import { FlowFitViewOptionsSchema, FlowStyleSchema } from '@flow/core'
import { Schema } from 'effect'

const KeyCodeSchema = Schema.NullOr(
  Schema.Union([Schema.String, Schema.Array(Schema.String)])
)

const DistanceSchema = Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0))

export const ClosingOptionsSchema = Schema.Struct({
  fitView: Schema.Boolean,
  fitViewOptions: FlowFitViewOptionsSchema,
  onlyRenderVisibleElements: Schema.Boolean,
  disableKeyboardA11y: Schema.Boolean,
  edgesReconnectable: Schema.Boolean,
  reconnectRadius: DistanceSchema,
  paneClickDistance: DistanceSchema,
  nodeClickDistance: DistanceSchema,
  autoPanOnNodeDrag: Schema.Boolean,
  autoPanOnSelection: Schema.Boolean,
  autoPanOnNodeFocus: Schema.Boolean,
  autoPanSpeed: DistanceSchema,
  deleteKeyCode: KeyCodeSchema,
  selectionKeyCode: KeyCodeSchema,
  multiSelectionKeyCode: KeyCodeSchema,
  zoomActivationKeyCode: KeyCodeSchema,
  noDragClassName: Schema.String,
  noWheelClassName: Schema.String,
  noPanClassName: Schema.String,
  connectionLineStyle: FlowStyleSchema,
  connectionLineContainerStyle: FlowStyleSchema,
})

export type ClosingOptions = typeof ClosingOptionsSchema.Encoded

export const defaultClosingOptions: ClosingOptions = {
  fitView: false,
  fitViewOptions: {},
  onlyRenderVisibleElements: false,
  disableKeyboardA11y: false,
  edgesReconnectable: true,
  reconnectRadius: 10,
  paneClickDistance: 1,
  nodeClickDistance: 0,
  autoPanOnNodeDrag: true,
  autoPanOnSelection: true,
  autoPanOnNodeFocus: true,
  autoPanSpeed: 15,
  deleteKeyCode: 'Backspace',
  selectionKeyCode: 'Shift',
  multiSelectionKeyCode: ['Meta', 'Control'],
  zoomActivationKeyCode: ['Meta', 'Control'],
  noDragClassName: 'nodrag',
  noWheelClassName: 'nowheel',
  noPanClassName: 'nopan',
  connectionLineStyle: {},
  connectionLineContainerStyle: {},
}
