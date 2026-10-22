// Upstream: examples/react/src/examples/Hidden/index.tsx:16-74,79-104.
import basic from './basic.ts'
import { decodeExampleConfig } from './model.ts'

export default decodeExampleConfig({
  document: {
    nodes: basic.document.nodes.map(({ className: _className, ...node }) => ({
      ...node,
      hidden: true,
    })),
    edges: [
      { id: 'e1-2', path: 'bezier', source: '1', target: '2', hidden: true },
      { id: 'e1-3', path: 'bezier', source: '1', target: '3', hidden: true },
      { id: 'e3-4', path: 'bezier', source: '3', target: '4', hidden: true },
    ],
  },
  options: {},
  controls: true,
  minimap: true,
})
