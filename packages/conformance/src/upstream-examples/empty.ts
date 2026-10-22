// Upstream: examples/react/src/examples/Empty/index.tsx:28-64.
import { decodeExampleConfig } from './model.ts'

export default decodeExampleConfig({
  document: { nodes: [], edges: [] },
  options: { onlyRenderVisibleElements: false },
  controls: true,
  minimap: false,
  background: 'lines',
})
