// Upstream: examples/react/src/examples/Figma/index.tsx:3-55.
import basic from './basic.ts'
import { decodeExampleConfig } from './model.ts'

export default decodeExampleConfig({
  document: basic.document,
  options: {
    fitView: true,
    selectionOnDrag: true,
    selectionMode: 'partial',
    panOnDrag: [1, 2],
    panOnScroll: true,
    paneClickDistance: 100,
    zoomActivationKeyCode: 'Meta',
    multiSelectionKeyCode: ['Meta', 'Shift'],
    selectNodesOnDrag: false,
  },
  controls: true,
  minimap: false,
  background: 'cross',
})
