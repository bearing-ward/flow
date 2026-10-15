export const liveInternalDocument = {
  nodes: [
    {
      id: 'parent',
      label: 'Parent',
      style: { boxSizing: 'border-box' },
      position: { x: 60, y: 60 },
      size: { width: 300, height: 260 },
    },
    {
      id: 'child',
      label: 'Child',
      style: { boxSizing: 'border-box' },
      parentId: 'parent',
      position: { x: 30, y: 80 },
      size: { width: 120, height: 70 },
    },
    {
      id: 'solo',
      label: 'Solo',
      style: { boxSizing: 'border-box' },
      position: { x: 500, y: 60 },
      size: { width: 140, height: 80 },
    },
  ],
  edges: [],
}
