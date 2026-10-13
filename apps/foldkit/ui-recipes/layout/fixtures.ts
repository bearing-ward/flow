import { Schema as S } from 'effect'

export const sceneNames = [
  'dagre-tree',
  'elk-tree',
  'elk-multiple-handles',
  'auto-layout',
  'force-layout',
  'dynamic-layouting',
] as const

export type SceneName = (typeof sceneNames)[number]

export const SceneNameSchema = S.Literals(sceneNames)

export const treeHandles = [
  { id: 'in', kind: 'target', side: 'top' },
  { id: 'out', kind: 'source', side: 'bottom' },
] as const

export const treeNode = (id: string, label: string) => ({
  id,
  label,
  position: { x: 0, y: 0 },
  handles: treeHandles,
})

export const treeEdge = (source: string, target: string) => ({
  id: `e-${source}-${target}`,
  source,
  sourceHandle: 'out',
  target,
  targetHandle: 'in',
})

/** Every node starts at the origin without a size; labels give different measured widths. */
export const treeDocument = {
  nodes: [
    treeNode('1', 'Root'),
    treeNode('2', 'Branch two'),
    treeNode('3', 'A much longer node label that is wider'),
    treeNode('2a', 'Leaf 2a'),
    treeNode('2b', 'Leaf two b'),
    treeNode('2c', 'c'),
    treeNode('2b1', 'Deep leaf'),
    treeNode('3a', 'Leaf 3a with text'),
    treeNode('3b', '3b'),
    treeNode('3c', 'Another leaf'),
  ],
  edges: [
    treeEdge('1', '2'),
    treeEdge('1', '3'),
    treeEdge('2', '2a'),
    treeEdge('2', '2b'),
    treeEdge('2', '2c'),
    treeEdge('2b', '2b1'),
    treeEdge('3', '3a'),
    treeEdge('3', '3b'),
    treeEdge('3', '3c'),
  ],
}

const targetNode = (id: string) => ({
  id,
  label: id,
  position: { x: 0, y: 0 },
  size: { width: 100, height: 40 },
  handles: [{ id: 'in', kind: 'target', side: 'left' }],
})

const portEdge = (handle: string, targetId: string) => ({
  id: `e-${handle}-${targetId}`,
  source: 's',
  sourceHandle: handle,
  target: targetId,
  targetHandle: 'in',
})

/** One source with three right-side handles; naive placement crosses the edges. */
export const multipleHandlesDocument = {
  nodes: [
    {
      id: 's',
      label: 's',
      position: { x: 0, y: 0 },
      size: { width: 120, height: 150 },
      handles: [
        { id: 'out-a', kind: 'source', side: 'right' },
        { id: 'out-b', kind: 'source', side: 'right' },
        { id: 'out-c', kind: 'source', side: 'right' },
      ],
    },
    targetNode('t1'),
    targetNode('t2'),
    targetNode('t3'),
  ],
  edges: [
    portEdge('out-a', 't3'),
    portEdge('out-b', 't1'),
    portEdge('out-c', 't2'),
  ],
}

const forceIds = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8']

/** Overlapping nodes near the origin, for the force simulation to pull apart. */
export const forceDocument = {
  nodes: forceIds.map((id, index) => ({
    id,
    label: id,
    position: { x: index * 6, y: index * 4 },
    size: { width: 80, height: 40 },
    handles: treeHandles,
  })),
  edges: [
    ['n1', 'n2'],
    ['n1', 'n3'],
    ['n2', 'n4'],
    ['n3', 'n5'],
    ['n5', 'n6'],
    ['n6', 'n7'],
    ['n7', 'n8'],
  ].map(([source = '', target = '']) => treeEdge(source, target)),
}

export const dynamicDocument = {
  nodes: [
    treeNode('root', 'Root'),
    { ...treeNode('p-1', '+'), type: 'placeholder' },
  ],
  edges: [{ ...treeEdge('root', 'p-1'), type: 'placeholder' }],
}
