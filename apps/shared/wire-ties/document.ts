import { decodeFlowDocument } from '@flow/core'
import { Effect } from 'effect'

export const wireTiesDocument = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'a',
          label: 'Material',
          position: { x: 60, y: 90 },
          size: { width: 140, height: 60 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
          selected: true,
        },
        {
          id: 'c',
          label: 'Lighting',
          position: { x: 60, y: 330 },
          size: { width: 140, height: 60 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
          selected: true,
        },
        {
          id: 'b',
          label: 'Surface',
          position: { x: 800, y: 80 },
          size: { width: 140, height: 60 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
          selected: true,
        },
        {
          id: 'd',
          label: 'Volume',
          position: { x: 800, y: 340 },
          size: { width: 140, height: 60 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
          selected: true,
        },
      ],
      edges: [
        {
          id: 'teal',
          source: 'c',
          target: 'd',
          sourceHandle: 'out',
          targetHandle: 'in',
          stroke: '#49d6b1',
          strokeWidth: 1.5,
          path: 'bezier',
          reconnectable: true,
          data: { opaque: ['keep', 163] },
        },
        {
          id: 'purple',
          source: 'a',
          target: 'd',
          sourceHandle: 'out',
          targetHandle: 'in',
          stroke: '#a59bfa',
          strokeWidth: 1.5,
          path: 'bezier',
          reconnectable: true,
        },
        {
          id: 'coral',
          source: 'a',
          target: 'b',
          sourceHandle: 'out',
          targetHandle: 'in',
          stroke: '#fa957e',
          strokeWidth: 1.5,
          path: 'bezier',
          reconnectable: true,
        },
      ],
    })
  )
