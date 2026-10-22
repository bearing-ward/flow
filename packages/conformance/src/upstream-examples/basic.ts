// Upstream: examples/react/src/examples/Basic/index.tsx:24-60,144-170.
import { decodeExampleConfig } from './model.ts'

export default decodeExampleConfig({
  document: {
    nodes: [
      {
        id: '1',
        type: 'input',
        label: 'Node 1',
        data: { label: 'Node 1' },
        position: { x: 250, y: 5 },
        className: 'light',
      },
      {
        id: '2',
        label: 'Node 2',
        data: { label: 'Node 2' },
        position: { x: 100, y: 100 },
        className: 'light',
      },
      {
        id: '3',
        label: 'Node 3',
        data: { label: 'Node 3' },
        position: { x: 400, y: 100 },
        className: 'light',
      },
      {
        id: '4',
        label: 'Node 4',
        data: { label: 'Node 4' },
        position: { x: 400, y: 200 },
        className: 'light',
      },
    ].map((node) => ({
      ...node,
      size: { width: 150, height: 38 },
      handles:
        node.type === 'input'
          ? [{ id: 'out', kind: 'source', side: 'bottom' }]
          : [
              { id: 'in', kind: 'target', side: 'top' },
              { id: 'out', kind: 'source', side: 'bottom' },
            ],
    })),
    edges: [
      { id: 'e1-2', path: 'bezier', source: '1', target: '2', animated: true },
      { id: 'e1-3', path: 'bezier', source: '1', target: '3' },
    ],
  },
  options: {
    minZoom: 0.2,
    maxZoom: 4,
    fitView: true,
    selectNodesOnDrag: false,
    elevateEdgesOnSelect: true,
    elevateNodesOnSelect: false,
    autoPanOnSelection: true,
    nodeDragThreshold: 0,
  },
  className: 'react-flow-basic-example',
  controls: true,
  minimap: true,
  background: 'dots',
})
