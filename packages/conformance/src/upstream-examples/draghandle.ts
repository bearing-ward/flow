// Upstream: examples/react/src/examples/DragHandle/index.tsx:6-37 and DragHandleNode.tsx:24-33.
import { decodeExampleConfig } from './model.ts'

export default decodeExampleConfig({
  document: {
    nodes: [
      {
        id: '2',
        type: 'dragHandleNode',
        dragHandle: '.custom-drag-handle',
        style: {
          width: 'max-content',
          border: '1px solid #ddd',
          padding: '20px 40px',
        },
        position: { x: 200, y: 200 },
        label: '',
        data: {},
        handles: [
          { id: 'in', kind: 'target', side: 'left' },
          { id: 'out', kind: 'source', side: 'right' },
        ],
      },
    ],
    edges: [],
  },
  options: { nodeDragThreshold: 0 },
  controls: false,
  minimap: false,
})
