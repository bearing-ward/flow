// Upstream: examples/react/src/examples/Interaction/index.tsx:16-31,47-87.
import basic from './basic.ts'
import { decodeExampleConfig } from './model.ts'

export default decodeExampleConfig({
  document: {
    ...basic.document,
    nodes: basic.document.nodes.map(
      ({ className: _className, ...node }) => node
    ),
  },
  options: {
    nodesDraggable: false,
    nodesConnectable: false,
    elementsSelectable: false,
    zoomOnScroll: false,
    zoomOnPinch: false,
    panOnScroll: false,
    zoomOnDoubleClick: false,
    nodeDragThreshold: 0,
  },
  controls: true,
  minimap: true,
})
