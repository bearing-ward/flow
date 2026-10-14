import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  connectionFromHandleGesture,
  findConnectionIssue,
  nextConnectionEdge,
} from './flow-connection.schema.ts'
import { createFlowGraph } from './flow-graph.ts'
import { orientFlowHandles } from './flow-layout.ts'
import {
  applyNodeMeasurements,
  getFlowMeasuredNodes,
  setNodeMeasurementGenerations,
  emptyFlowMeasurementState,
} from './flow-measurement.schema.ts'
import { flowConnectionLineProps } from './flow-renderer-props.ts'
import { HandleIdSchema, NodeIdSchema } from './flow-values.ts'
import { decodeFlowDocument } from './flow.schema.ts'

const nodeId = (value: string) => NodeIdSchema.make(value)

const handleId = (value: string) => HandleIdSchema.make(value)

// Nodes declare no `handles`; sourcePosition/targetPosition give default ones.
const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'a',
        label: 'A',
        position: { x: 0, y: 0 },
        sourcePosition: 'right',
      },
      {
        id: 'b',
        label: 'B',
        position: { x: 300, y: 0 },
        targetPosition: 'left',
      },
    ],
    edges: [],
  })
)

const gesture = {
  fromNodeId: nodeId('a'),
  fromHandleId: handleId('source'),
  toNodeId: nodeId('b'),
  toHandleId: handleId('target'),
}

describe('default handles from sourcePosition/targetPosition', () => {
  it('connects from and to default handles in both drag directions', () => {
    const forward = Effect.runSync(
      connectionFromHandleGesture({ document, ...gesture })
    )

    const backward = Effect.runSync(
      connectionFromHandleGesture({
        document,
        fromNodeId: nodeId('b'),
        fromHandleId: handleId('target'),
        toNodeId: nodeId('a'),
        toHandleId: handleId('source'),
      })
    )

    const expected = {
      source: 'a',
      sourceHandle: 'source',
      target: 'b',
      targetHandle: 'target',
    }

    expect(forward).toStrictEqual(expected)
    expect(backward).toStrictEqual(expected)
    expect(findConnectionIssue(document, forward)).toBeUndefined()
  })

  it('validates an edge that names default handle ids', () => {
    const edge = nextConnectionEdge(document, {
      source: nodeId('a'),
      sourceHandle: handleId('source'),
      target: nodeId('b'),
      targetHandle: handleId('target'),
    })

    expect(
      Effect.runSync(decodeFlowDocument({ ...document, edges: [edge] })).edges
    ).toHaveLength(1)
  })

  it('keeps measured bounds of default handles', () => {
    const state = applyNodeMeasurements(
      document,
      setNodeMeasurementGenerations(emptyFlowMeasurementState(), [
        { nodeId: nodeId('a'), generation: 0 },
      ]),
      [
        {
          nodeId: nodeId('a'),
          generation: 0,
          width: 100,
          height: 40,
          handles: [
            {
              nodeId: nodeId('a'),
              handleId: handleId('source'),
              offset: { x: 100, y: 20 },
              width: 8,
              height: 8,
            },
          ],
        },
      ]
    )

    expect(
      getFlowMeasuredNodes(document, state)
        .get(nodeId('a'))
        ?.handles?.map(({ handleId: id }) => id)
    ).toStrictEqual(['source'])
  })

  it('gives connection line props for a default origin and target handle', () => {
    expect(
      flowConnectionLineProps({
        graph: createFlowGraph(document),
        connectionLineType: 'bezier',
        origin: { nodeId: 'a', handleId: 'source' },
        preview: {
          kind: 'connect',
          from: { x: 100, y: 20 },
          to: { x: 300, y: 20 },
          candidate: S.decodeUnknownSync(
            S.Struct({
              source: NodeIdSchema,
              sourceHandle: HandleIdSchema,
              target: NodeIdSchema,
              targetHandle: HandleIdSchema,
            })
          )({
            source: 'a',
            sourceHandle: 'source',
            target: 'b',
            targetHandle: 'target',
          }),
          valid: true,
        },
      })
    ).toMatchObject({
      fromHandle: { id: 'source', side: 'right' },
      fromPosition: 'right',
      toPosition: 'left',
    })
  })

  it('orients default handles in layouts through source/target positions', () => {
    expect(
      orientFlowHandles(document.nodes, 'TB').map(
        ({ sourcePosition, targetPosition }) => [sourcePosition, targetPosition]
      )
    ).toStrictEqual([
      ['bottom', 'top'],
      ['bottom', 'top'],
    ])
  })
})
