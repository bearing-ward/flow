import type { FlowDocumentSchema } from '../../packages/core/src/public.ts'

export const edgeStackingInput = {
  nodes: [
    {
      id: 'a',
      label: 'Source',
      position: { x: 40, y: 160 },
      size: { width: 100, height: 50 },
      handles: [{ id: 'out', kind: 'source', side: 'right' }],
    },
    {
      id: 'b',
      label: 'Target',
      position: { x: 560, y: 160 },
      size: { width: 100, height: 50 },
      handles: [{ id: 'in', kind: 'target', side: 'left' }],
    },
    {
      id: 'cover',
      label: 'Cover',
      position: { x: 280, y: 160 },
      size: { width: 140, height: 50 },
    },
  ],
  edges: [
    { id: 'edge', source: 'a', target: 'b', label: 'Built-in label' },
    { id: 'other', type: 'portal', source: 'a', target: 'b', zIndex: -1 },
  ],
} satisfies typeof FlowDocumentSchema.Encoded

export const edgeStackingOptions = {
  elevateEdgesOnSelect: true,
  elevateNodesOnSelect: false,
  autoPanOnNodeDrag: false,
}

export interface EdgeStackingFixture {
  readonly coverEdge: (selected: boolean) => void
  readonly edgeClicks: () => readonly string[]
}

declare global {
  interface Window {
    __flowEdgeStacking?: EdgeStackingFixture
  }
}
