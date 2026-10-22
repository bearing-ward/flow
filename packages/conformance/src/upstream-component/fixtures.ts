import {
  FlowNodeSchema,
  FlowEdgeSchema,
  NodeIdSchema,
  EdgeIdSchema,
} from '@flow/core'
import { Schema as S } from 'effect'

export const nodes = S.decodeUnknownSync(S.Array(FlowNodeSchema))([
  {
    id: '1',
    type: 'input',
    label: 'Node 1',
    data: { label: 'Node 1' },
    position: { x: 250, y: 5 },
  },
  {
    id: '2',
    label: 'Node 2',
    data: { label: 'Node 2' },
    position: { x: 100, y: 100 },
  },
  {
    id: '3',
    label: 'Node 3',
    data: { label: 'Node 3' },
    position: { x: 400, y: 100 },
  },
  {
    id: '4',
    label: 'Node 4',
    data: { label: 'Node 4' },
    position: { x: 400, y: 200 },
  },
])

export const edges = S.decodeUnknownSync(S.Array(FlowEdgeSchema))([
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e1-3', source: '1', target: '3' },
  { id: 'e2-3', source: '2', target: '3' },
])

export const node = (index: number) => {
  const value = nodes[index]

  if (!value) {
    throw new Error('Missing fixture node')
  }

  return value
}

export const edge = (index: number) => {
  const value = edges[index]

  if (!value) {
    throw new Error('Missing fixture edge')
  }

  return value
}

export const nodeId = NodeIdSchema.make

export const edgeId = EdgeIdSchema.make
